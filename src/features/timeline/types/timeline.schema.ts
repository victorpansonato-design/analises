/**
 * Linha do tempo única do caso (docs/05 §3.4, aba "Conversa e histórico"). Genérica: recebe
 * eventos de qualquer processo; não sabe o que é disciplina. Espelha `EventoTimeline` do contrato.
 */
import { z } from "zod";

import { IsoDate } from "@/features/casos";

export const CategoriaEventoSchema = z.enum(["NOTA", "MENSAGEM", "SISTEMA", "DECISAO"]);
export type CategoriaEvento = z.infer<typeof CategoriaEventoSchema>;

export const FILTROS_TIMELINE = ["TUDO", "NOTAS", "MENSAGENS", "SISTEMA", "DECISOES"] as const;
export type FiltroTimeline = (typeof FILTROS_TIMELINE)[number];

export const ROTULO_FILTRO_TIMELINE: Record<FiltroTimeline, string> = {
   TUDO: "Tudo",
   NOTAS: "Notas",
   MENSAGENS: "Mensagens",
   SISTEMA: "Sistema",
   DECISOES: "Decisões",
};

export const StatusEntregaSchema = z.enum(["ENFILEIRADA", "ENVIADA", "ENTREGUE", "LIDA", "FALHOU"]);
export type StatusEntrega = z.infer<typeof StatusEntregaSchema>;

export const ROTULO_STATUS_ENTREGA: Record<StatusEntrega, string> = {
   ENFILEIRADA: "Na fila de envio",
   ENVIADA: "Enviada",
   ENTREGUE: "Entregue",
   LIDA: "Lida",
   FALHOU: "Falhou",
};

export const AutorEventoSchema = z.object({
   tipo: z.enum(["PESSOA", "SISTEMA", "CANDIDATO", "IA"]),
   id: z.string().nullable(),
   nome: z.string().nullable(),
});

export const EventoTimelineSchema = z.object({
   id: z.string(),
   tipo: z.string(),
   categoria: CategoriaEventoSchema,
   em: IsoDate,
   autor: AutorEventoSchema,
   titulo: z.string(),
   detalhe: z.string().nullable(),
   visivelAoCandidato: z.boolean(),
   statusEntrega: StatusEntregaSchema.nullable(),
   dados: z.record(z.string(), z.unknown()).optional(),
});
export type EventoTimeline = z.infer<typeof EventoTimelineSchema>;

export const PaginaTimelineSchema = z.object({ itens: z.array(EventoTimelineSchema), proximoCursor: z.string().nullable() });

export interface NovaNota {
   texto: string;
   mencoes: string[];
}
