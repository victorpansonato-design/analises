/**
 * Abrir protocolo (`POST /casos` com `enviar: true`) e anexar os documentos que o candidato já
 * mandou ao consultor. O upload acontece DEPOIS de o caso existir e não desfaz o protocolo se
 * falhar: o caso já está aberto, o arquivo pode ser anexado depois pela aba Documentos.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { CasoDetalheSchema, casosKeys, invalidarTudoDoCaso, type CasoDetalhe } from "@/features/casos";
import { ItemChecklistSchema } from "@/features/documentos";

import { proximoChecklistPendente } from "@/features/protocolo/domain/protocolo";
import type { NovoProtocolo } from "@/features/protocolo/types/protocolo.schema";

export interface ResultadoProtocolo {
   caso: CasoDetalhe;
   anexados: number;
   falhas: string[];
}

/** Anexa cada arquivo ao primeiro item ainda pendente do checklist. Nunca lança. */
export async function anexarDocumentosIniciais(casoId: string, arquivos: readonly File[]): Promise<{ anexados: number; falhas: string[] }> {
   if (arquivos.length === 0) return { anexados: 0, falhas: [] };
   let itens: z.infer<typeof ItemChecklistSchema>[];
   try {
      const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/documentos`);
      itens = z.array(ItemChecklistSchema).parse(data.data);
   } catch {
      return { anexados: 0, falhas: arquivos.map(a => a.name) };
   }
   const usados = new Set<string>();
   const falhas: string[] = [];
   let anexados = 0;
   for (const arquivo of arquivos) {
      const checklistId = proximoChecklistPendente(itens, usados) ?? itens[0]?.id ?? null;
      if (!checklistId) {
         falhas.push(arquivo.name);
         continue;
      }
      usados.add(checklistId);
      const corpo = new FormData();
      corpo.append("arquivo", arquivo);
      corpo.append("checklistId", checklistId);
      try {
         await api.post(`/casos/${casoId}/documentos`, corpo);
         anexados += 1;
      } catch {
         falhas.push(arquivo.name);
      }
   }
   return { anexados, falhas };
}

export function useCriarProtocolo() {
   const queryClient = useQueryClient();
   return useMutation({
      mutationFn: async ({ protocolo, arquivos }: { protocolo: NovoProtocolo; arquivos: readonly File[] }): Promise<ResultadoProtocolo> => {
         const { data } = await api.post<ApiResponse<unknown>>("/casos", protocolo);
         const caso = CasoDetalheSchema.parse(data.data);
         const { anexados, falhas } = await anexarDocumentosIniciais(caso.id, arquivos);
         return { caso, anexados, falhas };
      },
      onSuccess: ({ caso, anexados }) => {
         queryClient.setQueryData(casosKeys.detalhe(caso.id), caso);
         void queryClient.invalidateQueries({ queryKey: casosKeys.listas() });
         void queryClient.invalidateQueries({ queryKey: casosKeys.funis() });
         if (anexados > 0) invalidarTudoDoCaso(queryClient, caso.id);
      },
   });
}
