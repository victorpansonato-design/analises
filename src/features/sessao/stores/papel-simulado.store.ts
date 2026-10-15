/**
 * Papel simulado (só com dados simulados ligados, docs/04 §4). Troca o usuário que o MSW devolve em
 * `GET /me`, para testar a mesma tela em todos os papéis. É preferência de UI de quem testa: fica no
 * navegador e nunca vai para o servidor.
 */
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import type { Papel } from "@/features/sessao/types/sessao.schema";

type PapelSimuladoState = {
   papel: Papel;
   setPapel: (papel: Papel) => void;
};

export const usePapelSimuladoStore = create<PapelSimuladoState>()(
   persist(
      set => ({
         papel: "ANALISTA",
         setPapel: papel => set({ papel }),
      }),
      { name: "analises:papel-simulado", storage: createJSONStorage(() => localStorage) },
   ),
);
