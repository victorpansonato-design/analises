/**
 * Leitura da análise e da pré-análise (React Query, `.parse` do Zod na `queryFn`). A análise só
 * existe depois da pré-análise: o 404 `ANALISE_INDISPONIVEL` é estado esperado, não erro, por isso
 * não há retentativa nele. A pré-análise se acompanha sozinha (4 s) enquanto está processando.
 */
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import { lerErroApi } from "@/services/api-erro";
import type { ApiResponse } from "@/services/types";

import { analiseKeys } from "@/features/analise/api/analise.keys";
import { AnaliseSchema, PreAnaliseSchema, PreviaMatrizSchema } from "@/features/analise/types/analise.schema";

/** Intervalo de acompanhamento da pré-análise em processamento [parâmetro de interface]. */
export const POLLING_PRE_ANALISE_MS = 4_000;

export function analiseIndisponivel(error: unknown): boolean {
   const e = lerErroApi(error);
   return e.status === 404 && e.code === "ANALISE_INDISPONIVEL";
}

export function useAnalise(casoId: string, enabled = true) {
   return useQuery({
      queryKey: analiseKeys.analise(casoId),
      enabled,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/analise`);
         return AnaliseSchema.parse(data.data);
      },
      retry: (falhas, error) => !analiseIndisponivel(error) && lerErroApi(error).status !== 403 && falhas < 2,
      staleTime: 10_000,
   });
}

/** `acompanhar`: força o polling mesmo antes da primeira resposta (etapa PRE_ANALISE). */
export function usePreAnalise(casoId: string, { enabled = true, acompanhar = false }: { enabled?: boolean; acompanhar?: boolean } = {}) {
   return useQuery({
      queryKey: analiseKeys.preAnalise(casoId),
      enabled,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/pre-analise`);
         return PreAnaliseSchema.parse(data.data);
      },
      refetchInterval: query => (acompanhar || query.state.data?.status === "PROCESSANDO" ? POLLING_PRE_ANALISE_MS : false),
      refetchIntervalInBackground: false,
   });
}

/** Prévia de "Trocar matriz" (EXTENSÃO do contrato). */
export function usePreviaMatriz(casoId: string, matrizId: string | null) {
   return useQuery({
      queryKey: analiseKeys.previaMatriz(casoId, matrizId ?? ""),
      enabled: !!matrizId,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/analise/previa-matriz`, { params: { matriz: matrizId } });
         return PreviaMatrizSchema.parse(data.data);
      },
      placeholderData: keepPreviousData,
      staleTime: 30_000,
   });
}
