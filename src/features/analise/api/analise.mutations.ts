/**
 * Escrita na análise. Regras:
 *
 * - `If-Match` leva a versão DA ANÁLISE (não a do caso), lida do cache NA HORA de enviar. Todas as
 *   mutations da análise compartilham um `scope`: rodam em série, então a decisão seguinte (teclado,
 *   "1 ↓ 1 ↓") sai com a versão que a anterior acabou de receber, sem 409 falso.
 * - Decisão de item e lote são OTIMISTAS: a linha muda na hora; em erro, só os itens daquela
 *   mutation voltam ao estado anterior (as outras decisões em voo continuam).
 * - Depois do sucesso, `invalidarCaso` atualiza os contadores do card "Próximo passo" e a fila.
 */
import { useMutation, useQueryClient, type QueryClient } from "@tanstack/react-query";

import { invalidarCaso, type UsuarioResumo } from "@/features/casos";
import { avisarErro } from "@/lib/notify";
import api from "@/services/api";
import { ehConflito } from "@/services/api-erro";
import type { ApiResponse } from "@/services/types";

import { analiseKeys, escopoAnalise } from "@/features/analise/api/analise.keys";
import { aceitavelEmLote, decidirOtimista, reverterOtimista } from "@/features/analise/domain/analise.domain";
import {
   AnaliseSchema,
   ItemDecididoSchema,
   PreAnaliseSchema,
   type Analise,
   type AtividadeEntrada,
   type DecisaoEntrada,
   type ItemAnalise,
   type ItemDecidido,
   type LoteEntrada,
   type PerguntaEntrada,
   type PraticaEntrada,
   type RespostaEntrada,
} from "@/features/analise/types/analise.schema";

const SEM_USUARIO: UsuarioResumo = { id: "eu", nome: "Você" };

function cabecalho(queryClient: QueryClient, casoId: string) {
   const versao = queryClient.getQueryData<Analise>(analiseKeys.analise(casoId))?.versao;
   return versao === undefined ? {} : { headers: { "If-Match": String(versao) } };
}

async function lerAnalise(promessa: Promise<{ data: ApiResponse<unknown> }>): Promise<Analise> {
   const { data } = await promessa;
   return AnaliseSchema.parse(data.data);
}

async function lerItem(promessa: Promise<{ data: ApiResponse<unknown> }>): Promise<ItemDecidido> {
   const { data } = await promessa;
   return ItemDecididoSchema.parse(data.data);
}

/** Troca itens no cache preservando a identidade dos demais (as linhas memoizadas não re-renderizam). */
function trocarItens(queryClient: QueryClient, casoId: string, fn: (item: ItemAnalise) => ItemAnalise) {
   queryClient.setQueryData<Analise>(analiseKeys.analise(casoId), atual => (atual ? { ...atual, itens: atual.itens.map(fn) } : atual));
}

function aplicarItemDecidido(queryClient: QueryClient, casoId: string, r: ItemDecidido) {
   queryClient.setQueryData<Analise>(analiseKeys.analise(casoId), atual =>
      atual ? { ...atual, itens: atual.itens.map(i => (i.id === r.item.id ? r.item : i)), resumo: r.resumo, versao: r.versao } : atual,
   );
}

function falha(queryClient: QueryClient, casoId: string, titulo: string) {
   return (error: unknown) => {
      if (ehConflito(error)) {
         void queryClient.invalidateQueries({ queryKey: analiseKeys.analise(casoId) });
         invalidarCaso(queryClient, casoId);
      }
      avisarErro(error, titulo);
   };
}

interface OpcoesDecisao {
   usuario: UsuarioResumo | null | undefined;
   /** Quem decide é a coordenação (origem `COORDENACAO`). */
   coordenacao: boolean;
}

type Anteriores = Map<string, ItemAnalise>;

function restaurar(queryClient: QueryClient, casoId: string, anteriores: Anteriores | undefined) {
   if (!anteriores?.size) return;
   trocarItens(queryClient, casoId, i => anteriores.get(i.id) ?? i);
}

/** Decide (ou confirma a sugestão de) um item: PUT .../analise/itens/{itemId}. */
export function useDecidirItem(casoId: string, { usuario, coordenacao }: OpcoesDecisao) {
   const queryClient = useQueryClient();
   return useMutation({
      scope: escopoAnalise(casoId),
      mutationFn: ({ itemId, entrada }: { itemId: string; entrada: DecisaoEntrada }) =>
         lerItem(api.put(`/casos/${casoId}/analise/itens/${itemId}`, entrada, cabecalho(queryClient, casoId))),
      onMutate: async ({ itemId, entrada }) => {
         await queryClient.cancelQueries({ queryKey: analiseKeys.analise(casoId), exact: true });
         const anteriores: Anteriores = new Map();
         const em = new Date().toISOString();
         trocarItens(queryClient, casoId, i => {
            if (i.id !== itemId || i.estado === "PERGUNTA_ABERTA") return i;
            anteriores.set(i.id, i);
            return decidirOtimista(i, entrada, usuario ?? SEM_USUARIO, em, coordenacao);
         });
         return { anteriores };
      },
      onError: (error, _v, ctx) => {
         restaurar(queryClient, casoId, ctx?.anteriores);
         falha(queryClient, casoId, "Não foi possível salvar a decisão")(error);
      },
      onSuccess: r => {
         aplicarItemDecidido(queryClient, casoId, r);
         invalidarCaso(queryClient, casoId);
      },
   });
}

/** Lote: aceitar alta confiança, definir decisão para vários, ou reverter (o "Desfazer"). */
export function useDecidirLote(casoId: string, { usuario, coordenacao }: OpcoesDecisao) {
   const queryClient = useQueryClient();
   return useMutation({
      scope: escopoAnalise(casoId),
      mutationFn: (entrada: LoteEntrada) =>
         lerAnalise(api.post(`/casos/${casoId}/analise/itens:lote`, entrada, cabecalho(queryClient, casoId))),
      onMutate: async entrada => {
         await queryClient.cancelQueries({ queryKey: analiseKeys.analise(casoId), exact: true });
         const ids = entrada.itemIds ? new Set(entrada.itemIds) : null;
         const anteriores: Anteriores = new Map();
         const em = new Date().toISOString();
         const por = usuario ?? SEM_USUARIO;
         trocarItens(queryClient, casoId, i => {
            if (ids && !ids.has(i.id)) return i;
            let novo = i;
            if (entrada.modo === "ACEITAR_SUGESTOES_ALTA" && aceitavelEmLote(i) && i.sugestao)
               novo = decidirOtimista(i, { valor: i.sugestao.decisao }, por, em, coordenacao);
            else if (entrada.modo === "DEFINIR" && entrada.decisao && i.estado !== "PERGUNTA_ABERTA")
               novo = decidirOtimista(i, { valor: entrada.decisao }, por, em, coordenacao);
            else if (entrada.modo === "REVERTER") novo = reverterOtimista(i);
            if (novo !== i) anteriores.set(i.id, i);
            return novo;
         });
         return { anteriores };
      },
      onError: (error, _v, ctx) => {
         restaurar(queryClient, casoId, ctx?.anteriores);
         falha(queryClient, casoId, "Não foi possível aplicar a decisão em lote")(error);
      },
      onSuccess: analise => {
         queryClient.setQueryData(analiseKeys.analise(casoId), analise);
         invalidarCaso(queryClient, casoId);
      },
   });
}

/** Mutations sem otimismo: aplicam a resposta do servidor no cache e atualizam o caso. */
function useMutacaoAnalise<TEntrada>(
   casoId: string,
   titulo: string,
   enviar: (entrada: TEntrada, cfg: ReturnType<typeof cabecalho>) => Promise<Analise | ItemDecidido>,
) {
   const queryClient = useQueryClient();
   return useMutation({
      scope: escopoAnalise(casoId),
      mutationFn: (entrada: TEntrada) => enviar(entrada, cabecalho(queryClient, casoId)),
      onSuccess: r => {
         if ("item" in r) aplicarItemDecidido(queryClient, casoId, r);
         else queryClient.setQueryData(analiseKeys.analise(casoId), r);
         invalidarCaso(queryClient, casoId);
      },
      onError: falha(queryClient, casoId, titulo),
   });
}

/** Confirma ou altera o período de ingresso (PATCH .../analise). */
export function useDefinirIngresso(casoId: string) {
   return useMutacaoAnalise<number>(casoId, "Não foi possível salvar o período de ingresso", (periodoIngresso, cfg) =>
      lerAnalise(api.patch(`/casos/${casoId}/analise`, { periodoIngresso }, cfg)),
   );
}

/** Registra ou edita a pergunta à coordenação sobre o item. */
export function usePerguntar(casoId: string) {
   return useMutacaoAnalise<{ itemId: string; entrada: PerguntaEntrada }>(
      casoId,
      "Não foi possível registrar a pergunta",
      ({ itemId, entrada }, cfg) => lerItem(api.put(`/casos/${casoId}/analise/itens/${itemId}/pergunta`, entrada, cfg)),
   );
}

/** Retira a pergunta antes da resposta. */
export function useRetirarPergunta(casoId: string) {
   return useMutacaoAnalise<string>(casoId, "Não foi possível retirar a pergunta", (itemId, cfg) =>
      lerItem(api.delete(`/casos/${casoId}/analise/itens/${itemId}/pergunta`, cfg)),
   );
}

/** Coordenação responde o item (e, se marcado, cria a regra de equivalência). */
export function useResponderItem(casoId: string) {
   return useMutacaoAnalise<{ itemId: string; entrada: RespostaEntrada }>(
      casoId,
      "Não foi possível registrar a resposta",
      ({ itemId, entrada }, cfg) => lerItem(api.put(`/casos/${casoId}/analise/itens/${itemId}/resposta`, entrada, cfg)),
   );
}

export function useInserirAtividade(casoId: string) {
   return useMutacaoAnalise<AtividadeEntrada>(casoId, "Não foi possível inserir a atividade", (entrada, cfg) =>
      lerAnalise(api.post(`/casos/${casoId}/analise/atividades-complementares`, entrada, cfg)),
   );
}

export function useRemoverAtividade(casoId: string) {
   return useMutacaoAnalise<string>(casoId, "Não foi possível remover a atividade", (id, cfg) =>
      lerAnalise(api.delete(`/casos/${casoId}/analise/atividades-complementares/${id}`, cfg)),
   );
}

export function useInserirPratica(casoId: string) {
   return useMutacaoAnalise<PraticaEntrada>(casoId, "Não foi possível inserir a prática extensionista", (entrada, cfg) =>
      lerAnalise(api.post(`/casos/${casoId}/analise/pratica-extensionista`, entrada, cfg)),
   );
}

/** Reexecuta a pré-análise (não sobrescreve decisões confirmadas). */
export function useReexecutarPreAnalise(casoId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async () => {
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${casoId}/pre-analise`);
         return PreAnaliseSchema.parse(data.data);
      },
      onSuccess: pre => {
         queryClient.setQueryData(analiseKeys.preAnalise(casoId), pre);
         invalidarCaso(queryClient, casoId);
      },
      onError: error => avisarErro(error, "Não foi possível reexecutar a pré-análise"),
   });
}
