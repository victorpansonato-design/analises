/** Leitura do checklist do caso (`.parse` do Zod na `queryFn`). */
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import api from "@/services/api";
import type { ApiResponse } from "@/services/types";

import { documentosKeys } from "@/features/documentos/api/documentos.keys";
import { ItemChecklistSchema } from "@/features/documentos/types/documento.schema";

export function useDocumentos(casoId: string) {
   return useQuery({
      queryKey: documentosKeys.doCaso(casoId),
      queryFn: async () => {
         const { data } = await api.get<ApiResponse<unknown>>(`/casos/${casoId}/documentos`);
         return z.array(ItemChecklistSchema).parse(data.data);
      },
   });
}
