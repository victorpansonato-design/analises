/** Media query reativa (breakpoints da tela única: docs/05 §7). */
import { useSyncExternalStore } from "react";

export function useMediaQuery(query: string): boolean {
   return useSyncExternalStore(
      aviso => {
         const mql = window.matchMedia(query);
         mql.addEventListener("change", aviso);
         return () => mql.removeEventListener("change", aviso);
      },
      () => window.matchMedia(query).matches,
      () => false,
   );
}

/** ≥ 1024 px: fila e caso lado a lado. Abaixo, o caso abre por cima da fila. */
export const QUERY_LADO_A_LADO = "(min-width: 1024px)";
/** ≥ 1280 px: fila de 380 px e resumo lateral da análise. */
export const QUERY_LARGA = "(min-width: 1280px)";
