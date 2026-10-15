/**
 * Linha do tempo paginada por cursor (mais recente primeiro). Faz polling enquanto a aba está
 * visível: resposta do candidato pelo WhatsApp chega por webhook no backend e aparece sozinha.
 */
import { useInfiniteQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { UI } from "@/features/casos";

import { timelineKeys } from "@/features/timeline/api/timeline.keys";
import { PaginaTimelineSchema, type FiltroTimeline } from "@/features/timeline/types/timeline.schema";

export function useTimeline(casoId: string, filtro: FiltroTimeline, { enabled = true }: { enabled?: boolean } = {}) {
   return useInfiniteQuery({
      enabled,
      queryKey: timelineKeys.lista(casoId, filtro),
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/timeline`, {
            params: { filtro, cursor: pageParam ?? undefined },
         });
         return PaginaTimelineSchema.parse(data.data);
      },
      getNextPageParam: ultima => ultima.proximoCursor,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}
