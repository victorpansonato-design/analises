/**
 * Leitura da matriz curricular (React Query, `.parse` do Zod na `queryFn`). A busca só sai com uma
 * consulta válida e mantém o resultado anterior enquanto a próxima chega, para a lista não piscar
 * a cada letra. Catálogo muda pouco: cache longo.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "@/services/api";
import { lerErroApi } from "@/services/api-erro";
import type { ApiResponse } from "@/services/types";

import { consultaValida } from "@/features/matriz-curricular/domain/busca";
import { CurriculoSchema, OfertaMatrizSchema, type FiltroMatriz } from "@/features/matriz-curricular/types/matriz.schema";

export const matrizKeys = {
   todas: ["matriz-curricular"] as const,
   busca: (f: FiltroMatriz) => ["matriz-curricular", "busca", { q: f.q.trim(), modalidade: f.modalidade, turno: f.turno }] as const,
   curriculo: (id: string) => ["matriz-curricular", "curriculo", id] as const,
};

export function useBuscaMatrizes(filtro: FiltroMatriz) {
   const turno = filtro.modalidade === "PRESENCIAL" ? filtro.turno : null;
   const f = { ...filtro, turno };
   return useQuery({
      queryKey: matrizKeys.busca(f),
      enabled: consultaValida(f.q),
      placeholderData: keepPreviousData,
      staleTime: 300_000,
      queryFn: async ({ signal }) => {
         const { data } = await api.get<ApiResponse<unknown>>("/matrizes-curriculares", {
            params: { q: f.q.trim(), modalidade: f.modalidade ?? undefined, turno: turno ?? undefined },
            signal,
         });
         return z.array(OfertaMatrizSchema).parse(data.data);
      },
   });
}

export function curriculoNaoEncontrado(error: unknown): boolean {
   return lerErroApi(error).status === 404;
}

export function useCurriculo(id: string | null) {
   return useQuery({
      queryKey: matrizKeys.curriculo(id ?? ""),
      enabled: Boolean(id),
      staleTime: 300_000,
      retry: (falhas, error) => !curriculoNaoEncontrado(error) && falhas < 2,
      queryFn: async ({ signal }) => {
         const { data } = await api.get<ApiResponse<unknown>>(`/matrizes-curriculares/${encodeURIComponent(id ?? "")}`, { signal });
         return CurriculoSchema.parse(data.data);
      },
   });
}
