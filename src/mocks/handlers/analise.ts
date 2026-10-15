/**
 * Handlers simulados: análise curricular, pré-análise e coordenação (contrato: tags Análise e
 * Coordenação). Como o backend real: aplicam as permissões (`proibidoSeNaoPuder`), conferem a versão
 * DA ANÁLISE no `If-Match` (409 se divergir), recalculam o uso das origens e registram na linha do
 * tempo um evento por ação em lote. As regras de mudança ficam em funções puras exportadas (testadas
 * em `tests/unit/mocks/analise-handlers.test.ts`).
 */
import { http } from "msw";

import {
   ATIVIDADES_COMPLEMENTARES,
   type DecisaoEntrada,
   type ItemAnalise,
   type LoteEntrada,
   type PerguntaEntrada,
   textoDoParecer,
   type RespostaEntrada,
} from "@/features/analise";
import { IA, REGRAS_ANALISE, ROTULO_DECISAO, type NomeAcao, type UsuarioResumo } from "@/features/casos";
import { plural } from "@/lib/format";

import { atualizarUsoOrigem, calcularResumo, cobertura, decidido, gerarAnalise, montarAnalise } from "@/mocks/db/analise";
import { valoresDoCaso } from "@/mocks/db/comunicacao";
import { novoId } from "@/mocks/db/estado";
import { analiseDoCaso, registrarEvento } from "@/mocks/db/repositorio";
import type { AnaliseRegistro, CasoRegistro } from "@/mocks/db/tipos";
import { casoOu404, preparar, proibidoSeNaoPuder, tocar, type Contexto } from "@/mocks/handlers/comum";
import { API, erro, ok, versaoPedida } from "@/mocks/lib/http";
import { matrizPorId } from "@/mocks/seed/cursos";
import { resumoUsuario } from "@/mocks/seed/usuarios";

/** Tempo simulado da reexecução manual da pré-análise (o caso continua em análise enquanto isso). */
export const SEGUNDOS_REEXECUCAO = 8;

const TEXTO_MIN = 5;
const TEXTO_MAX = 600;

// ── Regras puras (sem HTTP) ────────────────────────────────────────────────────────────────────

export class ErroAnalise extends Error {}

function mesmoConjunto(a: readonly string[], b: readonly string[]): boolean {
   return a.length === b.length && a.every(x => b.includes(x));
}

/**
 * Decide um item. `origem` = `ANALISTA` quando alterou a sugestão; senão a `fonte` da sugestão
 * (IA ou REGRA); `COORDENACAO` quando quem decide é a coordenação. O motivo só é guardado quando
 * a decisão difere da sugestão.
 */
export function decidirItem(item: ItemAnalise, entrada: DecisaoEntrada, por: UsuarioResumo, em: string, coordenacao: boolean): void {
   const s = item.sugestao;
   const igualSugestao =
      !!s && s.decisao === entrada.valor && (entrada.origemIds === undefined || mesmoConjunto(entrada.origemIds, s.origemIds));
   if (item.estado === "PERGUNTA_ABERTA") {
      if (!coordenacao) throw new ErroAnalise("Há uma pergunta aberta sobre esta disciplina. Retire a pergunta ou aguarde a coordenação.");
      responderItem(item, { decisao: entrada.valor, usarComoRegra: false }, por, em);
      return;
   }
   const origem = coordenacao ? "COORDENACAO" : igualSugestao && s ? s.fonte : "ANALISTA";
   item.estado = coordenacao && item.pergunta?.resposta ? "RESPONDIDO" : "DECIDIDO";
   item.decisao = {
      valor: entrada.valor,
      origemIds: entrada.origemIds ?? item.decisao?.origemIds ?? s?.origemIds ?? [],
      origem,
      motivoAlteracao: igualSugestao ? null : (entrada.motivoAlteracao ?? null),
      por,
      em,
   };
}

/** Aplica uma ação em lote e devolve os ids afetados (para o evento único na linha do tempo). */
export function aplicarLote(a: AnaliseRegistro, entrada: LoteEntrada, por: UsuarioResumo, em: string, coordenacao: boolean): string[] {
   const filtro = entrada.itemIds ? new Set(entrada.itemIds) : null;
   const alvo = (i: ItemAnalise) => !filtro || filtro.has(i.id);
   const afetados: string[] = [];
   switch (entrada.modo) {
      case "ACEITAR_SUGESTOES_ALTA":
         for (const i of a.itens) {
            const s = i.sugestao;
            if (!alvo(i) || i.estado !== "SUGERIDO" || !s || !(IA.loteSomente as readonly string[]).includes(s.confianca)) continue;
            i.estado = "DECIDIDO";
            i.decisao = {
               valor: s.decisao,
               origemIds: s.origemIds,
               origem: coordenacao ? "COORDENACAO" : s.fonte,
               motivoAlteracao: null,
               por,
               em,
            };
            afetados.push(i.id);
         }
         break;
      case "DEFINIR": {
         if (!filtro || filtro.size === 0 || !entrada.decisao) throw new ErroAnalise("Escolha as disciplinas e a decisão.");
         for (const i of a.itens) {
            if (!alvo(i) || i.estado === "PERGUNTA_ABERTA") continue;
            decidirItem(i, { valor: entrada.decisao }, por, em, coordenacao);
            afetados.push(i.id);
         }
         break;
      }
      case "REVERTER":
         if (!filtro || filtro.size === 0) throw new ErroAnalise("Informe as disciplinas a desfazer.");
         for (const i of a.itens) {
            if (!alvo(i) || i.estado !== "DECIDIDO") continue;
            i.estado = "SUGERIDO";
            i.decisao = null;
            afetados.push(i.id);
         }
         break;
   }
   return afetados;
}

export function validarTextoPergunta(texto: string): string | null {
   const t = texto.trim();
   if (t.length < TEXTO_MIN) return `Escreva a pergunta com pelo menos ${TEXTO_MIN} caracteres.`;
   if (t.length > TEXTO_MAX) return `A pergunta pode ter até ${TEXTO_MAX} caracteres.`;
   return null;
}

/** Registra (ou edita) a pergunta: o item fica em PERGUNTA_ABERTA até a coordenação responder. */
export function perguntarItem(item: ItemAnalise, entrada: PerguntaEntrada, por: UsuarioResumo, em: string): void {
   const invalido = validarTextoPergunta(entrada.texto);
   if (invalido) throw new ErroAnalise(invalido);
   if (item.pergunta?.resposta) throw new ErroAnalise("A coordenação já respondeu esta disciplina.");
   item.estado = "PERGUNTA_ABERTA";
   item.decisao = null;
   item.pergunta = { texto: entrada.texto.trim(), decisaoSugerida: entrada.decisaoSugerida, por, em, resposta: null };
}

/** Retira a pergunta antes da resposta: o item volta a ser só sugestão. */
export function retirarPergunta(item: ItemAnalise): void {
   if (!item.pergunta) throw new ErroAnalise("Esta disciplina não tem pergunta aberta.");
   if (item.pergunta.resposta) throw new ErroAnalise("A coordenação já respondeu esta disciplina.");
   item.pergunta = null;
   item.estado = "SUGERIDO";
   item.decisao = null;
}

/** Resposta da coordenação: o item vira RESPONDIDO, com decisão de origem `COORDENACAO`. */
export function responderItem(item: ItemAnalise, entrada: RespostaEntrada, por: UsuarioResumo, em: string): void {
   if (!item.pergunta) throw new ErroAnalise("Não há pergunta da analista sobre esta disciplina.");
   const comentario = entrada.comentario?.trim() || null;
   if (comentario && comentario.length > TEXTO_MAX) throw new ErroAnalise(`O comentário pode ter até ${TEXTO_MAX} caracteres.`);
   item.pergunta.resposta = { decisao: entrada.decisao, comentario, usarComoRegra: entrada.usarComoRegra, por, em };
   item.estado = "RESPONDIDO";
   item.decisao = {
      valor: entrada.decisao,
      origemIds: item.decisao?.origemIds ?? item.sugestao?.origemIds ?? [],
      origem: "COORDENACAO",
      motivoAlteracao: null,
      por,
      em,
   };
}

/**
 * Reexecução da pré-análise: só itens SEM decisão (SUGERIDO) recebem a sugestão nova; decididos,
 * perguntas e respostas ficam como estão. Devolve quantos itens ganharam sugestão diferente.
 */
export function incorporarSugestoes(atual: AnaliseRegistro, nova: AnaliseRegistro): number {
   const porId = new Map(nova.itens.map(i => [i.id, i]));
   let novas = 0;
   for (const i of atual.itens) {
      if (i.estado !== "SUGERIDO") continue;
      const s = porId.get(i.id)?.sugestao ?? null;
      if (!s) continue;
      const igual =
         !!i.sugestao &&
         i.sugestao.decisao === s.decisao &&
         i.sugestao.confianca === s.confianca &&
         mesmoConjunto(i.sugestao.origemIds, s.origemIds);
      if (igual) continue;
      i.sugestao = s;
      novas += 1;
   }
   if (atual.origem.length === 0) atual.origem = nova.origem;
   return novas;
}

/** Prévia de "Trocar matriz": decisões que mapeiam direto, itens a revisar e decisões sem par. */
export function previaMatriz(atual: AnaliseRegistro, alvo: readonly Pick<ItemAnalise, "id">[]) {
   const porId = new Map(atual.itens.map(i => [i.id, i]));
   const idsAlvo = new Set(alvo.map(i => i.id));
   const mapeadas = alvo.filter(t => {
      const i = porId.get(t.id);
      return !!i && decidido(i);
   }).length;
   return {
      mapeadas,
      revisar: alvo.length - mapeadas,
      semCorrespondencia: atual.itens.filter(i => decidido(i) && !idsAlvo.has(i.id)).length,
   };
}

/** Limite por atividade complementar (`REGRAS_ANALISE.atividadeComplementarMaxHoras`). */
export function validarAtividade(ch: number): string | null {
   const max = REGRAS_ANALISE.atividadeComplementarMaxHoras;
   if (!Number.isFinite(ch) || ch <= 0) return "Informe a carga horária da atividade.";
   if (ch > max) return `Cada atividade vale no máximo ${max} h. Registre ${max} h para esta atividade.`;
   return null;
}

/** Conclui a reexecução quando o tempo simulado passou (chamado nas leituras, como o "tick"). */
export function concluirReexecucaoSeVencida(caso: CasoRegistro, a: AnaliseRegistro | null, agora: Date): boolean {
   const p = caso.preAnalise;
   if (!a || caso.etapa === "PRE_ANALISE" || p.status !== "PROCESSANDO" || !p.iniciadaEm) return false;
   if (agora.getTime() - Date.parse(p.iniciadaEm) < SEGUNDOS_REEXECUCAO * 1000) return false;
   caso.flags.preAnaliseFalhou = false;
   const nova = gerarAnalise(caso, a.matrizId, agora);
   const novas = incorporarSugestoes(a, nova);
   a.versao += 1;
   atualizarUsoOrigem(a);
   caso.preAnalise = {
      status: "CONCLUIDA",
      iniciadaEm: p.iniciadaEm,
      concluidaEm: agora.toISOString(),
      modelo: "interno-v3",
      cobertura: cobertura(a),
      avisos: novas > 0 ? ["Há sugestões novas para disciplinas ainda sem decisão. As decisões confirmadas não mudaram."] : [],
      erro: null,
      sugestoesNovas: novas,
   };
   tocar(caso, null, agora);
   registrarEvento(
      caso,
      {
         tipo: "pre_analise.concluida",
         categoria: "SISTEMA",
         autor: { tipo: "IA", id: null, nome: "Pré-análise" },
         titulo: "Pré-análise reexecutada",
         detalhe:
            novas > 0 ? `${plural(novas, "sugestão nova", "sugestões novas")} para disciplinas sem decisão` : "Nenhuma sugestão mudou",
         visivelAoCandidato: false,
         statusEntrega: null,
         em: agora.toISOString(),
      },
      () => valoresDoCaso(caso),
   );
   return true;
}

// ── HTTP ───────────────────────────────────────────────────────────────────────────────────────

interface Preparado {
   ctx: Contexto;
   caso: CasoRegistro;
   a: AnaliseRegistro;
   por: UsuarioResumo;
}

function indisponivel() {
   return erro(404, "ANALISE_INDISPONIVEL", "A análise começa depois da pré-análise");
}

function invalido(mensagem: string) {
   return erro(422, "VALIDACAO", mensagem, { detalhes: [mensagem] });
}

/** 409 quando a versão DA ANÁLISE enviada não é a atual. */
function conflitoDaAnalise(request: Request, caso: CasoRegistro, a: AnaliseRegistro): Response | null {
   const pedida = versaoPedida(request);
   if (pedida === null || pedida === a.versao) return null;
   return erro(409, "VERSAO_DESATUALIZADA", "A análise foi atualizada por outra pessoa.", {
      atualizadoPor: resumoUsuario(caso.ultimoAutorId) ?? { id: "u-sistema", nome: "o sistema" },
   });
}

/** Libera se QUALQUER uma das ações estiver habilitada; senão devolve o 403 da primeira. */
function proibidoSeNenhuma(caso: CasoRegistro, ctx: Contexto, acoes: readonly NomeAcao[]): Response | null {
   let primeiro: Response | null = null;
   for (const acao of acoes) {
      const b = proibidoSeNaoPuder(caso, ctx, acao);
      if (!b) return null;
      primeiro ??= b;
   }
   return primeiro;
}

async function prepararMutacao(
   casoId: string | readonly string[] | undefined,
   request: Request,
   acoes: readonly NomeAcao[],
): Promise<Preparado | Response> {
   const ctx = await preparar();
   const caso = casoOu404(casoId);
   if (caso instanceof Response) return caso;
   const a = analiseDoCaso(caso);
   if (!a) return indisponivel();
   const bloqueio = conflitoDaAnalise(request, caso, a) ?? proibidoSeNenhuma(caso, ctx, acoes);
   if (bloqueio) return bloqueio;
   return { ctx, caso, a, por: { id: ctx.usuario.id, nome: ctx.usuario.nome } };
}

/** Toda mudança: versão da análise +1, uso das origens recalculado e o caso "tocado" (versão do caso +1). */
function registrarMudanca({ ctx, caso, a }: Preparado): void {
   a.versao += 1;
   atualizarUsoOrigem(a);
   tocar(caso, ctx.usuario, ctx.agora);
}

function ehCoordenacao(p: Preparado): boolean {
   return p.caso.etapa === "AGUARDANDO_COORDENACAO";
}

function evento(p: Preparado, tipo: string, titulo: string, detalhe: string | null, dados?: Record<string, unknown>): void {
   registrarEvento(
      p.caso,
      {
         tipo,
         categoria: "DECISAO",
         autor: { tipo: "PESSOA", id: p.ctx.usuario.id, nome: p.ctx.usuario.nome },
         titulo,
         detalhe,
         visivelAoCandidato: false,
         statusEntrega: null,
         em: p.ctx.agora.toISOString(),
         dados,
      },
      () => valoresDoCaso(p.caso),
   );
}

function itemOu404(a: AnaliseRegistro, itemId: string | readonly string[] | undefined): ItemAnalise | Response {
   const item = a.itens.find(i => i.id === itemId);
   return item ?? erro(404, "NAO_ENCONTRADO", "Disciplina não encontrada nesta análise. Recarregue a análise.");
}

function itemDecidido(p: Preparado, item: ItemAnalise) {
   return ok({ item, resumo: calcularResumo(p.a), versao: p.a.versao });
}

function tituloLote(entrada: LoteEntrada, n: number): string {
   if (entrada.modo === "ACEITAR_SUGESTOES_ALTA")
      return `${plural(n, "sugestão de alta confiança confirmada", "sugestões de alta confiança confirmadas")} em lote`;
   if (entrada.modo === "REVERTER") return `${plural(n, "decisão desfeita", "decisões desfeitas")} em lote`;
   return `${plural(n, "disciplina marcada", "disciplinas marcadas")} como ${entrada.decisao ? ROTULO_DECISAO[entrada.decisao] : "decidida"}`;
}

const base = `${API}/casos/:casoId`;

export const handlersAnalise = [
   http.get(`${base}/analise/previa-matriz`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const a = analiseDoCaso(caso);
      if (!a) return indisponivel();
      const matrizId = new URL(request.url).searchParams.get("matriz") ?? "";
      const matriz = matrizPorId(matrizId);
      if (!matriz || matriz.cursoId !== caso.destino.cursoId) return invalido("Escolha uma matriz do curso de destino.");
      return ok(previaMatriz(a, gerarAnalise(caso, matriz.id, ctx.agora).itens));
   }),

   http.get(`${base}/analise`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const a = analiseDoCaso(caso);
      if (!a) return indisponivel();
      concluirReexecucaoSeVencida(caso, a, ctx.agora);
      return ok(montarAnalise(a));
   }),

   http.patch(`${base}/analise`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const { periodoIngresso } = (await request.json()) as { periodoIngresso?: number };
      const periodos = matrizPorId(p.a.matrizId)?.periodos ?? 1;
      if (periodoIngresso !== undefined) {
         if (!Number.isInteger(periodoIngresso) || periodoIngresso < 1 || periodoIngresso > periodos) {
            return invalido(`Escolha um período entre 1 e ${periodos}.`);
         }
         p.a.periodoIngresso = periodoIngresso;
      }
      registrarMudanca(p);
      return ok(montarAnalise(p.a));
   }),

   http.post(`${base}/analise/itens\\:lote`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const entrada = (await request.json()) as LoteEntrada;
      let afetados: string[];
      try {
         afetados = aplicarLote(p.a, entrada, p.por, p.ctx.agora.toISOString(), ehCoordenacao(p));
      } catch (e) {
         if (e instanceof ErroAnalise) return invalido(e.message);
         throw e;
      }
      if (afetados.length > 0) {
         registrarMudanca(p);
         evento(p, "analise.itens_em_lote", tituloLote(entrada, afetados.length), null, {
            modo: entrada.modo,
            quantidade: afetados.length,
            decisao: entrada.decisao ?? null,
         });
      }
      return ok(montarAnalise(p.a));
   }),

   http.put(`${base}/analise/itens/:itemId`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const item = itemOu404(p.a, params.itemId);
      if (item instanceof Response) return item;
      const entrada = (await request.json()) as DecisaoEntrada;
      if (entrada.origemIds?.some(id => !p.a.origem.some(o => o.id === id)))
         return invalido("Disciplina de origem não encontrada no histórico.");
      try {
         decidirItem(item, entrada, p.por, p.ctx.agora.toISOString(), ehCoordenacao(p));
      } catch (e) {
         if (e instanceof ErroAnalise) return invalido(e.message);
         throw e;
      }
      registrarMudanca(p);
      return itemDecidido(p, item);
   }),

   http.put(`${base}/analise/itens/:itemId/pergunta`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["PERGUNTAR_COORDENACAO"]);
      if (p instanceof Response) return p;
      const item = itemOu404(p.a, params.itemId);
      if (item instanceof Response) return item;
      try {
         perguntarItem(item, (await request.json()) as PerguntaEntrada, p.por, p.ctx.agora.toISOString());
      } catch (e) {
         if (e instanceof ErroAnalise) return invalido(e.message);
         throw e;
      }
      registrarMudanca(p);
      return itemDecidido(p, item);
   }),

   http.delete(`${base}/analise/itens/:itemId/pergunta`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["PERGUNTAR_COORDENACAO"]);
      if (p instanceof Response) return p;
      const item = itemOu404(p.a, params.itemId);
      if (item instanceof Response) return item;
      try {
         retirarPergunta(item);
      } catch (e) {
         if (e instanceof ErroAnalise) return invalido(e.message);
         throw e;
      }
      registrarMudanca(p);
      return itemDecidido(p, item);
   }),

   http.put(`${base}/analise/itens/:itemId/resposta`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["RESPONDER_ITEM_COORDENACAO"]);
      if (p instanceof Response) return p;
      const item = itemOu404(p.a, params.itemId);
      if (item instanceof Response) return item;
      const entrada = (await request.json()) as RespostaEntrada;
      try {
         responderItem(item, { ...entrada, usarComoRegra: entrada.usarComoRegra ?? true }, p.por, p.ctx.agora.toISOString());
      } catch (e) {
         if (e instanceof ErroAnalise) return invalido(e.message);
         throw e;
      }
      registrarMudanca(p);
      // O parecer da coordenação vai para as observações do protocolo (decisão de 15/10/2026).
      const resposta = item.pergunta?.resposta;
      if (resposta) {
         registrarEvento(
            p.caso,
            {
               tipo: "coordenacao.parecer",
               categoria: "NOTA",
               autor: { tipo: "PESSOA", id: p.ctx.usuario.id, nome: p.ctx.usuario.nome },
               titulo: `Parecer da coordenação · ${item.disciplina}`,
               detalhe: textoDoParecer(resposta.decisao, resposta.comentario),
               visivelAoCandidato: false,
               statusEntrega: null,
               em: p.ctx.agora.toISOString(),
               dados: { itemId: item.id, decisao: resposta.decisao },
            },
            () => valoresDoCaso(p.caso),
         );
      }
      if (item.pergunta?.resposta?.usarComoRegra) {
         const origens = (item.decisao?.origemIds ?? [])
            .map(id => p.a.origem.find(o => o.id === id))
            .filter((o): o is NonNullable<typeof o> => !!o);
         const deOnde = origens.length
            ? `${origens.map(o => o.nome).join(" + ")} (${origens[0].ies ?? p.caso.origem.iesNome ?? "origem"})`
            : "Sem disciplina de origem";
         evento(
            p,
            "equivalencia.criada",
            "Regra de equivalência criada",
            `${deOnde} → ${item.disciplina}: ${ROTULO_DECISAO[item.pergunta.resposta.decisao]}`,
            {
               itemId: item.id,
               origemIds: item.decisao?.origemIds ?? [],
               decisao: item.pergunta.resposta.decisao,
            },
         );
      }
      return itemDecidido(p, item);
   }),

   http.post(`${base}/analise/atividades-complementares`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const e = (await request.json()) as {
         atividadeId: string;
         ch: number;
         ano?: number;
         periodo?: number;
         inicio?: string;
         fim?: string;
      };
      const problema = validarAtividade(Number(e.ch));
      if (problema) return invalido(problema);
      const nome = ATIVIDADES_COMPLEMENTARES.find(x => x.id === e.atividadeId)?.nome ?? e.atividadeId;
      p.a.atividades.push({
         id: novoId("ac"),
         atividade: nome,
         ch: Number(e.ch),
         ano: e.ano ?? null,
         periodo: e.periodo ?? null,
         inicio: e.inicio ?? null,
         fim: e.fim ?? null,
      });
      registrarMudanca(p);
      return ok(montarAnalise(p.a), 201);
   }),

   http.delete(`${base}/analise/atividades-complementares/:id`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const antes = p.a.atividades.length;
      p.a.atividades = p.a.atividades.filter(x => x.id !== params.id);
      if (p.a.atividades.length === antes) return erro(404, "NAO_ENCONTRADO", "Atividade não encontrada. Recarregue a análise.");
      registrarMudanca(p);
      return ok(montarAnalise(p.a));
   }),

   http.post(`${base}/analise/pratica-extensionista`, async ({ params, request }) => {
      const p = await prepararMutacao(params.casoId, request, ["DECIDIR_ITEM"]);
      if (p instanceof Response) return p;
      const e = (await request.json()) as { ch: number; descricao?: string };
      if (!Number.isFinite(Number(e.ch)) || Number(e.ch) <= 0) return invalido("Informe as horas de prática extensionista.");
      p.a.pratica.push({ id: novoId("pe"), descricao: e.descricao?.trim() || null, ch: Number(e.ch) });
      registrarMudanca(p);
      return ok(montarAnalise(p.a), 201);
   }),

   http.get(`${base}/pre-analise`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      concluirReexecucaoSeVencida(caso, analiseSeDisponivel(caso), ctx.agora);
      return ok(caso.preAnalise);
   }),

   http.post(`${base}/pre-analise`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const bloqueio = proibidoSeNaoPuder(caso, ctx, "REEXECUTAR_PRE_ANALISE");
      if (bloqueio) return bloqueio;
      if (caso.preAnalise.status === "PROCESSANDO") return invalido("A pré-análise já está em andamento. Aguarde cerca de 1 minuto.");
      caso.preAnalise = {
         ...caso.preAnalise,
         status: "PROCESSANDO",
         iniciadaEm: ctx.agora.toISOString(),
         concluidaEm: null,
         avisos: [],
         erro: null,
         sugestoesNovas: null,
      };
      tocar(caso, ctx.usuario, ctx.agora);
      registrarEvento(
         caso,
         {
            tipo: "pre_analise.reexecutada",
            categoria: "SISTEMA",
            autor: { tipo: "PESSOA", id: ctx.usuario.id, nome: ctx.usuario.nome },
            titulo: "Pré-análise reexecutada",
            detalhe: "Decisões confirmadas não serão alteradas",
            visivelAoCandidato: false,
            statusEntrega: null,
            em: ctx.agora.toISOString(),
         },
         () => valoresDoCaso(caso),
      );
      return ok(caso.preAnalise, 202);
   }),
];

/** Lê a análise sem gerar uma nova enquanto a pré-análise inicial não terminou. */
function analiseSeDisponivel(caso: CasoRegistro): AnaliseRegistro | null {
   return caso.etapa === "PRE_ANALISE" ? null : analiseDoCaso(caso);
}
