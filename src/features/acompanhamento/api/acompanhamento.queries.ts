/**
 * Acompanhamento público (`GET /publico/acompanhamento/{token}`): sem sessão, atualizado sozinho
 * enquanto a página está aberta e ao voltar para a aba.
 */
import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { ATUALIZAR_ACOMPANHAMENTO_MS } from "@/features/acompanhamento/domain/acompanhamento";
import { AcompanhamentoPublicoSchema } from "@/features/acompanhamento/types/acompanhamento.schema";

export const acompanhamentoKeys = {
   all: ["acompanhamento"] as const,
   publico: (token: string) => [...acompanhamentoKeys.all, token] as const,
};

export function useAcompanhamento(token: string) {
   return useQuery({
      queryKey: acompanhamentoKeys.publico(token),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/publico/acompanhamento/${encodeURIComponent(token)}`);
         return AcompanhamentoPublicoSchema.parse(data.data);
      },
      enabled: token.length > 0,
      staleTime: 0,
      refetchInterval: ATUALIZAR_ACOMPANHAMENTO_MS,
      refetchIntervalInBackground: false,
      refetchOnWindowFocus: true,
   });
}
