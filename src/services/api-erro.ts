/**
 * Leitura padronizada de erro da API (envelope `ApiErrorResponse` do contrato). A interface usa
 * isto para explicar o que aconteceu e o que fazer, sem repetir parsing em cada mutation.
 */
import type { ApiErrorResponse } from "@/services/types";
import type { AxiosError } from "axios";

export interface ErroApi {
   status: number | null;
   code: string | null;
   message: string;
   detalhes: string[];
   atualizadoPor: string | null;
}

export function lerErroApi(error: unknown, padrao = "Não foi possível concluir. Tente de novo."): ErroApi {
   const ax = error as AxiosError<ApiErrorResponse>;
   const corpo = ax?.response?.data?.error;
   const semResposta = !ax?.response;
   return {
      status: ax?.response?.status ?? null,
      code: corpo?.code ?? null,
      message: corpo?.message ?? (semResposta ? "Sem conexão com o servidor. Verifique a rede e tente de novo." : padrao),
      detalhes: corpo?.detalhes ?? [],
      atualizadoPor: corpo?.atualizadoPor?.nome ?? null,
   };
}

/** 409: alguém alterou o registro antes. A interface recarrega e não sobrescreve. */
export function ehConflito(error: unknown): boolean {
   return lerErroApi(error).status === 409;
}
