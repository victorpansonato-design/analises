/**
 * Rascunho do "Novo protocolo" (docs/05 §4: "rascunho salvo automaticamente se o drawer for fechado
 * no meio"). É estado de FORMULÁRIO do navegador, nunca dado de servidor: fica no `sessionStorage`
 * (some ao fechar a aba) e volta ao reabrir o drawer. Arquivos não entram: `File` não serializa.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { NovoProtocoloForm } from "@/features/protocolo/types/protocolo.schema";

type RascunhoProtocoloState = {
   valores: Partial<NovoProtocoloForm> | null;
   /** Caso de origem da "Nova análise para este candidato", para não misturar rascunhos. */
   deCasoId: string | null;
   salvar: (valores: Partial<NovoProtocoloForm>, deCasoId: string | null) => void;
   descartar: () => void;
};

export const useRascunhoProtocoloStore = create<RascunhoProtocoloState>()(
   persist(
      set => ({
         valores: null,
         deCasoId: null,
         salvar: (valores, deCasoId) => set({ valores, deCasoId }),
         descartar: () => set({ valores: null, deCasoId: null }),
      }),
      { name: "analises:rascunho-protocolo", storage: createJSONStorage(() => sessionStorage) },
   ),
);
