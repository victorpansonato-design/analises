/**
 * Definir a meta mensal de um consultor (`PUT /gestao/metas`). `If-Match` com a versão lida: se outra
 * pessoa mudou a meta antes, a API responde 409, a tela recarrega e nada é sobrescrito.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { avisarErro, notificar } from "@/lib/notify";
import api from "@/services/api";
import { lerErroApi } from "@/services/api-erro";

import { gestaoKeys } from "@/features/gestao/api/gestao.keys";
import type { MetaEntrada } from "@/features/gestao/types/gestao.schema";

export function useDefinirMeta() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ versao, ...corpo }: MetaEntrada) => {
         await api.put("/gestao/metas", corpo, { headers: { "If-Match": String(versao) } });
      },
      onSettled: () => void queryClient.invalidateQueries({ queryKey: gestaoKeys.all }),
      onError: error => {
         const e = lerErroApi(error);
         if (e.status !== 409) return avisarErro(error, "Não foi possível salvar a meta");
         notificar({
            tom: "warn",
            titulo: e.atualizadoPor ? `A meta foi alterada por ${e.atualizadoPor} agora` : "A meta foi alterada agora",
            detalhe: "Recarregamos o valor mais recente. Confira e salve de novo, se ainda fizer sentido.",
         });
      },
   });
}
