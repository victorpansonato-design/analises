/**
 * Máquina de estados do caso (docs/03-maquina-de-estados.md). Código PURO: sem React, sem fetch,
 * sem Date.now() escondido (o relógio entra por parâmetro). Usada pela UI (desenhar ações e explicar
 * bloqueios) e pelos handlers do MSW (simular o backend). O backend real é a autoridade.
 */
import { PAPEIS, type Papel } from "@/features/sessao";

import type { AcaoTransicao, Etapa, SubtipoRetorno, Tipo } from "@/features/casos/types/caso.schema";
import { ETAPAS_ABERTAS, terminaNaAnalise } from "@/features/casos/types/caso.schema";

// ── Contexto ───────────────────────────────────────────────────────────────────────────────────

/** Fatos sobre o caso que as guardas precisam. A API/mocks montam isso a partir do detalhe. */
export interface CasoMaquina {
   etapa: Etapa;
   etapaAnterior: Etapa | null;
   tipo: Tipo;
   subtipo: SubtipoRetorno | null;
   estudouForaNoPeriodo: boolean | null;
   responsavelId: string | null;
   consultorId: string | null;
   cursoDestinoId: string;
   // dados mínimos do protocolo
   cpfValido: boolean;
   celularValido: boolean;
   destinoDefinido: boolean;
   possuiCasoAtivoDuplicado: boolean;
   // documentos
   checklistCompleto: boolean;
   // análise
   itensSemDecisao: number;
   perguntasAbertas: number;
   periodoIngressoDefinido: boolean;
   horasComplementaresValidas: boolean;
   origemRepetidaInvalida: boolean;
   // matrícula
   resumoCongelado: boolean;
   resumoDoCicloVigente: boolean;
   condicaoFinanceiraCarregada: boolean;
   optInWhatsapp: boolean;
   aceiteRegistrado: boolean;
   matrizDoCicloMudou: boolean;
}

export type Ator = { tipo: "SISTEMA" } | { tipo: "PESSOA"; id: string; papeis: readonly Papel[]; cursosCoordenados: readonly string[] };

export interface PayloadTransicao {
   motivo?: string;
   texto?: string;
   retomarEm?: string; // ISO
   /** Aceite do candidato registrado junto com a efetivação (canal + quando). */
   aceite?: { canal: string; em: string };
   /** Reabertura: para a equipe de análises (padrão) ou para a coordenação, com as disciplinas contestadas. */
   destinoReanalise?: "ANALISE" | "COORDENACAO";
   itemIds?: readonly string[];
}

export interface ContextoTransicao {
   caso: CasoMaquina;
   ator: Ator;
   payload?: PayloadTransicao;
   agora: Date;
}

// ── Definição das transições ───────────────────────────────────────────────────────────────────

interface Guarda {
   id: string;
   /** Mensagem pronta para a UI quando a guarda falha (pt-BR, sentence case). */
   mensagem: (ctx: ContextoTransicao) => string;
   ok: (ctx: ContextoTransicao) => boolean;
}

interface Transicao {
   acao: AcaoTransicao;
   de: readonly Etapa[];
   para: (ctx: ContextoTransicao) => Etapa;
   /** Papéis humanos que podem executar. Vazio = só o sistema. */
   papeis: readonly Papel[];
   permiteSistema: boolean;
   /** Pessoa precisa informar motivo (o sistema não). */
   exigeMotivo?: boolean;
   /** Precisa de aceite registrado, que pode chegar na própria transição (como o motivo). */
   exigeAceite?: boolean;
   guardas: readonly Guarda[];
}

export const precisaDocumentosExternos = (c: Pick<CasoMaquina, "tipo" | "estudouForaNoPeriodo">): boolean =>
   c.tipo === "TRANSFERENCIA_EXTERNA" ||
   c.tipo === "PORTADOR_DIPLOMA" ||
   c.tipo === "APROVEITAMENTO_ESTUDOS" ||
   (c.tipo === "RETORNO" && c.estudouForaNoPeriodo === true);

const g = {
   cpf: { id: "cpf", mensagem: () => "Informe um CPF válido", ok: ({ caso }) => caso.cpfValido },
   celular: { id: "celular", mensagem: () => "Informe um celular válido", ok: ({ caso }) => caso.celularValido },
   destino: { id: "destino", mensagem: () => "Defina curso, turno e modalidade de destino", ok: ({ caso }) => caso.destinoDefinido },
   semDuplicado: {
      id: "semDuplicado",
      mensagem: () => "Já existe um caso ativo deste candidato para este curso",
      ok: ({ caso }) => !caso.possuiCasoAtivoDuplicado,
   },
   checklist: {
      id: "checklist",
      mensagem: () => "Ainda há documentos obrigatórios não aceitos",
      ok: ({ caso }) => caso.checklistCompleto,
   },
   temPergunta: {
      id: "temPergunta",
      mensagem: () => "Crie ao menos uma pergunta à coordenação em um item da análise",
      ok: ({ caso }) => caso.perguntasAbertas > 0,
   },
   semPerguntaAberta: {
      id: "semPerguntaAberta",
      mensagem: ({ caso }) =>
         caso.perguntasAbertas === 1 ? "Falta responder 1 pergunta" : `Faltam responder ${caso.perguntasAbertas} perguntas`,
      ok: ({ caso }) => caso.perguntasAbertas === 0,
   },
   tudoDecidido: {
      id: "tudoDecidido",
      mensagem: ({ caso }) =>
         caso.itensSemDecisao === 1 ? "Falta 1 disciplina sem decisão" : `Faltam ${caso.itensSemDecisao} disciplinas sem decisão`,
      ok: ({ caso }) => caso.itensSemDecisao === 0,
   },
   periodo: {
      id: "periodo",
      mensagem: () => "Defina o período de ingresso",
      ok: ({ caso }) => caso.periodoIngressoDefinido,
   },
   horas: {
      id: "horas",
      mensagem: () => "Há atividade complementar acima do limite de horas",
      ok: ({ caso }) => caso.horasComplementaresValidas,
   },
   origemRepetida: {
      id: "origemRepetida",
      mensagem: () => "Uma disciplina de origem está sustentando mais de uma dispensa",
      ok: ({ caso }) => !caso.origemRepetidaInvalida,
   },
   resumo: {
      id: "resumo",
      mensagem: () => "A análise ainda não foi concluída",
      ok: ({ caso }) => caso.resumoCongelado,
   },
   financeiro: {
      id: "financeiro",
      mensagem: () => "A condição financeira ainda não foi carregada",
      ok: ({ caso }) => caso.condicaoFinanceiraCarregada,
   },
   optIn: {
      id: "optIn",
      mensagem: () => "O candidato não autorizou contato pelo WhatsApp",
      ok: ({ caso }) => caso.optInWhatsapp,
   },
   aceite: {
      id: "aceite",
      mensagem: () => "Registre o aceite do candidato antes de efetivar",
      ok: ({ caso }) => caso.aceiteRegistrado,
   },
   contestadasParaCoordenacao: {
      id: "contestadasParaCoordenacao",
      mensagem: () => "Marque as disciplinas contestadas: a coordenação recebe só elas",
      ok: ({ payload }) => payload?.destinoReanalise !== "COORDENACAO" || (payload.itemIds?.length ?? 0) > 0,
   },
   retomarNoFuturo: {
      id: "retomarNoFuturo",
      mensagem: () => "Escolha uma data de retomada no futuro",
      ok: ({ payload, agora }) => !!payload?.retomarEm && new Date(payload.retomarEm).getTime() > agora.getTime(),
   },
} satisfies Record<string, Guarda>;

const ABERTAS_SEM_RASCUNHO = ETAPAS_ABERTAS.filter(e => e !== "RASCUNHO");

export const TRANSICOES: readonly Transicao[] = [
   {
      acao: "ENVIAR_PROTOCOLO",
      de: ["RASCUNHO"],
      para: ({ caso }) => (precisaDocumentosExternos(caso) ? "AGUARDANDO_DOCUMENTOS" : "PRE_ANALISE"),
      papeis: PAPEIS,
      permiteSistema: false,
      guardas: [g.cpf, g.celular, g.destino, g.semDuplicado],
   },
   {
      acao: "DOCUMENTOS_COMPLETOS",
      de: ["AGUARDANDO_DOCUMENTOS"],
      para: () => "PRE_ANALISE",
      papeis: PAPEIS,
      permiteSistema: true,
      exigeMotivo: true, // só para pessoa (override manual)
      guardas: [g.checklist],
   },
   { acao: "CONCLUIR_PRE_ANALISE", de: ["PRE_ANALISE"], para: () => "EM_ANALISE", papeis: [], permiteSistema: true, guardas: [] },
   { acao: "FALHAR_PRE_ANALISE", de: ["PRE_ANALISE"], para: () => "EM_ANALISE", papeis: [], permiteSistema: true, guardas: [] },
   {
      acao: "ENVIAR_COORDENACAO",
      de: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"],
      para: () => "AGUARDANDO_COORDENACAO",
      papeis: PAPEIS,
      permiteSistema: false,
      guardas: [g.temPergunta],
   },
   {
      acao: "RESPONDER_COORDENACAO",
      de: ["AGUARDANDO_COORDENACAO"],
      para: () => "AJUSTE_POS_COORDENACAO",
      papeis: PAPEIS,
      permiteSistema: false,
      guardas: [g.semPerguntaAberta],
   },
   {
      acao: "CONCLUIR_ANALISE",
      de: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"],
      // Aproveitamento de estudos termina aqui: o aluno já é aluno, não há proposta nem matrícula.
      para: ({ caso }) => (terminaNaAnalise(caso.tipo) ? "CONCLUIDO" : "PRONTO_PARA_MATRICULA"),
      papeis: PAPEIS,
      permiteSistema: false,
      guardas: [g.tudoDecidido, g.semPerguntaAberta, g.periodo, g.horas, g.origemRepetida],
   },
   {
      acao: "ENVIAR_PROPOSTA",
      de: ["PRONTO_PARA_MATRICULA"],
      para: () => "PROPOSTA_ENVIADA",
      papeis: PAPEIS,
      permiteSistema: false,
      guardas: [g.resumo, g.financeiro, g.celular, g.optIn],
   },
   {
      acao: "REGISTRAR_RESPOSTA",
      de: ["PROPOSTA_ENVIADA"],
      para: () => "EM_NEGOCIACAO",
      papeis: PAPEIS,
      permiteSistema: true,
      guardas: [],
   },
   {
      acao: "EFETIVAR_MATRICULA",
      de: ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
      para: () => "MATRICULADO",
      papeis: PAPEIS,
      permiteSistema: false,
      exigeAceite: true,
      guardas: [g.resumo],
   },
   { acao: "MARCAR_SEM_RETORNO", de: ["PROPOSTA_ENVIADA"], para: () => "PERDIDO", papeis: [], permiteSistema: true, guardas: [] },
   {
      acao: "ENCERRAR_PERDIDO",
      de: ABERTAS_SEM_RASCUNHO,
      para: () => "PERDIDO",
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [],
   },
   {
      acao: "CANCELAR",
      de: ETAPAS_ABERTAS,
      para: () => "CANCELADO",
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [],
   },
   {
      acao: "ADIAR",
      de: ["AGUARDANDO_DOCUMENTOS", "PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
      para: () => "ADIADO",
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [g.retomarNoFuturo],
   },
   {
      acao: "RETOMAR",
      de: ["ADIADO"],
      para: ({ caso }) => {
         if (caso.matrizDoCicloMudou && caso.resumoCongelado) return "PRE_ANALISE";
         return caso.etapaAnterior ?? "EM_ANALISE";
      },
      papeis: PAPEIS,
      permiteSistema: true,
      guardas: [],
   },
   {
      acao: "SOLICITAR_REANALISE",
      // Depois da proposta (o aluno contestou dispensas) e no aproveitamento já concluído.
      de: ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "CONCLUIDO"],
      para: ({ payload }) => (payload?.destinoReanalise === "COORDENACAO" ? "AGUARDANDO_COORDENACAO" : "EM_ANALISE"),
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [g.contestadasParaCoordenacao],
   },
   {
      acao: "REABRIR",
      de: ["PERDIDO", "CANCELADO"],
      para: ({ caso }) => {
         if (caso.resumoCongelado && caso.resumoDoCicloVigente && !terminaNaAnalise(caso.tipo)) return "PRONTO_PARA_MATRICULA";
         if (caso.checklistCompleto || !precisaDocumentosExternos(caso)) return "EM_ANALISE";
         return "AGUARDANDO_DOCUMENTOS";
      },
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [],
   },
   {
      acao: "ALTERAR_DESTINO",
      de: ABERTAS_SEM_RASCUNHO,
      para: ({ caso }) => (caso.etapa === "AGUARDANDO_DOCUMENTOS" ? "AGUARDANDO_DOCUMENTOS" : "PRE_ANALISE"),
      papeis: PAPEIS,
      permiteSistema: false,
      exigeMotivo: true,
      guardas: [g.destino],
   },
];

const POR_ACAO = new Map(TRANSICOES.map(t => [t.acao, t]));

// ── Avaliação ──────────────────────────────────────────────────────────────────────────────────

export interface AvaliacaoAcao {
   acao: AcaoTransicao;
   /** A ação existe para a etapa atual e o ator tem o papel (aparece na interface). */
   visivel: boolean;
   /** Todas as regras passam (pode executar agora). */
   habilitada: boolean;
   /** Por que não está habilitada (pronto para a UI). */
   motivos: string[];
   exigeMotivo: boolean;
   /** Etapa resultante, se habilitada. */
   para: Etapa | null;
}

function atorPermite(t: Transicao, ctx: ContextoTransicao): { ok: boolean; motivo?: string } {
   const { ator } = ctx;
   if (ator.tipo === "SISTEMA") return t.permiteSistema ? { ok: true } : { ok: false, motivo: "Ação exclusiva de pessoas" };

   // Acesso comum: pessoas executam ações humanas; etapa e guardas continuam obrigatórias.
   if (t.papeis.length === 0) return { ok: false, motivo: "Ação exclusiva do sistema" };

   return { ok: true };
}

export function avaliarAcao(acao: AcaoTransicao, ctx: ContextoTransicao): AvaliacaoAcao {
   const t = POR_ACAO.get(acao);
   const base: AvaliacaoAcao = { acao, visivel: false, habilitada: false, motivos: [], exigeMotivo: false, para: null };
   if (!t || !t.de.includes(ctx.caso.etapa)) return base;

   const exigeMotivo = ctx.ator.tipo === "PESSOA" && !!t.exigeMotivo;
   const permissao = atorPermite(t, ctx);
   if (!permissao.ok) return { ...base, motivos: [permissao.motivo ?? "Não permitido"], exigeMotivo };

   // Motivo e aceite ausentes não desabilitam: a UI abre o modal que pede os dois (ver `transicionar`).
   const motivos = t.guardas.filter(gd => !gd.ok(ctx)).map(gd => gd.mensagem(ctx));
   const habilitada = motivos.length === 0;
   return { ...base, visivel: true, habilitada, motivos, exigeMotivo, para: habilitada ? t.para(ctx) : null };
}

/** Ações de transição que fazem sentido mostrar para este ator nesta etapa (visíveis), com estado. */
export function acoesDisponiveis(ctx: Omit<ContextoTransicao, "payload">): AvaliacaoAcao[] {
   return TRANSICOES.map(t => avaliarAcao(t.acao, ctx)).filter(a => a.visivel);
}

// ── Execução ───────────────────────────────────────────────────────────────────────────────────

export class ErroTransicao extends Error {
   readonly motivos: string[];
   constructor(acao: AcaoTransicao, motivos: string[]) {
      super(`Transição ${acao} recusada: ${motivos.join("; ")}`);
      this.name = "ErroTransicao";
      this.motivos = motivos;
   }
}

export interface ResultadoTransicao {
   de: Etapa;
   para: Etapa;
   etapaAnterior: Etapa;
   etapaDesde: string; // ISO
   evento: { tipo: string; acao: AcaoTransicao; motivo?: string; texto?: string };
}

const EVENTO_POR_ACAO: Record<AcaoTransicao, string> = {
   ENVIAR_PROTOCOLO: "caso.criado",
   DOCUMENTOS_COMPLETOS: "documentos.completos",
   CONCLUIR_PRE_ANALISE: "pre_analise.concluida",
   FALHAR_PRE_ANALISE: "pre_analise.falhou",
   ENVIAR_COORDENACAO: "coordenacao.enviada",
   RESPONDER_COORDENACAO: "coordenacao.concluida",
   CONCLUIR_ANALISE: "analise.concluida",
   ENVIAR_PROPOSTA: "proposta.enviada",
   REGISTRAR_RESPOSTA: "proposta.respondida",
   EFETIVAR_MATRICULA: "matricula.efetivada",
   MARCAR_SEM_RETORNO: "caso.perdido",
   ENCERRAR_PERDIDO: "caso.perdido",
   CANCELAR: "caso.cancelado",
   ADIAR: "caso.adiado",
   RETOMAR: "caso.retomado",
   SOLICITAR_REANALISE: "caso.reanalise_solicitada",
   REABRIR: "caso.reaberto",
   ALTERAR_DESTINO: "caso.destino_alterado",
};

export function transicionar(acao: AcaoTransicao, ctx: ContextoTransicao): ResultadoTransicao {
   const av = avaliarAcao(acao, ctx);
   if (!av.visivel || !av.habilitada || !av.para) {
      throw new ErroTransicao(acao, av.motivos.length ? av.motivos : ["Ação indisponível nesta etapa"]);
   }
   if (av.exigeMotivo && !ctx.payload?.motivo) throw new ErroTransicao(acao, ["Informe o motivo"]);
   const t = POR_ACAO.get(acao);
   if (t?.exigeAceite && !ctx.caso.aceiteRegistrado && !ctx.payload?.aceite) throw new ErroTransicao(acao, [g.aceite.mensagem()]);
   const motivo = acao === "MARCAR_SEM_RETORNO" ? "SEM_RETORNO" : ctx.payload?.motivo;
   return {
      de: ctx.caso.etapa,
      para: av.para,
      etapaAnterior: ctx.caso.etapa,
      etapaDesde: ctx.agora.toISOString(),
      evento: { tipo: EVENTO_POR_ACAO[acao], acao, motivo, texto: ctx.payload?.texto },
   };
}

/** Etapas que o tipo do caso percorre (para desenhar a Jornada). */
export function etapasDaJornada(caso: Pick<CasoMaquina, "tipo" | "estudouForaNoPeriodo">): Etapa[] {
   const docs = precisaDocumentosExternos(caso);
   if (terminaNaAnalise(caso.tipo))
      return [...(docs ? (["AGUARDANDO_DOCUMENTOS"] as const) : []), "PRE_ANALISE", "EM_ANALISE", "AGUARDANDO_COORDENACAO", "CONCLUIDO"];
   return [
      ...(docs ? (["AGUARDANDO_DOCUMENTOS"] as const) : []),
      "PRE_ANALISE",
      "EM_ANALISE",
      "AGUARDANDO_COORDENACAO",
      "PRONTO_PARA_MATRICULA",
      "PROPOSTA_ENVIADA",
      "MATRICULADO",
   ];
}
