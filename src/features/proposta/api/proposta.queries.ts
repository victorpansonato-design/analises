/**
 * Leitura da proposta e da prévia do template `proposta_pronta`. Chaves começam com o nome da
 * feature e contêm o `casoId`: `invalidarTudoDoCaso` e `useTransicao` alcançam as duas.
 */
import { useQuery } from "@tanstack/react-query";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { PreviaPropostaSchema, PropostaSchema } from "@/features/proposta/types/proposta.schema";

export const TEMPLATE_PROPOSTA = "proposta_pronta";

export const propostaKeys = {
   detalhe: (casoId: string) => ["proposta", casoId] as const,
   previa: (casoId: string) => ["proposta-previa", casoId] as const,
};

/** Resumo congelado + condição financeira + situação. Só busca depois de `CONCLUIR_ANALISE`. */
export function useProposta(casoId: string, habilitada: boolean) {
   return useQuery({
      queryKey: propostaKeys.detalhe(casoId),
      enabled: habilitada,
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/proposta`);
         return PropostaSchema.parse(data.data);
      },
      staleTime: 15_000,
   });
}

/**
 * Prévia exata do que o candidato vai receber (docs/08 §4). É POST no contrato, mas não muda nada:
 * por isso é query (cache por caso, refaz ao reabrir o modal).
 */
export function usePreviaProposta(casoId: string, habilitada: boolean) {
   return useQuery({
      queryKey: propostaKeys.previa(casoId),
      enabled: habilitada,
      queryFn: async () => {
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${casoId}/mensagens/previa`, { templateId: TEMPLATE_PROPOSTA });
         return PreviaPropostaSchema.parse(data.data);
      },
      staleTime: 0,
   });
}
