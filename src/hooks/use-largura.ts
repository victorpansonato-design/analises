/**
 * Mede a largura do contêiner antes de desenhar (DS §11, invariante 1): um SVG com `viewBox`
 * esticado deforma o traço e desalinha o eixo. Descarta o zero transitório de um reflow, que
 * desmontava o `<svg>` e fazia a linha redesenhar do zero.
 */
import { useLayoutEffect, useRef, useState } from "react";

export function useLargura<T extends HTMLElement>() {
   const ref = useRef<T>(null);
   const [largura, setLargura] = useState(0);
   useLayoutEffect(() => {
      const el = ref.current;
      if (!el) return;
      const medir = (proxima: number) => setLargura(prev => (proxima > 0 ? Math.round(proxima) : prev));
      medir(el.getBoundingClientRect().width);
      if (typeof ResizeObserver === "undefined") return;
      const obs = new ResizeObserver(entradas => medir(entradas[0]?.contentRect.width ?? 0));
      obs.observe(el);
      return () => obs.disconnect();
   }, []);
   return { ref, largura };
}
