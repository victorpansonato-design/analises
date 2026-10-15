/**
 * Handlers simulados: painel de indicadores (docs/10 e docs/07 §4).
 *
 * Regras de honestidade (DS §11) que este arquivo garante para o painel não mentir:
 * - O funil vem de `montarFunil` (a MESMA fonte da faixa da tela); com recorte de tipo, curso ou
 *   modalidade é recalculado com a mesma leitura de SLA sobre o subconjunto.
 * - Toda taxa traz numerador e denominador, numerador ≤ denominador e `valor` = numerador ÷ denominador.
 * - O último ponto da série é o `valor`. A composição fecha: as linhas somam ao total.
 * - O que tem fonte nos casos simulados é calculado deles; o resto é gerado POR CASO com PRNG de
 *   semente fixa e depois somado. Assim filtrar é somar um subconjunto (agregado fecha) e a mesma
 *   entidade mostra o mesmo valor em todo render.
 * - Casos de teste (`teste` ou cancelados com motivo TESTE) ficam fora de tudo.
 * - Conversão por pessoa e o grupo da IA só para quem tem `VER_INDICADORES_POR_PESSOA`.
 */
import { http } from "msw";

import { ROTULO_CONFIANCA, ROTULO_MOTIVO_ALTERACAO, type Confianca, type MotivoAlteracao } from "@/features/analise";
import {
   ETAPAS_DO_FUNIL,
   MATRIZ,
   temCapacidade,
   ROTULO_ETAPA,
   ROTULO_MOTIVO_PERDA,
   ROTULO_TIPO,
   SLA_POR_ETAPA,
   TIPOS,
   calcularPrazo,
   lerSla,
   type Etapa,
   type Funil,
   type RegraSla,
} from "@/features/casos";
import { ID_CONVERSAO_POR_RESPONSAVEL, type Indicador, type Indicadores, type Unidade } from "@/features/indicadores";
import { decimal, diaLocal, duration, int, percent, shortDate } from "@/lib/format";

import { calcularResumo, decidido } from "@/mocks/db/analise";
import { montarFunil, montarResumo } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import type { AnaliseRegistro, CasoRegistro } from "@/mocks/db/tipos";
import { API, erro, ok } from "@/mocks/lib/http";
import { criarPrng } from "@/mocks/lib/prng";
import { CALENDARIO_MOCK } from "@/mocks/seed/calendario";
import { cursoPorId, matrizPorId } from "@/mocks/seed/cursos";
import { resumoUsuario } from "@/mocks/seed/usuarios";
import { preparar } from "@/mocks/handlers/comum";

const HORA = 3_600_000;
const DIA = 24 * HORA;
const SEMANA = 7 * DIA;
const PONTOS_SERIE = 8;

type Linha = Indicador["composicao"][number];
type Ponto = Indicador["serie"][number];
type Grupos = Omit<Indicadores, "funil" | "geradoEm">;

// ── Filtro e funil ─────────────────────────────────────────────────────────────────────────────

export interface FiltroIndicadores {
   ciclo: string | null;
   tipo: string | null;
   curso: string | null;
   modalidade: string | null;
}

/** Caso de teste: fora de todos os indicadores (docs/10, introdução). */
export function ehTeste(c: CasoRegistro): boolean {
   return c.teste || (c.etapa === "CANCELADO" && c.motivoEncerramento === "TESTE");
}

export function filtrarCasos(casos: Iterable<CasoRegistro>, f: FiltroIndicadores): CasoRegistro[] {
   return [...casos].filter(
      c =>
         !ehTeste(c) &&
         (!f.ciclo || c.destino.ciclo === f.ciclo) &&
         (!f.tipo || c.tipo === f.tipo) &&
         (!f.curso || c.destino.cursoId === f.curso) &&
         (!f.modalidade || c.destino.modalidade === f.modalidade),
   );
}

/** Mesma conta de `montarFunil`, sobre um subconjunto já filtrado. */
export function funilDe(casos: readonly CasoRegistro[], agora: Date): Funil {
   return {
      etapas: ETAPAS_DO_FUNIL.map(etapa => {
         const daEtapa = casos.filter(c => c.etapa === etapa);
         const leituras = daEtapa.map(c => lerSla(montarResumo(c).sla, agora).estado);
         return {
            etapa,
            total: daEtapa.length,
            atrasados: leituras.filter(e => e === "ESTOURADO").length,
            emAtencao: leituras.filter(e => e === "ATENCAO").length,
         };
      }),
      atualizadoEm: agora.toISOString(),
   };
}

// ── Estatística ────────────────────────────────────────────────────────────────────────────────

function quantil(valores: readonly number[], q: number): number | null {
   if (valores.length === 0) return null;
   const ord = [...valores].sort((a, b) => a - b);
   const pos = (ord.length - 1) * q;
   const base = Math.floor(pos);
   const resto = pos - base;
   return ord[base + 1] !== undefined ? ord[base] + resto * (ord[base + 1] - ord[base]) : ord[base];
}

const arred = (n: number, casas = 1) => Math.round(n * 10 ** casas) / 10 ** casas;
const soma = (xs: readonly number[]) => xs.reduce((s, x) => s + x, 0);
const share = (valor: number, total: number) => (total > 0 ? valor / total : null);

/** Linhas que dividem um total (percentual = participação). */
function partes(itens: readonly (readonly [string, number])[], total: number, manterZeros = false): Linha[] {
   if (total <= 0) return [];
   return itens.filter(([, v]) => manterZeros || v > 0).map(([rotulo, valor]) => ({ rotulo, valor, percentual: share(valor, total) }));
}

/** Linhas com taxa própria (valor ÷ denominador da linha). */
function taxas(itens: readonly { rotulo: string; num: number; den: number }[]): Linha[] {
   return itens.filter(i => i.den > 0).map(i => ({ rotulo: i.rotulo, valor: i.num, denominador: i.den, percentual: i.num / i.den }));
}

function agrupar<T, K extends string>(lista: readonly T[], chave: (x: T) => K): Map<K, T[]> {
   const m = new Map<K, T[]>();
   for (const x of lista) {
      const k = chave(x);
      m.set(k, [...(m.get(k) ?? []), x]);
   }
   return m;
}

// ── Séries ─────────────────────────────────────────────────────────────────────────────────────

/** Fins de semana da série: o último é `agora` (o ponto que tem de ser o número do cartão). */
function instantes(agora: Date): number[] {
   return Array.from({ length: PONTOS_SERIE }, (_, i) => agora.getTime() - (PONTOS_SERIE - 1 - i) * SEMANA);
}

/** Série calculada a partir dos casos (acumulada até cada semana). O último ponto é forçado ao valor. */
function serieCalculada(agora: Date, valor: number | null, ate: (t: number) => number | null): Ponto[] {
   if (valor === null) return [];
   const ts = instantes(agora);
   return ts.flatMap((t, i) => {
      const v = i === ts.length - 1 ? valor : ate(t);
      return v === null ? [] : [{ em: diaLocal(new Date(t)), valor: i === ts.length - 1 ? v : arred(v, 4) }];
   });
}

/**
 * Série de demonstração (sem histórico nos mocks): passeio determinístico que TERMINA no valor.
 * Taxas ficam em [0, 1]; contagens e tempos não ficam negativos.
 */
export function serieSintetica(chave: string, valor: number | null, agora: Date, taxa: boolean): Ponto[] {
   if (valor === null) return [];
   const r = criarPrng(`serie-${chave}`);
   const ts = instantes(agora);
   const valores = [valor];
   let v = valor;
   const amplitude = taxa ? 0.035 : Math.max(Math.abs(valor) * 0.1, 0.2);
   for (let i = 1; i < ts.length; i++) {
      v += (r.next() - 0.42) * 2 * amplitude;
      v = taxa ? Math.min(1, Math.max(0, v)) : Math.max(0, v);
      valores.unshift(arred(v, taxa ? 4 : 2));
   }
   return ts.map((t, i) => ({ em: diaLocal(new Date(t)), valor: valores[i] }));
}

// ── Construtores ───────────────────────────────────────────────────────────────────────────────

interface Comum {
   id: string;
   rotulo: string;
   composicao: Linha[];
   comoLer: string;
   meta?: string | null;
   detalhe?: string | null;
}

/** Taxa: `valor = numerador ÷ denominador`, exatamente. */
function taxa(b: Comum, num: number, numRot: string, den: number, denRot: string, serie: (valor: number | null) => Ponto[]): Indicador {
   const valor = den > 0 ? num / den : null;
   return {
      ...b,
      meta: b.meta ?? null,
      detalhe: b.detalhe ?? null,
      valor,
      unidade: "PERCENTUAL",
      numerador: num,
      numeradorRotulo: numRot,
      denominador: den,
      denominadorRotulo: denRot,
      serie: serie(valor),
   };
}

/** Medida sobre uma base (mediana, média por caso, contagem): sem numerador, com a base explícita. */
function medida(
   b: Comum,
   valor: number | null,
   unidade: Unidade,
   base: number,
   baseRot: string,
   serie: (valor: number | null) => Ponto[],
   num: { n: number; rotulo: string } | null = null,
): Indicador {
   return {
      ...b,
      meta: b.meta ?? null,
      detalhe: b.detalhe ?? null,
      valor: base > 0 ? valor : null,
      unidade,
      numerador: num?.n ?? null,
      numeradorRotulo: num?.rotulo ?? null,
      denominador: base,
      denominadorRotulo: baseRot,
      serie: serie(base > 0 ? valor : null),
   };
}

/** Faixas de duração (em dias) para as distribuições. */
function faixasDias(duracoes: readonly number[], limites: readonly [number, string][], ultimo: string): Linha[] {
   const contagem = new Array(limites.length + 1).fill(0) as number[];
   for (const d of duracoes) {
      const i = limites.findIndex(([lim]) => d <= lim);
      contagem[i === -1 ? limites.length : i] += 1;
   }
   const rotulos = [...limites.map(([, r]) => r), ultimo];
   return partes(
      rotulos.map((r, i) => [r, contagem[i]] as const),
      duracoes.length,
      true,
   );
}

const fmtDias = (d: number) => `${decimal(d, 1)} ${d === 1 ? "dia" : "dias"}`;
const fmtHoras = (h: number) => duration(h * 60);

// ── Leituras de um caso ────────────────────────────────────────────────────────────────────────

const passo = (c: CasoRegistro, e: Etapa) => c.jornada.find(p => p.etapa === e) ?? null;
const ms = (iso: string) => Date.parse(iso);
const ativo = (c: CasoRegistro) => (ETAPAS_DO_FUNIL as readonly Etapa[]).includes(c.etapa);
/** Análise concluída = o caso chegou a "Pronto para matrícula" (docs/03 §9: `analise.concluida`). */
const concluidoEm = (c: CasoRegistro) => passo(c, "PRONTO_PARA_MATRICULA")?.entrouEm ?? null;

/** Itens de análise para os indicadores: a análise real quando existe; senão, síntese do caso. */
interface ItemIa {
   sugerido: boolean;
   fonte: "IA" | "REGRA" | null;
   confianca: Confianca | null;
   decidido: boolean;
   aceito: boolean;
   motivo: MotivoAlteracao | null;
   pergunta: boolean;
   ch: number;
   dispensa: boolean;
}

function itensReais(a: AnaliseRegistro): ItemIa[] {
   return a.itens.map(i => {
      const fezDecisao = decidido(i) && !!i.decisao;
      const aceito = fezDecisao && !!i.sugestao && i.decisao?.valor === i.sugestao.decisao;
      return {
         sugerido: !!i.sugestao,
         fonte: i.sugestao?.fonte ?? null,
         confianca: i.sugestao?.confianca ?? null,
         decidido: fezDecisao,
         aceito,
         motivo: fezDecisao && i.sugestao && !aceito ? (i.decisao?.motivoAlteracao ?? "OUTRO") : null,
         pergunta: !!i.pergunta,
         ch: i.ch,
         dispensa: fezDecisao && i.decisao?.valor === "DISPENSA",
      };
   });
}

const ALTERACAO_POR_CONFIANCA: Record<Confianca, number> = { REGRA: 0.01, ALTA: 0.04, MEDIA: 0.2, BAIXA: 0.45 };

function itensSinteticos(c: CasoRegistro): ItemIa[] {
   const r = criarPrng(`ind-ia-${c.id}`);
   const matriz = matrizPorId(c.destino.matrizId ?? `${c.destino.cursoId}-20262`);
   const n = r.int(32, 52);
   const chMedia = matriz ? matriz.chTotal / n : 72;
   const foiCoordenacao = !!passo(c, "AGUARDANDO_COORDENACAO");
   const perguntas = foiCoordenacao ? r.int(1, 3) : 0;
   const falhou = c.flags.preAnaliseFalhou;
   return Array.from({ length: n }, (_, i) => {
      const sugerido = !falhou && r.chance(0.9);
      const confianca: Confianca | null = sugerido
         ? r.weighted<Confianca>([
              ["ALTA", 5],
              ["REGRA", 2],
              ["MEDIA", 2],
              ["BAIXA", 1],
           ])
         : null;
      const alterado = confianca ? r.chance(ALTERACAO_POR_CONFIANCA[confianca]) : false;
      const motivo = alterado
         ? r.weighted<MotivoAlteracao>([
              ["CH_INSUFICIENTE", 4],
              ["CONTEUDO_DIVERGENTE", 3],
              ["NOTA_REPROVACAO", 1],
              ["PRAZO_VALIDADE", 1],
              ["OUTRO", 1],
           ])
         : null;
      return {
         sugerido,
         fonte: confianca === "REGRA" ? "REGRA" : sugerido ? "IA" : null,
         confianca,
         decidido: true,
         aceito: sugerido && !alterado,
         motivo,
         pergunta: i < perguntas,
         ch: Math.round(chMedia),
         dispensa: r.chance(c.tipo === "TRANSFERENCIA_INTERNA" ? 0.75 : 0.42),
      };
   });
}

/** Esforço sintético por caso (sem fonte nos mocks): toques, transferências, lembretes, recusas. */
interface EsforcoCaso {
   consultor: { mensagens: number; notas: number; ligacoes: number; documentos: number };
   analise: number;
   coordenacao: number;
   matricula: number;
   transferencias: number;
   lembretes: number;
   recusas: string[];
}

const MOTIVOS_RECUSA = [
   "Foto ilegível ou cortada",
   "Documento incompleto",
   "Documento errado",
   "Sem assinatura ou carimbo",
   "Fora da validade",
] as const;

function esforcoDo(c: CasoRegistro): EsforcoCaso {
   const r = criarPrng(`ind-esforco-${c.id}`);
   const docs = !!passo(c, "AGUARDANDO_DOCUMENTOS");
   const coord = !!passo(c, "AGUARDANDO_COORDENACAO");
   return {
      consultor: {
         mensagens: r.weighted([
            [0, 4],
            [1, 3],
            [2, 2],
            [3, 1],
         ] as const),
         notas: r.weighted([
            [0, 6],
            [1, 3],
            [2, 1],
         ] as const),
         ligacoes: r.weighted([
            [0, 7],
            [1, 2],
            [2, 1],
         ] as const),
         documentos: docs
            ? r.weighted([
                 [0, 6],
                 [1, 3],
                 [2, 1],
              ] as const)
            : 0,
      },
      analise: r.int(3, 9),
      coordenacao: coord ? r.int(1, 4) : 0,
      matricula: passo(c, "PROPOSTA_ENVIADA") ? r.int(2, 6) : r.int(0, 2),
      transferencias: r.weighted([
         [0, 12],
         [1, 5],
         [2, 1],
      ] as const),
      lembretes: docs
         ? r.weighted([
              [0, 3],
              [1, 4],
              [2, 2],
              [3, 1],
           ] as const)
         : 0,
      recusas: docs && r.chance(0.32) ? Array.from({ length: r.int(1, 2) }, () => r.pick(MOTIVOS_RECUSA)) : [],
   };
}

/** Pesquisa D+1 após a matrícula (docs/10 §5): sintética por matriculado. */
interface PesquisaCaso {
   enviada: boolean;
   respondeu: boolean;
   ces: number | null;
   csat: number | null;
   comentario: string | null;
}

const CATEGORIAS_COMENTARIO = [
   "Envio de documentos",
   "Entender o resultado da análise",
   "Tempo de resposta",
   "Condições financeiras",
   "Contato com a equipe",
] as const;

function pesquisaDo(c: CasoRegistro, agora: Date): PesquisaCaso {
   const r = criarPrng(`ind-pesquisa-${c.id}`);
   const matriculaEm = passo(c, "MATRICULADO")?.entrouEm;
   const enviada = !!matriculaEm && agora.getTime() - ms(matriculaEm) >= DIA;
   const respondeu = enviada && r.chance(0.46);
   const nota = () =>
      r.weighted([
         [5, 9],
         [4, 6],
         [3, 2],
         [2, 1],
         [1, 0.6],
      ] as const);
   return {
      enviada,
      respondeu,
      ces: respondeu ? nota() : null,
      csat: respondeu && r.chance(0.9) ? nota() : null,
      comentario: respondeu && r.chance(0.55) ? r.pick(CATEGORIAS_COMENTARIO) : null,
   };
}

/** Duração sintética de uma execução da pré-análise, em minutos. */
function minutosPreAnalise(c: CasoRegistro): number {
   const r = criarPrng(`ind-pre-${c.id}`);
   const faixa = r.weighted([
      [[0.4, 1], 2],
      [[1, 5], 6],
      [[5, 15], 2.4],
      [[15, 40], 0.6],
   ] as const);
   return arred(faixa[0] + r.next() * (faixa[1] - faixa[0]), 1);
}

// ── Cálculo ────────────────────────────────────────────────────────────────────────────────────

export interface EntradaIndicadores {
   /** Casos já filtrados (sem os de teste). */
   casos: readonly CasoRegistro[];
   agora: Date;
   /** Funil do mesmo recorte (atrasados agora = a soma dele). */
   funil?: Funil;
   /** Semente das séries de demonstração (muda com o recorte, nunca com o relógio). */
   semente?: string;
   /** DIRETORIA/ADMIN: grupo da IA e conversão por responsável. */
   porPessoa: boolean;
   /** Análise já gerada do caso (padrão: a do banco simulado, sem gerar nova). */
   analise?: (c: CasoRegistro) => AnaliseRegistro | null;
}

export function calcularIndicadores(e: EntradaIndicadores): Grupos {
   const { casos, agora, porPessoa } = e;
   const semente = e.semente ?? "geral";
   const funil = e.funil ?? funilDe(casos, agora);
   const analiseDe = e.analise ?? ((c: CasoRegistro) => db.analises.get(c.id) ?? null);
   const sint = (id: string, taxaSerie: boolean) => (v: number | null) => serieSintetica(`${semente}-${id}`, v, agora, taxaSerie);
   const t = agora.getTime();

   const concluidos = casos.filter(c => concluidoEm(c) !== null);
   const ativos = casos.filter(ativo);
   const itensDe = (c: CasoRegistro) => {
      const a = analiseDe(c);
      return a ? itensReais(a) : itensSinteticos(c);
   };

   // ── Fluxo ──────────────────────────────────────────────────────────────────────────────────
   const fluxo: Indicador[] = [];

   {
      const dias = concluidos.map(c => (ms(concluidoEm(c) as string) - ms(c.criadoEm)) / DIA);
      const med = quantil(dias, 0.5);
      const p90 = quantil(dias, 0.9);
      fluxo.push(
         medida(
            {
               id: "lead-time",
               rotulo: "Lead time até a análise concluída",
               detalhe: p90 === null ? null : `p90 ${fmtDias(arred(p90))}`,
               composicao: faixasDias(
                  dias,
                  [
                     [3, "Até 3 dias"],
                     [7, "De 3 a 7 dias"],
                     [14, "De 7 a 14 dias"],
                  ],
                  "Mais de 14 dias",
               ),
               comoLer:
                  med === null || p90 === null
                     ? "Ainda não há caso com análise concluída neste recorte."
                     : `Metade dos casos levou até ${fmtDias(arred(med))} do protocolo à análise concluída; os 10% mais lentos passaram de ${fmtDias(arred(p90))}.`,
               meta: "Definir após o primeiro mês de uso",
            },
            med === null ? null : arred(med),
            "DIAS",
            dias.length,
            "casos com análise concluída",
            sint("lead-time", false),
         ),
      );
   }

   {
      // Pré-análise é automação: o tempo dela é medido no grupo da IA.
      const porEtapa = ETAPAS_DO_FUNIL.filter(et => et !== "PRE_ANALISE")
         .map(etapa => {
            const horas = casos.flatMap(c =>
               c.jornada.filter(p => p.etapa === etapa && p.saiuEm).map(p => (ms(p.saiuEm as string) - ms(p.entrouEm)) / HORA),
            );
            return { etapa, horas, med: quantil(horas, 0.5), p90: quantil(horas, 0.9) };
         })
         .filter(x => x.horas.length > 0);
      const lenta = [...porEtapa].sort((a, b) => (b.med ?? 0) - (a.med ?? 0))[0];
      fluxo.push(
         medida(
            {
               id: "tempo-etapa",
               rotulo: "Tempo na etapa mais lenta",
               detalhe: lenta ? `${ROTULO_ETAPA[lenta.etapa]} · p90 ${fmtHoras(arred(lenta.p90 ?? 0))}` : null,
               composicao: porEtapa.map(x => ({
                  rotulo: `${ROTULO_ETAPA[x.etapa]} · mediana`,
                  valor: arred(x.med ?? 0),
                  percentual: null,
                  denominador: x.horas.length,
               })),
               comoLer: lenta
                  ? `Na etapa ${ROTULO_ETAPA[lenta.etapa]}, metade dos casos esperou até ${fmtHoras(arred(lenta.med ?? 0))} para sair; é onde o caso mais para.`
                  : "Nenhum caso saiu de uma etapa neste recorte.",
            },
            lenta ? arred(lenta.med ?? 0) : null,
            "HORAS",
            lenta?.horas.length ?? 0,
            lenta ? `saídas de ${ROTULO_ETAPA[lenta.etapa]}` : "saídas de etapa",
            sint("tempo-etapa", false),
         ),
      );
   }

   {
      const comSla = (Object.keys(SLA_POR_ETAPA) as Etapa[]).filter(et => et !== "PRE_ANALISE");
      const linhas = comSla.map(etapa => {
         const regra = (SLA_POR_ETAPA as Partial<Record<Etapa, RegraSla>>)[etapa] as RegraSla;
         const saidas = casos.flatMap(c => c.jornada.filter(p => p.etapa === etapa && p.saiuEm));
         const noPrazo = saidas.filter(
            p => calcularPrazo(new Date(p.entrouEm), regra, CALENDARIO_MOCK).venceEm.getTime() >= ms(p.saiuEm as string),
         ).length;
         return { etapa, rotulo: ROTULO_ETAPA[etapa], num: noPrazo, den: saidas.length };
      });
      const num = soma(linhas.map(l => l.num));
      const den = soma(linhas.map(l => l.den));
      const coord = linhas.find(l => l.etapa === "AGUARDANDO_COORDENACAO");
      fluxo.push(
         taxa(
            {
               id: "sla-cumprido",
               rotulo: "Prazo cumprido nas etapas",
               detalhe: coord && coord.den > 0 ? `Coordenação ${percent(coord.num / coord.den, 0)}` : null,
               composicao: taxas(linhas),
               comoLer:
                  den > 0
                     ? `De cada 10 casos que saíram de uma etapa, ${decimal((num / den) * 10, 1)} saíram dentro do prazo; o resto saiu atrasado.`
                     : "Nenhum caso saiu de uma etapa com prazo neste recorte.",
               meta: "Coordenação ≥ 90%",
            },
            num,
            "dentro do prazo",
            den,
            "saídas de etapa",
            sint("sla-cumprido", true),
         ),
      );
   }

   {
      const num = soma(funil.etapas.map(x => x.atrasados));
      const den = soma(funil.etapas.map(x => x.total));
      const pior = [...funil.etapas].sort((a, b) => b.atrasados - a.atrasados)[0];
      fluxo.push(
         taxa(
            {
               id: "atrasados-agora",
               rotulo: "Casos atrasados agora",
               detalhe: pior && pior.atrasados > 0 ? `Mais em ${ROTULO_ETAPA[pior.etapa]}` : null,
               composicao: taxas(funil.etapas.map(x => ({ rotulo: ROTULO_ETAPA[x.etapa], num: x.atrasados, den: x.total }))),
               comoLer:
                  den > 0
                     ? `${int(num)} dos ${int(den)} casos ativos estão com o prazo da etapa estourado neste momento: cada um é um candidato esperando além do combinado.`
                     : "Não há caso ativo neste recorte.",
               meta: "Tendência de queda",
            },
            num,
            "atrasados",
            den,
            "casos ativos",
            sint("atrasados-agora", true),
         ),
      );
   }

   {
      const idades = ativos.map(c => (t - ms(c.criadoEm)) / DIA);
      const med = quantil(idades, 0.5);
      const velhos = idades.filter(d => d > 7).length;
      fluxo.push(
         medida(
            {
               id: "idade-ativos",
               rotulo: "Idade dos casos ativos",
               detalhe: ativos.length > 0 ? `${percent(velhos / ativos.length, 0)} com mais de 7 dias` : null,
               composicao: faixasDias(
                  idades,
                  [
                     [1, "Até 1 dia"],
                     [3, "De 1 a 3 dias"],
                     [7, "De 3 a 7 dias"],
                  ],
                  "Mais de 7 dias",
               ),
               comoLer:
                  med === null
                     ? "Não há caso ativo neste recorte."
                     : `Metade dos casos ativos foi aberta há até ${fmtDias(arred(med))}; ${int(velhos)} estão abertos há mais de uma semana.`,
            },
            med === null ? null : arred(med),
            "DIAS",
            ativos.length,
            "casos ativos",
            sint("idade-ativos", false),
         ),
      );
   }

   {
      const dias = casos.flatMap(c => {
         const p = passo(c, "AGUARDANDO_DOCUMENTOS");
         return p?.saiuEm ? [(ms(p.saiuEm) - ms(c.criadoEm)) / DIA] : [];
      });
      const med = quantil(dias, 0.5);
      fluxo.push(
         medida(
            {
               id: "documentos-completos",
               rotulo: "Tempo até documentos completos",
               detalhe: dias.length ? `p90 ${fmtDias(arred(quantil(dias, 0.9) ?? 0))}` : null,
               composicao: faixasDias(
                  dias,
                  [
                     [1, "Até 1 dia"],
                     [3, "De 1 a 3 dias"],
                     [7, "De 3 a 7 dias"],
                  ],
                  "Mais de 7 dias",
               ),
               comoLer:
                  med === null
                     ? "Nenhum caso deste recorte completou documentos ainda."
                     : `Metade dos candidatos levou até ${fmtDias(arred(med))} para completar os documentos; esse tempo é do candidato, não da equipe.`,
            },
            med === null ? null : arred(med),
            "DIAS",
            dias.length,
            "casos com documentos completos",
            sint("documentos-completos", false),
         ),
      );
   }

   {
      const regra = SLA_POR_ETAPA.PRONTO_PARA_MATRICULA;
      const contatos = casos.flatMap(c => {
         const i = c.jornada.findIndex(p => p.etapa === "PRONTO_PARA_MATRICULA");
         const p = c.jornada[i];
         if (!p?.saiuEm || c.jornada[i + 1]?.etapa !== "PROPOSTA_ENVIADA") return [];
         const noPrazo = calcularPrazo(new Date(p.entrouEm), regra, CALENDARIO_MOCK).venceEm.getTime() >= ms(p.saiuEm);
         return [{ horas: (ms(p.saiuEm) - ms(p.entrouEm)) / HORA, noPrazo }];
      });
      const med = quantil(
         contatos.map(x => x.horas),
         0.5,
      );
      const dentro = contatos.filter(x => x.noPrazo).length;
      const prazo = `${duration(regra.minutos)} úteis`;
      fluxo.push(
         medida(
            {
               id: "primeiro-contato",
               rotulo: "Primeiro contato da matrícula",
               detalhe: contatos.length ? `${percent(dentro / contatos.length, 0)} em até ${prazo}` : null,
               composicao: partes(
                  [
                     [`Dentro do prazo (${prazo})`, dentro],
                     ["Fora do prazo", contatos.length - dentro],
                  ],
                  contatos.length,
                  true,
               ),
               comoLer:
                  med === null
                     ? "Nenhuma proposta foi enviada neste recorte."
                     : `Da análise concluída à proposta enviada, metade dos candidatos esperou até ${fmtHoras(arred(med))}; ${int(contatos.length - dentro)} esperaram mais que o prazo.`,
               meta: `≤ ${prazo}`,
            },
            med === null ? null : arred(med),
            "HORAS",
            contatos.length,
            "propostas enviadas",
            sint("primeiro-contato", false),
         ),
      );
   }

   // ── Resultado ──────────────────────────────────────────────────────────────────────────────
   const resultado: Indicador[] = [];
   const matriculados = concluidos.filter(c => c.etapa === "MATRICULADO");
   const convNum = matriculados.length;
   const convDen = concluidos.length;
   // A semente não tem histórico de coortes maduras: a conta acumulada despencava nas semanas
   // recentes (casos que ainda não tiveram tempo de matricular). A série é sintética e termina no valor.
   const serieConversao = sint("conversao", true);
   const conversaoPor = (chave: (c: CasoRegistro) => string) =>
      [...agrupar(concluidos, chave)]
         .map(([rotulo, lista]) => ({ rotulo, num: lista.filter(c => c.etapa === "MATRICULADO").length, den: lista.length }))
         .sort((a, b) => b.den - a.den);

   {
      const inicioSemana = (c: CasoRegistro) => {
         const semanas = Math.floor((t - ms(concluidoEm(c) as string)) / SEMANA);
         return semanas >= PONTOS_SERIE - 1 ? "Antes" : String(semanas);
      };
      const grupos = agrupar(concluidos, inicioSemana);
      const linhas = [...Array.from({ length: PONTOS_SERIE - 1 }, (_, i) => String(i)), "Antes"].flatMap(k => {
         const lista = grupos.get(k) ?? [];
         if (!lista.length) return [];
         const rotulo =
            k === "Antes"
               ? `Concluídas antes de ${shortDate(new Date(t - (PONTOS_SERIE - 1) * SEMANA))}`
               : k === "0"
                 ? "Concluídas nos últimos 7 dias"
                 : `Semana de ${shortDate(new Date(t - (Number(k) + 1) * SEMANA))}`;
         return [{ rotulo, num: lista.filter(c => c.etapa === "MATRICULADO").length, den: lista.length }];
      });
      resultado.push(
         taxa(
            {
               id: "conversao",
               rotulo: "Conversão análise → matrícula",
               composicao: taxas(linhas),
               comoLer:
                  convDen > 0
                     ? `De cada 10 candidatos com análise concluída, ${decimal((convNum / convDen) * 10, 1)} se matricularam. A conta segue a coorte de conclusão: coortes recentes ainda estão em conversa.`
                     : "Ainda não há caso com análise concluída neste recorte.",
            },
            convNum,
            "matriculados",
            convDen,
            "com análise concluída",
            serieConversao,
         ),
      );
   }

   {
      const linhas = conversaoPor(c => ROTULO_TIPO[c.tipo]);
      const melhor = [...linhas].filter(l => l.den >= 3).sort((a, b) => b.num / b.den - a.num / a.den)[0];
      resultado.push(
         taxa(
            {
               id: "conversao-tipo",
               rotulo: "Conversão por tipo",
               detalhe: melhor ? `Maior: ${melhor.rotulo}` : null,
               composicao: taxas(TIPOS.map(tp => linhas.find(l => l.rotulo === ROTULO_TIPO[tp])).filter(l => l !== undefined)),
               comoLer: melhor
                  ? `${melhor.rotulo} converte ${percent(melhor.num / melhor.den, 0)}; compare cada tipo com o total antes de mudar o atendimento de um deles.`
                  : "Poucos casos concluídos para comparar os tipos.",
            },
            convNum,
            "matriculados",
            convDen,
            "com análise concluída",
            serieConversao,
         ),
      );
   }

   {
      const linhas = conversaoPor(c => c.destino.cursoNome);
      const pior = [...linhas].filter(l => l.den >= 3).sort((a, b) => a.num / a.den - b.num / b.den)[0];
      resultado.push(
         taxa(
            {
               id: "conversao-curso",
               rotulo: "Conversão por curso",
               detalhe: pior ? `Menor: ${pior.rotulo}` : null,
               composicao: taxas(linhas),
               comoLer: pior
                  ? `${pior.rotulo} é o curso que menos converte (${percent(pior.num / pior.den, 0)}); curso com poucos casos oscila muito, olhe o denominador.`
                  : "Poucos casos concluídos para comparar os cursos.",
            },
            convNum,
            "matriculados",
            convDen,
            "com análise concluída",
            serieConversao,
         ),
      );
   }

   if (porPessoa) {
      const linhas = conversaoPor(c => resumoUsuario(c.responsaveis.matriculaId)?.nome ?? "Sem responsável na matrícula");
      resultado.push(
         taxa(
            {
               id: ID_CONVERSAO_POR_RESPONSAVEL,
               rotulo: "Conversão por responsável",
               composicao: taxas(linhas),
               comoLer:
                  "Conversão de cada pessoa da matrícula sobre os casos que ela recebeu prontos; diferença pequena com poucos casos não é desempenho.",
            },
            convNum,
            "matriculados",
            convDen,
            "com análise concluída",
            serieConversao,
         ),
      );
   }

   {
      const perdidos = casos.filter(c => c.etapa === "PERDIDO");
      const encerrados = perdidos.length + casos.filter(c => c.etapa === "MATRICULADO").length;
      const porMotivo = [
         ...agrupar(perdidos, c => (ROTULO_MOTIVO_PERDA as Record<string, string>)[c.motivoEncerramento ?? ""] ?? "Não informado"),
      ]
         .map(([m, l]) => [m, l.length] as const)
         .sort((a, b) => b[1] - a[1]);
      const entrouEm = (c: CasoRegistro) => ms(c.jornada[c.jornada.length - 1].entrouEm);
      resultado.push(
         taxa(
            {
               id: "perdas",
               rotulo: "Perdas e motivos",
               detalhe: porMotivo[0] ? `Mais comum: ${porMotivo[0][0]}` : null,
               composicao: partes(porMotivo, perdidos.length),
               comoLer:
                  encerrados > 0
                     ? `De cada 10 casos encerrados, ${decimal((perdidos.length / encerrados) * 10, 1)} foram perdidos${porMotivo[0] ? `; o motivo mais registrado é ${porMotivo[0][0].toLowerCase()}` : ""}.`
                     : "Nenhum caso foi encerrado neste recorte.",
            },
            perdidos.length,
            "perdidos",
            encerrados,
            "encerrados (matriculados e perdidos)",
            v =>
               serieCalculada(agora, v, ate => {
                  const p = perdidos.filter(c => entrouEm(c) <= ate).length;
                  const m = casos.filter(c => c.etapa === "MATRICULADO" && entrouEm(c) <= ate).length;
                  return p + m > 0 ? p / (p + m) : null;
               }),
         ),
      );
   }

   {
      const base = casos.filter(c => concluidoEm(c) !== null || c.reanalises > 0);
      const com = base.filter(c => c.reanalises > 0).length;
      resultado.push(
         taxa(
            {
               id: "reanalise",
               rotulo: "Taxa de reanálise",
               composicao: partes(
                  [
                     ["Com reanálise", com],
                     ["Sem reanálise", base.length - com],
                  ],
                  base.length,
                  true,
               ),
               comoLer:
                  base.length > 0
                     ? `${int(com)} de ${int(base.length)} análises concluídas precisaram ser refeitas; cada reanálise é retrabalho e atrasa a proposta.`
                     : "Ainda não há análise concluída neste recorte.",
            },
            com,
            "reanalisados",
            base.length,
            "análises concluídas",
            sint("reanalise", true),
         ),
      );
   }

   {
      const porCaso = concluidos.map(c => {
         const congelado = c.resumoCongelado;
         if (congelado) return { c, disp: congelado.chDispensada, total: congelado.chTotalMatriz };
         const a = analiseDe(c);
         if (a) {
            const r = calcularResumo(a);
            return { c, disp: r.chDispensada, total: r.chTotalMatriz };
         }
         const itens = itensSinteticos(c);
         return { c, disp: soma(itens.filter(i => i.dispensa).map(i => i.ch)), total: soma(itens.map(i => i.ch)) };
      });
      const num = soma(porCaso.map(x => x.disp));
      const den = soma(porCaso.map(x => x.total));
      const linhas = [...agrupar(porCaso, x => cursoPorId(x.c.destino.cursoId).nome)].map(([rotulo, l]) => ({
         rotulo,
         num: soma(l.map(x => x.disp)),
         den: soma(l.map(x => x.total)),
      }));
      resultado.push(
         taxa(
            {
               id: "aproveitamento",
               rotulo: "Aproveitamento médio",
               composicao: taxas(linhas.sort((a, b) => b.den - a.den)),
               comoLer:
                  den > 0
                     ? `Em média, ${percent(num / den, 0)} da carga horária da matriz é dispensada para quem tem a análise concluída; é o argumento de venda do curso.`
                     : "Ainda não há análise concluída neste recorte.",
            },
            num,
            "h dispensadas",
            den,
            "h das matrizes",
            sint("aproveitamento", true),
         ),
      );
   }

   // ── Esforço ────────────────────────────────────────────────────────────────────────────────
   const esforco: Indicador[] = [];
   const esf = concluidos.map(esforcoDo);
   const n = concluidos.length;
   const porCaso = (total: number) => (n > 0 ? total / n : null);

   {
      const mensagens = soma(esf.map(x => x.consultor.mensagens));
      const notas = soma(esf.map(x => x.consultor.notas));
      const ligacoes = soma(esf.map(x => x.consultor.ligacoes));
      const documentos = soma(esf.map(x => x.consultor.documentos));
      const total = mensagens + notas + ligacoes + documentos;
      const v = porCaso(total);
      esforco.push(
         medida(
            {
               id: "toques-consultor",
               rotulo: "Toques do consultor por caso",
               composicao: partes(
                  [
                     ["Mensagens manuais", mensagens],
                     ["Notas internas", notas],
                     ["Ligações registradas", ligacoes],
                     ["Documentos enviados por ele", documentos],
                  ],
                  total,
               ),
               comoLer:
                  v === null
                     ? "Ainda não há caso com análise concluída neste recorte."
                     : `Cada caso concluído custou ${decimal(v, 1)} ações manuais do consultor; o tempo dele é de venda, então este número deve cair.`,
               meta: "Tendência de queda",
            },
            v === null ? null : arred(v, 2),
            "CONTAGEM",
            n,
            "casos com análise concluída",
            sint("toques-consultor", false),
            { n: total, rotulo: "toques" },
         ),
      );
      const analiseT = soma(esf.map(x => x.analise));
      const coordT = soma(esf.map(x => x.coordenacao));
      const matT = soma(esf.map(x => x.matricula));
      const humanos = total + analiseT + coordT + matT;
      const vh = porCaso(humanos);
      esforco.push(
         medida(
            {
               id: "toques-humanos",
               rotulo: "Toques humanos por caso",
               composicao: partes(
                  [
                     ["Consultor", total],
                     ["Análise", analiseT],
                     ["Coordenação", coordT],
                     ["Matrícula", matT],
                  ],
                  humanos,
               ),
               comoLer:
                  vh === null
                     ? "Ainda não há caso com análise concluída neste recorte."
                     : `Cada caso concluído passou por ${decimal(vh, 1)} ações de pessoas da equipe até aqui.`,
            },
            vh === null ? null : arred(vh, 2),
            "CONTAGEM",
            n,
            "casos com análise concluída",
            sint("toques-humanos", false),
            { n: humanos, rotulo: "toques" },
         ),
      );
   }

   {
      const total = soma(esf.map(x => x.transferencias));
      const v = porCaso(total);
      esforco.push(
         medida(
            {
               id: "transferencias",
               rotulo: "Trocas de responsável por caso",
               composicao: partes(
                  [
                     ["Nenhuma troca", esf.filter(x => x.transferencias === 0).length],
                     ["Uma troca", esf.filter(x => x.transferencias === 1).length],
                     ["Duas ou mais", esf.filter(x => x.transferencias >= 2).length],
                  ],
                  n,
                  true,
               ),
               comoLer:
                  v === null
                     ? "Ainda não há caso com análise concluída neste recorte."
                     : `Em média, ${decimal(v, 2)} trocas de responsável por caso; cada troca é alguém relendo o caso do zero.`,
            },
            v === null ? null : arred(v, 2),
            "CONTAGEM",
            n,
            "casos com análise concluída",
            sint("transferencias", false),
            { n: total, rotulo: "trocas" },
         ),
      );
   }

   {
      const perguntas = concluidos.map(c => itensDe(c).filter(i => i.pergunta).length);
      const total = soma(perguntas);
      const v = porCaso(total);
      esforco.push(
         medida(
            {
               id: "perguntas-coordenacao",
               rotulo: "Perguntas à coordenação por caso",
               composicao: partes(
                  [
                     ["Sem pergunta", perguntas.filter(p => p === 0).length],
                     ["Uma pergunta", perguntas.filter(p => p === 1).length],
                     ["Duas ou mais", perguntas.filter(p => p >= 2).length],
                  ],
                  n,
                  true,
               ),
               comoLer:
                  v === null
                     ? "Ainda não há caso com análise concluída neste recorte."
                     : `${decimal(v, 2)} itens por caso concluído foram para a coordenação; deve cair conforme a base de equivalências cresce.`,
               meta: "Tendência de queda",
            },
            v === null ? null : arred(v, 2),
            "CONTAGEM",
            n,
            "casos com análise concluída",
            sint("perguntas-coordenacao", false),
            { n: total, rotulo: "perguntas" },
         ),
      );
   }

   {
      const comDocs = casos.filter(c => !!passo(c, "AGUARDANDO_DOCUMENTOS")?.saiuEm);
      const lembretes = comDocs.map(c => esforcoDo(c).lembretes);
      const total = soma(lembretes);
      const v = comDocs.length ? total / comDocs.length : null;
      esforco.push(
         medida(
            {
               id: "lembretes",
               rotulo: "Lembretes até documentos completos",
               composicao: partes(
                  [
                     ["Nenhum lembrete", lembretes.filter(x => x === 0).length],
                     ["Um lembrete", lembretes.filter(x => x === 1).length],
                     ["Dois lembretes", lembretes.filter(x => x === 2).length],
                     ["Três ou mais", lembretes.filter(x => x >= 3).length],
                  ],
                  comDocs.length,
                  true,
               ),
               comoLer:
                  v === null
                     ? "Nenhum caso deste recorte completou documentos ainda."
                     : `Cada candidato precisou de ${decimal(v, 1)} lembretes para completar os documentos; muitos lembretes indicam checklist pouco claro.`,
            },
            v === null ? null : arred(v, 2),
            "CONTAGEM",
            comDocs.length,
            "casos com documentos completos",
            sint("lembretes", false),
            { n: total, rotulo: "lembretes" },
         ),
      );

      const recusas = comDocs.flatMap(c => esforcoDo(c).recusas);
      const porMotivo = MOTIVOS_RECUSA.map(m => [m, recusas.filter(x => x === m).length] as const).sort((a, b) => b[1] - a[1]);
      esforco.push(
         medida(
            {
               id: "recusas-documento",
               rotulo: "Recusas de documento",
               detalhe: porMotivo[0] && porMotivo[0][1] > 0 ? `Mais comum: ${porMotivo[0][0]}` : null,
               composicao: partes(porMotivo, recusas.length),
               comoLer:
                  recusas.length > 0
                     ? `${int(recusas.length)} documentos foram recusados; "${porMotivo[0][0]}" lidera. A causa costuma estar na instrução que o candidato recebeu.`
                     : "Nenhum documento foi recusado neste recorte.",
            },
            recusas.length,
            "CONTAGEM",
            comDocs.length,
            "casos com documentos completos",
            sint("recusas-documento", false),
         ),
      );
   }

   // ── Experiência do candidato ───────────────────────────────────────────────────────────────
   const experiencia: Indicador[] = [];
   {
      const pesquisas = casos.filter(c => c.etapa === "MATRICULADO").map(c => pesquisaDo(c, agora));
      const enviadas = pesquisas.filter(p => p.enviada);
      const respostas = enviadas.filter(p => p.respondeu);
      experiencia.push(
         taxa(
            {
               id: "taxa-resposta",
               rotulo: "Taxa de resposta da pesquisa",
               composicao: partes(
                  [
                     ["Responderam", respostas.length],
                     ["Não responderam", enviadas.length - respostas.length],
                  ],
                  enviadas.length,
                  true,
               ),
               comoLer:
                  enviadas.length > 0
                     ? `${int(respostas.length)} de ${int(enviadas.length)} matriculados responderam à pesquisa do dia seguinte; leia CES e CSAT sabendo quem ficou de fora.`
                     : "Nenhuma pesquisa foi enviada neste recorte.",
            },
            respostas.length,
            "respostas",
            enviadas.length,
            "pesquisas enviadas",
            sint("taxa-resposta", true),
         ),
      );
      const nota = (id: "ces" | "csat", rotulo: string, frase: (v: string) => string) => {
         const notas = respostas.map(p => p[id]).filter((x): x is number => x !== null);
         const bons = notas.filter(x => x >= 4).length;
         return taxa(
            {
               id,
               rotulo,
               composicao: partes(
                  [5, 4, 3, 2, 1].map(k => [`Nota ${k}`, notas.filter(x => x === k).length] as const),
                  notas.length,
                  true,
               ),
               comoLer: notas.length > 0 ? frase(percent(bons / notas.length, 0)) : "Ainda não há resposta neste recorte.",
            },
            bons,
            "notas 4 ou 5",
            notas.length,
            "respostas",
            sint(id, true),
         );
      };
      experiencia.push(
         nota(
            "ces",
            "Facilidade (CES)",
            v => `${v} dos matriculados que responderam acharam fácil enviar documentos e entender a análise.`,
         ),
      );
      experiencia.push(nota("csat", "Satisfação (CSAT)", v => `${v} dos que responderam avaliaram bem o atendimento até a matrícula.`));
      const comentarios = respostas.map(p => p.comentario).filter((x): x is string => x !== null);
      const porCategoria = CATEGORIAS_COMENTARIO.map(cat => [cat, comentarios.filter(x => x === cat).length] as const).sort(
         (a, b) => b[1] - a[1],
      );
      experiencia.push(
         medida(
            {
               id: "o-que-facilitar",
               rotulo: "O que poderia ser mais fácil",
               detalhe: porCategoria[0] && porCategoria[0][1] > 0 ? `Mais citado: ${porCategoria[0][0]}` : null,
               composicao: partes(porCategoria, comentarios.length),
               comoLer:
                  comentarios.length > 0
                     ? `${int(comentarios.length)} comentários abertos, categorizados; "${porCategoria[0][0]}" é o atrito mais citado.`
                     : "Nenhum comentário aberto neste recorte.",
            },
            comentarios.length,
            "CONTAGEM",
            respostas.length,
            "respostas",
            sint("o-que-facilitar", false),
         ),
      );
   }

   // ── Pré-análise com IA (docs/07 §4) ────────────────────────────────────────────────────────
   const ia: Indicador[] = [];
   if (porPessoa) {
      const comAnalise = casos.filter(c => concluidoEm(c) !== null || analiseDe(c) !== null);
      const itens = comAnalise.flatMap(itensDe);
      const decididosSug = itens.filter(i => i.sugerido && i.decidido);
      const aceitos = decididosSug.filter(i => i.aceito);
      const confiancas: Confianca[] = ["ALTA", "REGRA", "MEDIA", "BAIXA"];
      ia.push(
         taxa(
            {
               id: "ia-aceite",
               rotulo: "Aceite da IA sem alteração",
               composicao: taxas(
                  confiancas.map(cf => {
                     const daConf = decididosSug.filter(i => i.confianca === cf);
                     return {
                        rotulo: `Confiança ${ROTULO_CONFIANCA[cf].toLowerCase()}`,
                        num: daConf.filter(i => i.aceito).length,
                        den: daConf.length,
                     };
                  }),
               ),
               comoLer:
                  decididosSug.length > 0
                     ? `${percent(aceitos.length / decididosSug.length, 0)} das sugestões viraram decisão sem mudança; é qualidade da sugestão, não autorização para aceitar sem conferir.`
                     : "Nenhuma sugestão foi decidida neste recorte.",
            },
            aceitos.length,
            "aceitas como sugeridas",
            decididosSug.length,
            "sugestões decididas",
            sint("ia-aceite", true),
         ),
      );
      const alterados = decididosSug.filter(i => !i.aceito);
      const motivos: MotivoAlteracao[] = ["CH_INSUFICIENTE", "CONTEUDO_DIVERGENTE", "NOTA_REPROVACAO", "PRAZO_VALIDADE", "OUTRO"];
      ia.push(
         taxa(
            {
               id: "ia-alteracao",
               rotulo: "Alteração por motivo",
               composicao: partes(
                  motivos
                     .map(m => [ROTULO_MOTIVO_ALTERACAO[m], alterados.filter(i => (i.motivo ?? "OUTRO") === m).length] as const)
                     .sort((a, b) => b[1] - a[1]),
                  alterados.length,
               ),
               comoLer:
                  alterados.length > 0
                     ? `${int(alterados.length)} sugestões foram mudadas pela análise; o motivo mais frequente aponta o que calibrar na IA com o TI.`
                     : "Nenhuma sugestão foi alterada neste recorte.",
            },
            alterados.length,
            "alteradas",
            decididosSug.length,
            "sugestões decididas",
            sint("ia-alteracao", true),
         ),
      );
      const daIa = itens.filter(i => i.fonte === "IA").length;
      const daRegra = itens.filter(i => i.fonte === "REGRA").length;
      ia.push(
         taxa(
            {
               id: "ia-cobertura",
               rotulo: "Cobertura da pré-análise",
               composicao: partes(
                  [
                     ["Sugestão da IA", daIa],
                     ["Regra da base de equivalências", daRegra],
                     ["Sem sugestão", itens.length - daIa - daRegra],
                  ],
                  itens.length,
                  true,
               ),
               comoLer:
                  itens.length > 0
                     ? `${percent((daIa + daRegra) / itens.length, 0)} das disciplinas das matrizes chegaram à análise com sugestão; o resto foi decidido do zero.`
                     : "Nenhuma análise neste recorte.",
            },
            daIa + daRegra,
            "itens com sugestão",
            itens.length,
            "itens das matrizes",
            sint("ia-cobertura", true),
         ),
      );
      const execucoes = casos.filter(c => !!passo(c, "PRE_ANALISE")?.saiuEm);
      const minutos = execucoes.map(minutosPreAnalise);
      const med = quantil(minutos, 0.5);
      const limite = SLA_POR_ETAPA.PRE_ANALISE.minutos;
      ia.push(
         medida(
            {
               id: "ia-tempo",
               rotulo: "Tempo de pré-análise",
               detalhe: minutos.length ? `p90 ${duration(quantil(minutos, 0.9) ?? 0)}` : null,
               composicao: partes(
                  [
                     ["Até 1 min", minutos.filter(m => m <= 1).length],
                     ["De 1 a 5 min", minutos.filter(m => m > 1 && m <= 5).length],
                     [`De 5 a ${limite} min`, minutos.filter(m => m > 5 && m <= limite).length],
                     [`Mais de ${limite} min`, minutos.filter(m => m > limite).length],
                  ],
                  minutos.length,
                  true,
               ),
               comoLer:
                  med === null
                     ? "Nenhuma pré-análise terminou neste recorte."
                     : `Metade das pré-análises terminou em até ${duration(med)}; acima de ${limite} min o caso estoura o prazo da etapa.`,
               meta: `≤ ${limite} min`,
            },
            med === null ? null : arred(med),
            "MINUTOS",
            minutos.length,
            "execuções",
            sint("ia-tempo", false),
         ),
      );
      const falhas = execucoes.filter(c => c.flags.preAnaliseFalhou).length;
      ia.push(
         taxa(
            {
               id: "ia-falhas",
               rotulo: "Falhas da pré-análise",
               composicao: partes(
                  [
                     ["Concluídas", execucoes.length - falhas],
                     ["Falharam", falhas],
                  ],
                  execucoes.length,
                  true,
               ),
               comoLer:
                  execucoes.length > 0
                     ? `${int(falhas)} de ${int(execucoes.length)} ${falhas === 1 ? "execução falhou" : "execuções falharam"}; nesses casos a análise começou sem sugestão.`
                     : "Nenhuma pré-análise neste recorte.",
            },
            falhas,
            "falhas",
            execucoes.length,
            "execuções",
            sint("ia-falhas", true),
         ),
      );
   }

   return { fluxo, resultado, esforco, experiencia, ia };
}

// ── Handler ────────────────────────────────────────────────────────────────────────────────────

export const handlersIndicadores = [
   http.get(`${API}/indicadores`, async ({ request }) => {
      const ctx = await preparar();
      if (!temCapacidade(ctx.usuario.papeis, "VER_GESTAO"))
         return erro(403, "SEM_PERMISSAO", "Os indicadores ficam na área de gestão comercial.");
      const p = new URL(request.url).searchParams;
      const filtro: FiltroIndicadores = {
         ciclo: p.get("ciclo"),
         tipo: p.get("tipo"),
         curso: p.get("curso"),
         modalidade: p.get("modalidade"),
      };
      const casos = filtrarCasos(db.casos.values(), filtro);
      const recortado = !!(filtro.tipo || filtro.curso || filtro.modalidade);
      const funil = recortado ? funilDe(casos, ctx.agora) : montarFunil(filtro.ciclo, ctx.agora);
      const porPessoa = ctx.usuario.papeis.some(papel => MATRIZ.VER_INDICADORES_POR_PESSOA.includes(papel));
      const semente = [filtro.ciclo, filtro.tipo, filtro.curso, filtro.modalidade].map(x => x ?? "*").join("|");
      const grupos = calcularIndicadores({ casos, agora: ctx.agora, funil, semente, porPessoa });
      const corpo: Indicadores = { funil, ...grupos, geradoEm: ctx.agora.toISOString() };
      return ok(corpo);
   }),
];
