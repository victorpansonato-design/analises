/**
 * Mensagens ao candidato (docs/08). O front NUNCA fala com o Blip: pede ao backend "envie o
 * template X para o caso Y". Só templates aprovados, com prévia exatamente como o candidato verá;
 * variável vazia bloqueia o envio com explicação.
 */
import { z } from "zod";

import { EtapaSchema } from "@/features/casos";

export const TemplateMensagemSchema = z.object({
   id: z.string(),
   nome: z.string(),
   descricao: z.string(),
   variaveis: z.array(z.string()),
   etapas: z.array(EtapaSchema).optional(),
});
export type TemplateMensagem = z.infer<typeof TemplateMensagemSchema>;

export const PreviaMensagemSchema = z.object({
   texto: z.string(),
   variaveisFaltando: z.array(z.string()),
   /** Botões de resposta rápida do template (WhatsApp). */
   botoes: z.array(z.string()).optional(),
});
export type PreviaMensagem = z.infer<typeof PreviaMensagemSchema>;
