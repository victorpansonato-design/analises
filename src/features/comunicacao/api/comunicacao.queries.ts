/**
 * Leitura de templates e prévia. A prévia é um POST sem efeito colateral: o backend monta o texto
 * exatamente como o candidato verá (o front nunca fala com o Blip nem monta a mensagem sozinho).
 */
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { comunicacaoKeys } from "@/features/comunicacao/api/comunicacao.keys";
import { PreviaMensagemSchema, TemplateMensagemSchema } from "@/features/comunicacao/types/comunicacao.schema";

/** Templates aprovados que o papel do usuário pode enviar. */
export function useTemplates() {
   return useQuery({
      queryKey: comunicacaoKeys.templates(),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/comunicacao/templates");
         return z.array(TemplateMensagemSchema).parse(data.data);
      },
      staleTime: 5 * 60_000,
   });
}

/**
 * Prévia exata de um template para o caso (`templateId` nulo = nada escolhido). Público: a proposta
 * reutiliza para mostrar a mensagem de `proposta_pronta` antes de enviar.
 */
export function usePreviaMensagem(casoId: string, templateId: string | null) {
   return useQuery({
      queryKey: comunicacaoKeys.previa(casoId, templateId),
      enabled: !!templateId,
      queryFn: async () => {
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${casoId}/mensagens/previa`, { templateId });
         return PreviaMensagemSchema.parse(data.data);
      },
   });
}
