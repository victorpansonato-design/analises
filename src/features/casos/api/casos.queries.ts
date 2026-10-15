/**
 * Leitura dos casos (React Query, `.parse` do Zod dentro da `queryFn`). A fila e o funil fazem
 * polling de 30 s (`UI.pollingMs`) só com a aba visível; o contrato já prevê SSE para o TI trocar
 * depois sem mudar a interface.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { catalogoKeys, casosKeys, type FiltrosFila } from "@/features/casos/api/casos.keys";
import { UI } from "@/features/casos/domain/parametros";
import {
   CasoDetalheSchema,
   CursoSchema,
   FunilSchema,
   MatrizResumoSchema,
   PaginaCasosSchema,
   UsuarioResumoSchema,
   type Visao,
} from "@/features/casos/types/caso.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

function paramsDaFila(f: FiltrosFila, cursor: string | null) {
   return {
      visao: f.visao,
      processo: f.processo ?? undefined,
      etapa: f.etapa ?? undefined,
      tipo: f.tipo ?? undefined,
      curso: f.curso ?? undefined,
      turno: f.turno ?? undefined,
      modalidade: f.modalidade ?? undefined,
      responsavel: f.responsavel ?? undefined,
      somenteAtrasados: f.somenteAtrasados || undefined,
      comPendencia: f.comPendencia || undefined,
      ouvidoria: f.ouvidoria || undefined,
      incluirEncerrados: f.incluirEncerrados || undefined,
      ciclo: f.ciclo ?? undefined,
      q: f.q || undefined,
      ordem: f.ordem,
      cursor: cursor ?? undefined,
      limite: UI.paginaFila,
   };
}

/** Fila paginada por cursor (a lista é virtualizada e pede a próxima página ao chegar no fim). */
export function useCasos(filtros: FiltrosFila) {
   return useInfiniteQuery({
      queryKey: casosKeys.lista(filtros),
      initialPageParam: null as string | null,
      queryFn: async ({ pageParam }) => {
         const { data } = await api.get<ApiResponse<unknown>>("/casos", { params: paramsDaFila(filtros, pageParam) });
         return PaginaCasosSchema.parse(data.data);
      },
      getNextPageParam: ultima => ultima.proximoCursor,
      placeholderData: keepPreviousData,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}

/** Busca global (⌘K): RA, CPF, nome sem acento ou protocolo, em todas as etapas. */
export function useBuscaCasos(q: string) {
   const termo = q.trim();
   return useQuery({
      queryKey: casosKeys.busca(termo),
      enabled: termo.length >= 2,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/casos", {
            params: { visao: "TODOS", q: termo, incluirEncerrados: true, limite: 8, ordem: "PRIORIDADE" },
         });
         return PaginaCasosSchema.parse(data.data);
      },
      placeholderData: keepPreviousData,
      staleTime: 15_000,
   });
}

export function useFunil(visao: Visao, ciclo: string | null, processo: string | null = null) {
   return useQuery({
      queryKey: casosKeys.funil(visao, ciclo, processo),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/casos/funil", {
            params: { visao, ciclo: ciclo ?? undefined, processo: processo ?? undefined },
         });
         return FunilSchema.parse(data.data);
      },
      placeholderData: keepPreviousData,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}

export function useCaso(id: string | null) {
   return useQuery({
      queryKey: casosKeys.detalhe(id ?? ""),
      enabled: !!id,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${id}`);
         return CasoDetalheSchema.parse(data.data);
      },
      staleTime: 10_000,
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}

// ── Catálogos ──────────────────────────────────────────────────────────────────────────────────

export function useCursos() {
   return useQuery({
      queryKey: catalogoKeys.cursos(),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/cursos");
         return z.array(CursoSchema).parse(data.data);
      },
      staleTime: Infinity,
   });
}

export function useMatrizes(cursoId: string | null) {
   return useQuery({
      queryKey: catalogoKeys.matrizes(cursoId ?? ""),
      enabled: !!cursoId,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/matrizes", { params: { curso: cursoId } });
         return z.array(MatrizResumoSchema).parse(data.data);
      },
      staleTime: Infinity,
   });
}

/** Usuários por papel (atribuir, @menção). `null` = todos. */
export function useUsuarios(papel: string | null) {
   return useQuery({
      queryKey: catalogoKeys.usuarios(papel),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/usuarios", { params: { papel: papel ?? undefined } });
         return z.array(UsuarioResumoSchema).parse(data.data);
      },
      staleTime: 5 * 60_000,
   });
}

const InstituicaoSchema = z.object({ id: z.string(), nome: z.string(), sigla: z.string().nullable() });
export type Instituicao = z.infer<typeof InstituicaoSchema>;

/** Autocomplete de IES de origem. */
export function useInstituicoes(q: string) {
   const termo = q.trim();
   return useQuery({
      queryKey: catalogoKeys.instituicoes(termo),
      enabled: termo.length >= 2,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/instituicoes", { params: { q: termo } });
         return z.array(InstituicaoSchema).parse(data.data);
      },
      placeholderData: keepPreviousData,
      staleTime: 5 * 60_000,
   });
}

/** Dados do vestibular da pessoa (antigo "Dados vest."). `null` quando a pessoa não prestou. */
export function useVestibular(pessoaId: string | null) {
   return useQuery({
      queryKey: ["vestibular", pessoaId ?? ""],
      enabled: !!pessoaId,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/pessoas/${pessoaId}/vestibular`);
         return z
            .record(z.string(), z.union([z.string(), z.number()]))
            .nullable()
            .parse(data.data);
      },
      staleTime: Infinity,
   });
}
