import { MeSchema } from "@/features/sessao/types/sessao.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";
import { useQuery } from "@tanstack/react-query";

export const sessaoKeys = {
   all: ["sessao"] as const,
   me: () => [...sessaoKeys.all, "me"] as const,
};

/** Usuário logado com papéis e escopo. Muda pouco: só recarrega ao trocar de papel (mocks). */
export function useMe() {
   return useQuery({
      queryKey: sessaoKeys.me(),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/me");
         return MeSchema.parse(data.data);
      },
      staleTime: Infinity,
   });
}
