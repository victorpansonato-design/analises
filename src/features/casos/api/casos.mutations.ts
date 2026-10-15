/**
 * Escrita nos casos. Toda mutation em um caso envia `If-Match: <versao>` (docs/03 §8): se alguém
 * alterou antes, a API responde 409, a interface recarrega e não sobrescreve. Depois de mudar etapa,
 * invalida fila e funil para os números não discordarem.
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { avisarErro } from "@/lib/notify";
import api from "@/services/api";
import { ehConflito } from "@/services/api-erro";
import type { ApiResponse } from "@/services/types";

import { casosKeys } from "@/features/casos/api/casos.keys";
import {
   CasoDetalheSchema,
   type CasoDetalhe,
   type EdicaoCaso,
   type EntradaTransicao,
   type FlagsEntrada,
} from "@/features/casos/types/caso.schema";

type CasoComVersao = Pick<CasoDetalhe, "id" | "versao">;

const ifMatch = (versao: number) => ({ headers: { "If-Match": String(versao) } });

/**
 * Atualiza o cache do detalhe e invalida o que depende do caso (fila, funil, busca). Exportado para
 * as outras features chamarem depois de mudar algo do caso (documento aceito, item decidido…).
 */
export function invalidarCaso(queryClient: QueryClient, casoId: string, detalhe?: CasoDetalhe): void {
   if (detalhe) queryClient.setQueryData(casosKeys.detalhe(casoId), detalhe);
   else void queryClient.invalidateQueries({ queryKey: casosKeys.detalhe(casoId) });
   void queryClient.invalidateQueries({ queryKey: casosKeys.listas() });
   void queryClient.invalidateQueries({ queryKey: casosKeys.funis() });
}

/**
 * Invalida tudo que é deste caso, em qualquer feature (documentos, linha do tempo, análise…): por
 * convenção, toda chave de dado de um caso carrega o `casoId`.
 */
export function invalidarTudoDoCaso(queryClient: QueryClient, casoId: string): void {
   void queryClient.invalidateQueries({ predicate: q => q.queryKey.includes(casoId) });
   void queryClient.invalidateQueries({ queryKey: casosKeys.listas() });
   void queryClient.invalidateQueries({ queryKey: casosKeys.funis() });
}

function aoFalhar(queryClient: QueryClient, casoId: string, titulo: string) {
   return (error: unknown) => {
      if (ehConflito(error)) void queryClient.invalidateQueries({ queryKey: casosKeys.detalhe(casoId) });
      avisarErro(error, titulo);
   };
}

async function enviar(promessa: Promise<{ data: ApiResponse<unknown> }>): Promise<CasoDetalhe> {
   const { data } = await promessa;
   return CasoDetalheSchema.parse(data.data);
}

/** Executa uma transição da máquina de estados (POST /casos/{id}/transicoes). */
export function useTransicao(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (entrada: EntradaTransicao) => enviar(api.post(`/casos/${caso.id}/transicoes`, entrada, ifMatch(caso.versao))),
      onSuccess: detalhe => {
         // Mudar de etapa mexe em tudo (linha do tempo, análise congelada, proposta): recarrega o caso inteiro.
         invalidarCaso(queryClient, caso.id, detalhe);
         void queryClient.invalidateQueries({ predicate: q => q.queryKey[0] !== casosKeys.all[0] && q.queryKey.includes(caso.id) });
      },
      onError: aoFalhar(queryClient, caso.id, "Não foi possível mudar a etapa"),
   });
}

/** Atribuir responsável (`"EU"` = assumir). */
export function useAtribuir(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (usuarioId: string) => enviar(api.put(`/casos/${caso.id}/atribuicao`, { usuarioId }, ifMatch(caso.versao))),
      onSuccess: detalhe => invalidarCaso(queryClient, caso.id, detalhe),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível atribuir"),
   });
}

/** Pegar próximo: atribui a mim o caso sem responsável de maior prioridade na minha etapa. */
export function usePegarProximo() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async (): Promise<CasoDetalhe | null> => {
         const resposta = await api.post<ApiResponse<unknown>>("/casos/proximo");
         if (resposta.status === 204 || !resposta.data) return null;
         return CasoDetalheSchema.parse(resposta.data.data);
      },
      onSuccess: detalhe => {
         if (detalhe) invalidarCaso(queryClient, detalhe.id, detalhe);
      },
      onError: error => avisarErro(error, "Não foi possível pegar o próximo caso"),
   });
}

/** Ouvidoria, escalonamento e pendência externa. */
export function useAtualizarFlags(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (entrada: FlagsEntrada) => enviar(api.patch(`/casos/${caso.id}/flags`, entrada, ifMatch(caso.versao))),
      onSuccess: detalhe => invalidarCaso(queryClient, caso.id, detalhe),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível atualizar o caso"),
   });
}

/** Edição inline da aba Dados (só os campos enviados mudam). */
export function useEditarCaso(caso: CasoComVersao) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: (entrada: EdicaoCaso) => enviar(api.patch(`/casos/${caso.id}`, entrada, ifMatch(caso.versao))),
      onSuccess: detalhe => invalidarCaso(queryClient, caso.id, detalhe),
      onError: aoFalhar(queryClient, caso.id, "Não foi possível salvar"),
   });
}

/** Revelar dado mascarado. É mutation de propósito: cada revelação gera log de acesso (LGPD). */
export function useRevelarDado(casoId: string) {
   return useMutation({
      mutationFn: async (campo: "CPF" | "CELULAR" | "EMAIL") => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/dados-sensiveis/${campo}`);
         return z.object({ valor: z.string() }).parse(data.data).valor;
      },
      onError: error => avisarErro(error, "Não foi possível mostrar o dado"),
   });
}

/** "Lembrar agora": envia ao candidato o template de documentos pendentes (o backend fala com o Blip). */
export function useLembrarDocumentos(casoId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async () => {
         await api.post(`/casos/${casoId}/documentos:solicitar`);
      },
      onSuccess: () => invalidarTudoDoCaso(queryClient, casoId),
      onError: error => avisarErro(error, "Não foi possível enviar o lembrete"),
   });
}
