/**
 * Leitura do painel (`GET /indicadores`). Funil e indicadores vêm da MESMA resposta para nunca
 * discordarem. Polling igual ao da fila (`UI.pollingMs`), só com a aba visível.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { UI } from "@/features/casos";
import { indicadoresKeys } from "@/features/indicadores/api/indicadores.keys";
import { IndicadoresSchema, type FiltrosIndicadores } from "@/features/indicadores/types/indicadores.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

export function useIndicadores(filtros: FiltrosIndicadores) {
   return useQuery({
      queryKey: indicadoresKeys.painel(filtros),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/indicadores", {
            params: {
               ciclo: filtros.ciclo ?? undefined,
               tipo: filtros.tipo ?? undefined,
               curso: filtros.curso ?? undefined,
               modalidade: filtros.modalidade ?? undefined,
            },
         });
         return IndicadoresSchema.parse(data.data);
      },
      placeholderData: keepPreviousData,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}
