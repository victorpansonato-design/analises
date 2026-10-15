/**
 * Escrita no checklist. Toda mutation que muda o caso envia `If-Match` (docs/03 §8) e, no sucesso,
 * invalida TUDO do caso: aceitar o último obrigatório move o caso para a pré-análise, e contadores,
 * fila, funil e linha do tempo precisam concordar.
 *
 * Abrir um arquivo é mutation de propósito: cada abertura gera log `documento.visualizado` (LGPD).
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { avisarErro } from "@/lib/notify";
import api from "@/services/api";
import { ehConflito } from "@/services/api-erro";
import type { ApiResponse } from "@/services/types";

import { invalidarCaso, invalidarTudoDoCaso, type CasoDetalhe } from "@/features/casos";
import { timelineKeys } from "@/features/timeline";

import { ItemChecklistSchema, VisualizacaoSchema, type AvaliacaoDocumento } from "@/features/documentos/types/documento.schema";

type CasoComVersao = Pick<CasoDetalhe, "id" | "versao">;

const ifMatch = (versao: number) => ({ "If-Match": String(versao) });

function aoFalhar(queryClient: QueryClient, casoId: string, titulo: string) {
   return (error: unknown) => {
      if (ehConflito(error)) invalidarCaso(queryClient, casoId);
      avisarErro(error, titulo);
   };
}

export interface EntradaAvaliacao extends AvaliacaoDocumento {
   checklistId: string;
}

/** Aceitar, recusar (dispara a mensagem ao candidato) ou dispensar um item. */
export function useAvaliarDocumento(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ checklistId, ...corpo }: EntradaAvaliacao) => {
         const { data } = await api.patch<ApiResponse<unknown>>(`/casos/${caso.id}/documentos/${checklistId}`, corpo, {
            headers: ifMatch(caso.versao),
         });
         return ItemChecklistSchema.parse(data.data);
      },
      onSuccess: () => invalidarTudoDoCaso(queryClient, caso.id),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível registrar a avaliação"),
   });
}

/** Anexar o arquivo que o candidato mandou por fora (canal CONSULTOR). */
export function useAnexarDocumento(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ checklistId, arquivo }: { checklistId: string; arquivo: File }) => {
         const form = new FormData();
         form.append("arquivo", arquivo);
         form.append("checklistId", checklistId);
         // Content-Type explícito: o padrão JSON da instância faria o Axios serializar o FormData.
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${caso.id}/documentos`, form, {
            headers: { ...ifMatch(caso.versao), "Content-Type": "multipart/form-data" },
         });
         return ItemChecklistSchema.parse(data.data);
      },
      onSuccess: () => invalidarTudoDoCaso(queryClient, caso.id),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível anexar o arquivo"),
   });
}

/** Migrar de novo o histórico interno do sistema acadêmico (interna e retorno). */
export function useMigrarHistoricoInterno(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async () => {
         await api.post(`/casos/${caso.id}/historico-interno:migrar`, null, { headers: ifMatch(caso.versao) });
      },
      onSuccess: () => invalidarTudoDoCaso(queryClient, caso.id),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível migrar o histórico interno"),
   });
}

/** URL temporária do arquivo. Cada chamada registra o acesso na linha do tempo. */
export function useVisualizarArquivo(casoId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ checklistId, arquivoId }: { checklistId: string; arquivoId: string }) => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/documentos/${checklistId}/arquivo/${arquivoId}`);
         return VisualizacaoSchema.parse(data.data);
      },
      // O log de acesso entra na linha do tempo: só ela precisa recarregar.
      onSuccess: () => void queryClient.invalidateQueries({ queryKey: timelineKeys.doCaso(casoId) }),
      onError: error => avisarErro(error, "Não foi possível abrir o arquivo"),
   });
}
