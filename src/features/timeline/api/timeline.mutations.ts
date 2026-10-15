/**
 * Nota interna com @menções. Nota não muda o caso (nem a versão): só a linha do tempo recarrega.
 * Quem é mencionado recebe notificação no sino (o backend cuida disso).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { avisarErro } from "@/lib/notify";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { timelineKeys } from "@/features/timeline/api/timeline.keys";
import { EventoTimelineSchema, type NovaNota } from "@/features/timeline/types/timeline.schema";

export function useAdicionarNota(casoId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async (nota: NovaNota) => {
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${casoId}/notas`, nota);
         return EventoTimelineSchema.parse(data.data);
      },
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: timelineKeys.doCaso(casoId) }),
      onError: error => avisarErro(error, "Não foi possível salvar a nota"),
   });
}
