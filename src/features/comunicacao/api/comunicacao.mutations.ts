/**
 * Envio de template ao candidato: o front pede ao backend "envie o template X para o caso Y"; o
 * backend fala com o Blip e grava o evento na linha do tempo (docs/08). Depois do envio, tudo do
 * caso é invalidado (a linha do tempo mostra a mensagem com o status de entrega).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import { avisarErro } from "@/lib/notify";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { IsoDate, invalidarTudoDoCaso } from "@/features/casos";

/** Só o que a interface usa do evento devolvido (o contrato completo é da linha do tempo). */
const EventoEnviadoSchema = z.object({ id: z.string(), em: IsoDate });

export function useEnviarMensagem(casoId: string) {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async (templateId: string) => {
         const { data } = await api.post<ApiResponse<unknown>>(`/casos/${casoId}/mensagens`, { templateId });
         return EventoEnviadoSchema.parse(data.data);
      },
      onSuccess: () => invalidarTudoDoCaso(queryClient, casoId),
      onError: error => avisarErro(error, "Não foi possível enviar a mensagem"),
   });
}
