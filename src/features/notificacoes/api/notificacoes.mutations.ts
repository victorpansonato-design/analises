/**
 * Marcar como lida (`POST /notificacoes/{id}:lida`), de forma OTIMISTA: o sino responde no clique e
 * só volta atrás (com aviso) se a API recusar. "Marcar todas" manda um pedido por notificação: o
 * contrato não tem rota em lote.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { notificacoesKeys } from "@/features/notificacoes/api/notificacoes.keys";
import type { Notificacao } from "@/features/notificacoes/types/notificacao.schema";
import { avisarErro } from "@/lib/notify";
import api from "@/services/api";

async function marcar(id: string): Promise<void> {
   await api.post(`/notificacoes/${encodeURIComponent(id)}:lida`);
}

function useMarcarOtimista(titulo: string) {
   const qc = useQueryClient();
   return useMutation({
      mutationFn: async (ids: string[]) => {
         await Promise.all(ids.map(marcar));
      },
      onMutate: async (ids: string[]) => {
         await qc.cancelQueries({ queryKey: notificacoesKeys.lista() });
         const antes = qc.getQueryData<Notificacao[]>(notificacoesKeys.lista());
         const alvo = new Set(ids);
         qc.setQueryData<Notificacao[]>(notificacoesKeys.lista(), lista => lista?.map(n => (alvo.has(n.id) ? { ...n, lida: true } : n)));
         return { antes };
      },
      onError: (error, _ids, ctx) => {
         if (ctx?.antes) qc.setQueryData(notificacoesKeys.lista(), ctx.antes);
         avisarErro(error, titulo);
      },
      onSettled: () => qc.invalidateQueries({ queryKey: notificacoesKeys.lista() }),
   });
}

export function useMarcarLida() {
   const m = useMarcarOtimista("Não foi possível marcar a notificação como lida");
   return { ...m, marcar: (id: string) => m.mutate([id]) };
}

export function useMarcarTodasLidas() {
   const m = useMarcarOtimista("Não foi possível marcar as notificações como lidas");
   return { ...m, marcarTodas: (ids: string[]) => ids.length > 0 && m.mutate(ids) };
}
