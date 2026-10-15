/** Filas operacionais conhecidas pela equipe. Agrupam etapas sem alterar o processo. */
import type { Etapa } from "@/features/casos/types/caso.schema";
import type { NomeAcao } from "@/features/casos/domain/acoes";

export const FILAS = [
   { id: "NOVAS", nome: "Novas análises", tom: "novas", etapas: ["RASCUNHO", "PRE_ANALISE"] },
   { id: "AGUARDANDO_DOCUMENTOS", nome: "Aguardando documentos", tom: "documentos", etapas: ["AGUARDANDO_DOCUMENTOS"] },
   { id: "EM_ANALISE", nome: "Em análise", tom: "analise", etapas: ["EM_ANALISE"] },
   { id: "AGUARDANDO_COORDENACAO", nome: "Em análise coordenador", tom: "coordenacao", etapas: ["AGUARDANDO_COORDENACAO"] },
   { id: "AJUSTE_POS_COORDENACAO", nome: "Entregue pelo coordenador", tom: "entregues", etapas: ["AJUSTE_POS_COORDENACAO"] },
   {
      id: "LIBERADAS",
      nome: "Liberadas matrícula",
      tom: "liberadas",
      etapas: ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
   },
   { id: "CONCLUIDAS", nome: "Concluídas", tom: "concluidas", etapas: ["MATRICULADO", "CONCLUIDO", "PERDIDO", "CANCELADO"] },
   { id: "TODAS", nome: "Todas", tom: "todas", etapas: [] },
] as const satisfies readonly { id: string; nome: string; tom: string; etapas: readonly Etapa[] }[];

export function etapasDaFila(id: string | null): readonly Etapa[] {
   return FILAS.find(f => f.id === id)?.etapas ?? (id ? [id as Etapa] : []);
}

export function nomeDaFila(id: string | null): string {
   return FILAS.find(f => f.id === id)?.nome ?? "Todas as análises";
}

export type TomFila = (typeof FILAS)[number]["tom"];

export function tomDaEtapa(etapa: Etapa): TomFila {
   return FILAS.find(f => (f.etapas as readonly Etapa[]).includes(etapa))?.tom ?? "todas";
}

const TOM_ACAO: Partial<Record<NomeAcao, TomFila>> = {
   CONCLUIR_ANALISE: "liberadas",
   DOCUMENTOS_COMPLETOS: "liberadas",
   EFETIVAR_MATRICULA: "liberadas",
   ENVIAR_PROPOSTA: "liberadas",
   ENVIAR_MENSAGEM: "liberadas",
   SOLICITAR_DOCUMENTO: "liberadas",
   ENVIAR_COORDENACAO: "coordenacao",
   RESPONDER_ITEM_COORDENACAO: "coordenacao",
   RESPONDER_COORDENACAO: "entregues",
   ADICIONAR_NOTA: "todas",
   EXPORTAR: "todas",
   CANCELAR: "documentos",
   ENCERRAR_PERDIDO: "documentos",
};

export function tomDaAcao(acao: NomeAcao): TomFila {
   return TOM_ACAO[acao] ?? "novas";
}
