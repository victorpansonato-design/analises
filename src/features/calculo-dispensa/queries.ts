import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { AlunoDispensa, GradeDispensa } from "./types";

export function useCatalogoDispensa() {
   return useQuery({
      queryKey: ["calculo-dispensa", "catalogo"],
      queryFn: async ({ signal }) => (await api.get<{ data: GradeDispensa[] }>("/calculo-dispensa/catalogo", { signal })).data.data,
      staleTime: 300_000,
   });
}

export function useAlunoDispensa(ra: string) {
   return useQuery({
      queryKey: ["calculo-dispensa", "aluno", ra],
      queryFn: async ({ signal }) =>
         (await api.get<{ data: AlunoDispensa | null }>(`/calculo-dispensa/alunos/${encodeURIComponent(ra)}`, { signal })).data.data,
      enabled: Boolean(ra),
      staleTime: 60_000,
      retry: false,
   });
}
