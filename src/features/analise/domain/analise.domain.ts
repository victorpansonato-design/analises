/**
 * Domínio puro da aba Análise (docs/06). Filtros, agrupamento por período, comparação de CH,
 * seleção por intervalo e a decisão otimista vivem aqui, sem React, para serem testados e para a
 * grade e o resumo concordarem. Nenhum número de regra fica solto: limiares vêm de `REGRAS_ANALISE`
 * e `IA` (`@/features/casos`).
 */
import { IA, REGRAS_ANALISE, ROTULO_DECISAO, type DecisaoItem, type UsuarioResumo } from "@/features/casos";
import { searchKey } from "@/lib/format";

import {
   itemDecidido,
   type Confianca,
   type DecisaoEntrada,
   type ItemAnalise,
   type ItemOrigem,
   type OrigemDecisao,
} from "@/features/analise/types/analise.schema";

// ── Decisões ──────────────────────────────────────────────────────────────────────────────────

export const DECISOES: readonly DecisaoItem[] = ["DISPENSA", "DP", "ADAP", "REGULAR"];
export const OPCOES_DECISAO = DECISOES.map(d => ({ value: d, label: ROTULO_DECISAO[d] }));

// ── Filtros ────────────────────────────────────────────────────────────────────────────────────

export const FILTROS_ANALISE = ["todas", "pendentes", "divergentes", "contestadas", "coordenacao", "decididas"] as const;
export type FiltroAnalise = (typeof FILTROS_ANALISE)[number];

export const ROTULO_FILTRO_ANALISE: Record<FiltroAnalise, string> = {
   todas: "Todas",
   pendentes: "Pendentes",
   divergentes: "Divergentes",
   contestadas: "Contestadas",
   coordenacao: "Para coordenação",
   decididas: "Decididas",
};

export function ehFiltroAnalise(valor: string | null): valor is FiltroAnalise {
   return valor !== null && (FILTROS_ANALISE as readonly string[]).includes(valor);
}

/** Sem decisão confirmada (SUGERIDO ou PERGUNTA_ABERTA). RESPONDIDO conta como decidido. */
export function pendente(item: ItemAnalise): boolean {
   return !itemDecidido(item);
}

/** Exige julgamento: sugestão de confiança Média/Baixa, com alertas, ou decisão diferente da sugestão. */
export function divergente(item: ItemAnalise): boolean {
   const s = item.sugestao;
   if (!s) return false;
   if (s.confianca === "MEDIA" || s.confianca === "BAIXA") return true;
   if ((s.alertas?.length ?? 0) > 0) return true;
   return !!item.decisao && item.decisao.valor !== s.decisao;
}

export function paraCoordenacao(item: ItemAnalise): boolean {
   return item.estado === "PERGUNTA_ABERTA" || item.estado === "RESPONDIDO";
}

/** O aluno contestou a decisão na reabertura da análise. */
export function contestada(item: ItemAnalise): boolean {
   return !!item.contestacao;
}

const PREDICADO: Record<FiltroAnalise, (i: ItemAnalise) => boolean> = {
   todas: () => true,
   pendentes: pendente,
   divergentes: divergente,
   contestadas: contestada,
   coordenacao: paraCoordenacao,
   decididas: itemDecidido,
};

/** Busca por código, disciplina de destino ou de origem, sem acento e sem caixa. */
export function casaBusca(item: ItemAnalise, busca: string, origemPorId?: ReadonlyMap<string, ItemOrigem>): boolean {
   const k = searchKey(busca);
   if (!k) return true;
   if (searchKey(item.disciplina).includes(k) || (item.codigo && searchKey(item.codigo).includes(k))) return true;
   if (!origemPorId) return false;
   return origemIds(item).some(id => {
      const o = origemPorId.get(id);
      return !!o && searchKey(o.nome).includes(k);
   });
}

export function filtrarItens(
   itens: readonly ItemAnalise[],
   filtro: FiltroAnalise,
   busca = "",
   origemPorId?: ReadonlyMap<string, ItemOrigem>,
): ItemAnalise[] {
   const p = PREDICADO[filtro];
   return itens.filter(i => p(i) && casaBusca(i, busca, origemPorId));
}

export function contarFiltros(itens: readonly ItemAnalise[]): Record<FiltroAnalise, number> {
   const r = { todas: 0, pendentes: 0, divergentes: 0, contestadas: 0, coordenacao: 0, decididas: 0 } satisfies Record<
      FiltroAnalise,
      number
   >;
   for (const i of itens) for (const f of FILTROS_ANALISE) if (PREDICADO[f](i)) r[f] += 1;
   return r;
}

// ── Agrupamento por período ────────────────────────────────────────────────────────────────────

export function tituloPeriodo(periodo: number | null): string {
   return periodo === null ? "Sem período" : `Período ${periodo}`;
}

export function chaveDoPeriodo(periodo: number | null): string {
   return periodo === null ? "sem-periodo" : `p${periodo}`;
}

export interface GrupoPeriodo {
   /** `null`: disciplinas sem período na matriz (estágio, optativas). */
   periodo: number | null;
   chave: string;
   itens: ItemAnalise[];
   decididas: number;
   dispensadas: number;
}

/** Agrupa preservando a ordem da matriz dentro do período; sem período vai por último. */
export function agruparPorPeriodo(itens: readonly ItemAnalise[]): GrupoPeriodo[] {
   const mapa = new Map<number | null, ItemAnalise[]>();
   for (const i of itens) mapa.set(i.periodo, [...(mapa.get(i.periodo) ?? []), i]);
   return [...mapa.entries()]
      .sort(([a], [b]) => (a === null ? 1 : b === null ? -1 : a - b))
      .map(([periodo, lista]) => ({
         periodo,
         chave: chaveDoPeriodo(periodo),
         itens: lista,
         decididas: lista.filter(itemDecidido).length,
         dispensadas: lista.filter(i => itemDecidido(i) && i.decisao?.valor === "DISPENSA").length,
      }));
}

// ── Origem e comparação de CH ──────────────────────────────────────────────────────────────────

/** Disciplinas de origem em jogo no item: as da decisão; sem decisão, as da sugestão. */
export function origemIds(item: Pick<ItemAnalise, "decisao" | "sugestao">): string[] {
   return item.decisao?.origemIds ?? item.sugestao?.origemIds ?? [];
}

export function anoSemestre(o: Pick<ItemOrigem, "ano" | "semestre">): string {
   if (o.ano === null) return "Ano não informado";
   return o.semestre === null ? String(o.ano) : `${o.ano}/${o.semestre}`;
}

export function origensDoItem(item: ItemAnalise, origemPorId: ReadonlyMap<string, ItemOrigem>): ItemOrigem[] {
   return origemIds(item)
      .map(id => origemPorId.get(id))
      .filter((o): o is ItemOrigem => !!o);
}

export interface ComparacaoCh {
   chOrigem: number;
   chDestino: number;
   /** CH origem ÷ CH destino (0 quando o destino não tem CH). */
   razao: number;
   abaixoDoMinimo: boolean;
}

/** Compara a CH somada da origem com a do destino contra `REGRAS_ANALISE.chMinimaPercentual`. */
export function compararCh(chOrigem: number, chDestino: number): ComparacaoCh {
   const razao = chDestino > 0 ? chOrigem / chDestino : 0;
   return { chOrigem, chDestino, razao, abaixoDoMinimo: razao < REGRAS_ANALISE.chMinimaPercentual };
}

export function somarCh(origens: readonly Pick<ItemOrigem, "ch">[]): number {
   return origens.reduce((s, o) => s + o.ch, 0);
}

/** Abaixo deste valor a leitura do histórico é destacada para conferência (`IA.conferirExtracaoAbaixo`). */
export const EXTRACAO_CONFERIR_ABAIXO = IA.conferirExtracaoAbaixo;

export function extracaoBaixa(o: Pick<ItemOrigem, "confiancaExtracao">): boolean {
   return o.confiancaExtracao !== null && o.confiancaExtracao < EXTRACAO_CONFERIR_ABAIXO;
}

/** Origens que não sustentam nenhuma dispensa (decidida ou sugerida): "Disciplinas da origem não aproveitadas". */
export function origensNaoAproveitadas(itens: readonly ItemAnalise[], origem: readonly ItemOrigem[]): ItemOrigem[] {
   const usadas = new Set<string>();
   for (const i of itens) {
      const valor = i.decisao?.valor ?? i.sugestao?.decisao ?? null;
      if (valor === "DISPENSA") for (const id of origemIds(i)) usadas.add(id);
   }
   return origem.filter(o => !usadas.has(o.id));
}

// ── Confiança e decisão exibida ────────────────────────────────────────────────────────────────

export const TOM_CONFIANCA: Record<Confianca, "ok" | "warn" | "risk"> = { ALTA: "ok", REGRA: "ok", MEDIA: "warn", BAIXA: "risk" };

export interface DecisaoExibida {
   valor: DecisaoItem | null;
   /** Ainda é sugestão (IA, regra ou da pergunta): o segmented fica em tom fantasma. */
   fantasma: boolean;
}

export function decisaoExibida(item: ItemAnalise): DecisaoExibida {
   if (itemDecidido(item) && item.decisao) return { valor: item.decisao.valor, fantasma: false };
   if (item.estado === "PERGUNTA_ABERTA" && item.pergunta) return { valor: item.pergunta.decisaoSugerida, fantasma: true };
   return { valor: item.sugestao?.decisao ?? null, fantasma: true };
}

/** Pode entrar no "Aceitar sugestões de alta confiança": só SUGERIDO com confiança `IA.loteSomente`. */
export function aceitavelEmLote(item: ItemAnalise): boolean {
   return item.estado === "SUGERIDO" && !!item.sugestao && (IA.loteSomente as readonly string[]).includes(item.sugestao.confianca);
}

export function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
   if (a.length !== b.length) return false;
   const s = new Set(a);
   return b.every(x => s.has(x));
}

/** Origem da decisão para auditoria (docs/07 §3.4). */
export function origemDaDecisao(item: ItemAnalise, entrada: DecisaoEntrada, coordenacao: boolean): OrigemDecisao {
   if (coordenacao) return "COORDENACAO";
   const s = item.sugestao;
   const igual = !!s && s.decisao === entrada.valor && (entrada.origemIds === undefined || mesmoConjunto(entrada.origemIds, s.origemIds));
   return igual && s ? s.fonte : "ANALISTA";
}

/** O item como ficará depois de decidir (cache otimista; o servidor confirma e devolve o definitivo). */
export function decidirOtimista(
   item: ItemAnalise,
   entrada: DecisaoEntrada,
   por: UsuarioResumo,
   em: string,
   coordenacao: boolean,
): ItemAnalise {
   const origem = origemDaDecisao(item, entrada, coordenacao);
   return {
      ...item,
      estado: coordenacao && item.pergunta ? "RESPONDIDO" : "DECIDIDO",
      decisao: {
         valor: entrada.valor,
         origemIds: entrada.origemIds ?? item.decisao?.origemIds ?? item.sugestao?.origemIds ?? [],
         origem,
         motivoAlteracao: origem === "ANALISTA" ? (entrada.motivoAlteracao ?? null) : null,
         por,
         em,
      },
   };
}

/** Volta para sugestão (o "Desfazer" do lote). */
export function reverterOtimista(item: ItemAnalise): ItemAnalise {
   return item.estado === "DECIDIDO" ? { ...item, estado: "SUGERIDO", decisao: null } : item;
}

// ── Navegação e seleção ────────────────────────────────────────────────────────────────────────

/** Ids entre `de` e `ate` (inclusive) na ordem visível; vazio se algum não estiver visível. */
export function intervalo(ordem: readonly string[], de: string, ate: string): string[] {
   const a = ordem.indexOf(de);
   const b = ordem.indexOf(ate);
   if (a < 0 || b < 0) return [];
   const [i, j] = a <= b ? [a, b] : [b, a];
   return ordem.slice(i, j + 1);
}

/**
 * Clique no checkbox: sem Shift alterna o item; com Shift (e uma âncora visível) marca o intervalo
 * inteiro, como em qualquer lista de e-mail.
 */
export function alternarSelecao(
   selecionados: ReadonlySet<string>,
   ordem: readonly string[],
   id: string,
   ancora: string | null,
   shift: boolean,
): Set<string> {
   const nova = new Set(selecionados);
   if (shift && ancora && ancora !== id) {
      const faixa = intervalo(ordem, ancora, id);
      if (faixa.length) {
         for (const x of faixa) nova.add(x);
         return nova;
      }
   }
   if (nova.has(id)) nova.delete(id);
   else nova.add(id);
   return nova;
}

/** Próximo (`+1`) ou anterior (`-1`) id na ordem; fica no lugar nas pontas. */
export function vizinho(ordem: readonly string[], atual: string | null, direcao: 1 | -1): string | null {
   if (ordem.length === 0) return null;
   const i = atual ? ordem.indexOf(atual) : -1;
   if (i < 0) return direcao === 1 ? ordem[0] : ordem[ordem.length - 1];
   return ordem[Math.max(0, Math.min(ordem.length - 1, i + direcao))];
}

/** Próximo/anterior item PENDENTE (teclas `]` e `[`), com volta ao início. */
export function proximoPendente(
   ordem: readonly string[],
   porId: ReadonlyMap<string, ItemAnalise>,
   atual: string | null,
   direcao: 1 | -1,
): string | null {
   const n = ordem.length;
   if (n === 0) return null;
   const inicio = atual ? ordem.indexOf(atual) : direcao === 1 ? -1 : n;
   for (let passo = 1; passo <= n; passo++) {
      const idx = (((inicio + direcao * passo) % n) + n) % n;
      const item = porId.get(ordem[idx]);
      if (item && pendente(item)) return ordem[idx];
   }
   return null;
}

// ── Resumo ─────────────────────────────────────────────────────────────────────────────────────

/** Fração de aproveitamento (CH dispensada ÷ CH total da matriz). */
export function aproveitamento(chDispensada: number, chTotal: number): number {
   return chTotal > 0 ? chDispensada / chTotal : 0;
}

/** Resumo do lote para o modal de confirmação: "18 dispensas, 14 regulares". */
export function contarPorDecisao(itens: readonly ItemAnalise[]): Record<DecisaoItem, number> {
   const r: Record<DecisaoItem, number> = { DISPENSA: 0, REGULAR: 0, DP: 0, ADAP: 0 };
   for (const i of itens) if (i.sugestao) r[i.sugestao.decisao] += 1;
   return r;
}
