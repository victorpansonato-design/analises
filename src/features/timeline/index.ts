/**
 * API PÚBLICA do slice `timeline`: linha do tempo única do caso e notas internas com @menção.
 *
 * - `HistoricoCaso`: painel permanente da equipe (observações em destaque, mensagens e registros
 *   compactos; seleção na URL `?hist=`).
 * - Regras puras de filtro, ordem, paginação e @menção (o backend simulado usa as mesmas).
 */
export * from "@/features/timeline/types/timeline.schema";

export { timelineKeys } from "@/features/timeline/api/timeline.keys";
export { useAdicionarNota } from "@/features/timeline/api/timeline.mutations";
export { useTimeline } from "@/features/timeline/api/timeline.queries";
export { HistoricoCaso, type HistoricoCasoProps } from "@/features/timeline/components/historico-caso";
export { ObservacoesCaso } from "@/features/timeline/components/observacoes-caso";
export {
   CATEGORIA_DO_FILTRO,
   TIMELINE_PAGINA,
   TOM_STATUS_ENTREGA,
   botoesDoEvento,
   direcaoMensagem,
   ehMensagemWhatsapp,
   filtrarEventos,
   lerFiltro,
   ordenarRecentesPrimeiro,
   paginarEventos,
   rotuloAutor,
} from "@/features/timeline/domain/eventos";
export {
   consultaMencao,
   extrairMencoes,
   inserirMencao,
   segmentarMencoes,
   sugerirPessoas,
   type PessoaMencionavel,
   type TrechoNota,
} from "@/features/timeline/domain/mencoes";
