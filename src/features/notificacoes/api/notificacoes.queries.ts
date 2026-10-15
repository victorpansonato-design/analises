/**
 * Notificações in-app (`GET /notificacoes`). Polling de `UI.pollingMs` só com a aba visível: o
 * contrato prevê SSE (`/eventos/stream`), e o TI troca depois sem mudar a interface.
 */
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { UI } from "@/features/casos";
import { notificacoesKeys } from "@/features/notificacoes/api/notificacoes.keys";
import { NotificacaoSchema } from "@/features/notificacoes/types/notificacao.schema";
import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

export function useNotificacoes() {
   return useQuery({
      queryKey: notificacoesKeys.lista(),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>("/notificacoes");
         return z.array(NotificacaoSchema).parse(data.data);
      },
      refetchInterval: UI.pollingMs,
      refetchIntervalInBackground: false,
   });
}
