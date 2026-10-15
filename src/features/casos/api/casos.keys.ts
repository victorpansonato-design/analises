/**
 * Query key factory dos casos. Outras features invalidam por aqui (ex.: decidir um item muda os
 * contadores do caso e o funil), nunca com arrays soltos.
 */
import type { Ordem, Visao } from "@/features/casos/types/caso.schema";

export interface FiltrosFila {
   visao: Visao;
   /** Processo (Ingresso, Transferência interna, Aproveitamento); `null` = todos. */
   processo: string | null;
   etapa: string | null;
   tipo: string | null;
   curso: string | null;
   turno: string | null;
   modalidade: string | null;
   responsavel: string | null;
   somenteAtrasados: boolean;
   comPendencia: boolean;
   ouvidoria: boolean;
   incluirEncerrados: boolean;
   ciclo: string | null;
   q: string;
   ordem: Ordem;
}

export const casosKeys = {
   all: ["casos"] as const,
   listas: () => [...casosKeys.all, "lista"] as const,
   lista: (filtros: FiltrosFila) => [...casosKeys.listas(), filtros] as const,
   busca: (q: string) => [...casosKeys.all, "busca", q] as const,
   funis: () => [...casosKeys.all, "funil"] as const,
   funil: (visao: Visao, ciclo: string | null, processo: string | null = null) => [...casosKeys.funis(), visao, ciclo, processo] as const,
   detalhes: () => [...casosKeys.all, "detalhe"] as const,
   detalhe: (id: string) => [...casosKeys.detalhes(), id] as const,
};

export const catalogoKeys = {
   all: ["catalogos"] as const,
   cursos: () => [...catalogoKeys.all, "cursos"] as const,
   matrizes: (cursoId: string) => [...catalogoKeys.all, "matrizes", cursoId] as const,
   usuarios: (papel: string | null) => [...catalogoKeys.all, "usuarios", papel] as const,
   instituicoes: (q: string) => [...catalogoKeys.all, "instituicoes", q] as const,
};
