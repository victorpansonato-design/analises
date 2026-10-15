/**
 * API PÚBLICA do slice `documentos`: checklist, visualizador, aceite/recusa e histórico interno.
 *
 * - `DocumentosTab`: a aba Documentos do caso.
 * - Regras puras do checklist e da mensagem de recusa (o backend simulado usa as mesmas).
 */
export * from "@/features/documentos/types/documento.schema";

export { documentosKeys } from "@/features/documentos/api/documentos.keys";
export { useDocumentos } from "@/features/documentos/api/documentos.queries";
export { DocumentosTab, type DocumentosTabProps } from "@/features/documentos/components/documentos-tab";
export {
   ANEXO,
   AVISO_LEGIBILIDADE,
   ID_HISTORICO_INTERNO,
   TOM_STATUS_DOCUMENTO,
   contarChecklist,
   itensParaLembrar,
   motivoArquivoInvalido,
   motivoNaoAnexar,
   motivoNaoAvaliar,
   usaHistoricoInterno,
   type AvaliacaoStatus,
   type ContagemChecklist,
} from "@/features/documentos/domain/checklist";
export {
   EXPLICACAO_RECUSA,
   TEMPLATE_RECUSA,
   TEXTO_RECUSA_MAX,
   motivoRecusaInvalido,
   textoRecusa,
   type DadosRecusa,
} from "@/features/documentos/domain/recusa";
