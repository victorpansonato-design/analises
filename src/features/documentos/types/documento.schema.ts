/**
 * Checklist de documentos (docs/05 §3.4 e docs/15 §4). Espelha `ItemChecklist` do contrato. O
 * documento chega por qualquer canal (WhatsApp, link, consultor, interno) e a tela funciona igual.
 */
import { z } from "zod";

import { IsoDate } from "@/features/casos";

export const StatusDocumentoSchema = z.enum(["PENDENTE", "RECEBIDO", "ACEITO", "RECUSADO", "DISPENSADO"]);
export type StatusDocumento = z.infer<typeof StatusDocumentoSchema>;

export const CanalDocumentoSchema = z.enum(["WHATSAPP", "LINK", "INTERNO", "CONSULTOR"]);
export type CanalDocumento = z.infer<typeof CanalDocumentoSchema>;

export const MotivoRecusaSchema = z.enum(["ILEGIVEL", "INCOMPLETO", "DOCUMENTO_ERRADO", "SEM_ASSINATURA_OU_CARIMBO", "VENCIDO", "OUTRO"]);
export type MotivoRecusa = z.infer<typeof MotivoRecusaSchema>;

export const ROTULO_STATUS_DOCUMENTO: Record<StatusDocumento, string> = {
   PENDENTE: "Pendente",
   RECEBIDO: "Recebido, a conferir",
   ACEITO: "Aceito",
   RECUSADO: "Recusado",
   DISPENSADO: "Dispensado",
};

export const ROTULO_CANAL: Record<CanalDocumento, string> = {
   WHATSAPP: "WhatsApp",
   LINK: "Link de envio",
   INTERNO: "Sistema interno",
   CONSULTOR: "Anexado pelo consultor",
};

export const ROTULO_MOTIVO_RECUSA: Record<MotivoRecusa, string> = {
   ILEGIVEL: "Ilegível",
   INCOMPLETO: "Incompleto",
   DOCUMENTO_ERRADO: "Documento errado",
   SEM_ASSINATURA_OU_CARIMBO: "Sem assinatura ou carimbo",
   VENCIDO: "Vencido",
   OUTRO: "Outro",
};

export const ArquivoSchema = z.object({
   id: z.string(),
   nome: z.string(),
   mime: z.string(),
   tamanho: z.number().int(),
   canal: CanalDocumentoSchema,
   recebidoEm: IsoDate,
});
export type Arquivo = z.infer<typeof ArquivoSchema>;

export const ItemChecklistSchema = z.object({
   id: z.string(),
   nome: z.string(),
   obrigatorio: z.boolean(),
   status: StatusDocumentoSchema,
   motivoRecusa: z.string().nullable(),
   legibilidade: z.enum(["BOA", "DUVIDOSA", "RUIM"]).nullable(),
   arquivos: z.array(ArquivoSchema),
   proximoLembreteEm: IsoDate.nullable(),
   /** Item sensível (RG/CNH): só nome do arquivo para quem não pode ver (docs/04 §3). */
   sensivel: z.boolean().optional(),
});
export type ItemChecklist = z.infer<typeof ItemChecklistSchema>;

export const VisualizacaoSchema = z.object({ url: z.string(), expiraEm: IsoDate, mime: z.string() });
export type Visualizacao = z.infer<typeof VisualizacaoSchema>;

export interface AvaliacaoDocumento {
   status: "ACEITO" | "RECUSADO" | "DISPENSADO";
   motivoRecusa?: MotivoRecusa;
   texto?: string;
}
