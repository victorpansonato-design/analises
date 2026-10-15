/**
 * Troca de tema com revelação circular (DS §10.21): o tema novo é pintado por cima do antigo e
 * revelado por um círculo que cresce a partir do botão. Sem View Transitions ou com
 * `prefers-reduced-motion`, a troca é seca.
 */
import { flushSync } from "react-dom";

interface DocumentoComTransicao {
   startViewTransition?: (atualizar: () => void) => { ready: Promise<void> };
}

export function trocarComRevelacao(aplicar: () => void, origem?: { x: number; y: number }): void {
   const doc = document as Document & DocumentoComTransicao;
   const reduzido = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   if (!doc.startViewTransition || reduzido) {
      aplicar();
      return;
   }
   const x = origem?.x ?? window.innerWidth - 40;
   const y = origem?.y ?? 28;
   const raio = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
   const transicao = doc.startViewTransition(() => flushSync(aplicar));
   void transicao.ready.then(() => {
      document.documentElement.animate(
         { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${raio}px at ${x}px ${y}px)`] },
         { duration: 700, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" },
      );
   });
}
