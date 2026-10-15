/**
 * Query keys da linha do tempo. Toda chave carrega o `casoId` (convenção de `invalidarTudoDoCaso`).
 */
import type { FiltroTimeline } from "@/features/timeline/types/timeline.schema";

export const timelineKeys = {
   all: ["timeline"] as const,
   doCaso: (casoId: string) => [...timelineKeys.all, casoId] as const,
   lista: (casoId: string, filtro: FiltroTimeline) => [...timelineKeys.doCaso(casoId), filtro] as const,
};
