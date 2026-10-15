/** Notificações in-app (docs/12 H7.2). Espelha `Notificacao` do contrato. */
import { z } from "zod";

import { IsoDate } from "@/features/casos";

export const TipoNotificacaoSchema = z.enum([
   "ATRIBUIDO",
   "PERGUNTA_COORDENACAO",
   "RESPOSTA_COORDENACAO",
   "MENCAO",
   "SLA_ATENCAO",
   "SLA_ESTOURADO",
   "MENSAGEM_CANDIDATO",
   "FALHA_ENVIO",
]);
export type TipoNotificacao = z.infer<typeof TipoNotificacaoSchema>;

export const NotificacaoSchema = z.object({
   id: z.string(),
   tipo: TipoNotificacaoSchema,
   casoId: z.string(),
   titulo: z.string(),
   detalhe: z.string(),
   em: IsoDate,
   lida: z.boolean(),
});
export type Notificacao = z.infer<typeof NotificacaoSchema>;
