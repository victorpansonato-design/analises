/**
 * Rendimento da equipe num mês (`GET /gestao/equipe`). Sem `mes`, a API responde o mês corrente.
 * Polling igual ao da fila (`UI.pollingMs`), só com a aba visível.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { UI } from "@/features/casos";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { gestaoKeys } from "@/features/gestao/api/gestao.keys";
import { EquipeSchema } from "@/features/gestao/types/gestao.schema";

export function useEquipe(mes: string | null) {
   return useQuery({
      queryKey: gestaoKeys.equipe(mes),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/gestao/equipe", { params: { mes: mes ?? undefined } });
         return EquipeSchema.parse(data.data);
      },
      placeholderData: keepPreviousData,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}
