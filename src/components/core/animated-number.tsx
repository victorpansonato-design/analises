/**
 * AnimatedNumber (design system §8 e §11). Volume conta; índice preenche.
 *
 * Conta do zero na montagem e faz tween entre valores nas atualizações (620 ms, `1 - (1-p)³`).
 * Para um índice limitado (taxa, 0 a 100) passe `countUp={false}`: nos primeiros quadros a tela
 * diria "0%", e é uma frase que alguém fotografa. `prefers-reduced-motion` mostra o valor direto.
 */
import { useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { int } from "@/lib/format";

interface AnimatedNumberProps {
   value: number;
   format?: (n: number) => string;
   countUp?: boolean;
   className?: string;
}

const DURACAO = 620;

export function AnimatedNumber({ value, format = int, countUp = true, className }: AnimatedNumberProps) {
   const reduzido = useReducedMotion();
   const [exibido, setExibido] = useState(countUp && !reduzido ? 0 : value);
   const anterior = useRef(countUp && !reduzido ? 0 : value);

   useEffect(() => {
      if (reduzido) {
         anterior.current = value;
         return;
      }
      const de = anterior.current;
      const para = value;
      if (de === para) return;
      const inicio = performance.now();
      let quadro = 0;
      const passo = (t: number) => {
         const p = Math.min(1, (t - inicio) / DURACAO);
         const atual = de + (para - de) * (1 - (1 - p) ** 3);
         setExibido(atual);
         if (p < 1) quadro = requestAnimationFrame(passo);
         else anterior.current = para;
      };
      quadro = requestAnimationFrame(passo);
      return () => {
         cancelAnimationFrame(quadro);
         anterior.current = para;
      };
   }, [value, reduzido]);

   return <span className={className}>{format(reduzido ? value : exibido)}</span>;
}
