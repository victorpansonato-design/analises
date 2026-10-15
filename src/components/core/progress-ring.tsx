/**
 * ProgressRing (design system §11, a versão circular do MeterBar): UMA proporção contra um alvo.
 * Trilho no tom de `track`, preenchimento que só muda de cor quando há veredito, ponta arredondada.
 * O número com denominador mora no centro ou ao lado, em texto; o anel é `role="meter"`.
 * Índice preenche (não conta do zero): o arco cresce na montagem, o texto já nasce no valor final.
 */
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type RingTone = "brand" | "ink" | "warn" | "crit";

const STROKE: Record<RingTone, string> = {
   brand: "stroke-brand",
   ink: "stroke-ink-3",
   warn: "stroke-warn",
   crit: "stroke-crit",
};

interface ProgressRingProps {
   /** Fração de 0 a 1 (acima de 1 fecha o anel). */
   value: number;
   tone?: RingTone;
   size?: number;
   thickness?: number;
   /** Texto do valor para leitor de tela, ex.: "38 de 54 matrículas". */
   label: string;
   children?: ReactNode;
   className?: string;
}

export function ProgressRing({ value, tone = "brand", size = 120, thickness = 10, label, children, className }: ProgressRingProps) {
   const reduzido = useReducedMotion();
   const fracao = Math.max(0, Math.min(1, value));
   const raio = (size - thickness) / 2;
   const circunferencia = 2 * Math.PI * raio;
   return (
      <div
         role="meter"
         aria-label={label}
         aria-valuemin={0}
         aria-valuemax={100}
         aria-valuenow={Math.round(fracao * 100)}
         aria-valuetext={label}
         className={cn("relative inline-grid shrink-0 place-items-center", className)}
         style={{ width: size, height: size }}
      >
         <svg width={size} height={size} aria-hidden className="absolute inset-0 -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={raio} fill="none" strokeWidth={thickness} className="stroke-track" />
            <motion.circle
               cx={size / 2}
               cy={size / 2}
               r={raio}
               fill="none"
               strokeWidth={thickness}
               strokeLinecap="round"
               strokeDasharray={circunferencia}
               className={STROKE[tone]}
               initial={{ strokeDashoffset: reduzido ? circunferencia * (1 - fracao) : circunferencia }}
               animate={{ strokeDashoffset: circunferencia * (1 - fracao) }}
               transition={{ duration: 0.85, ease: emphasis }}
               style={{ opacity: fracao === 0 ? 0 : 1 }}
            />
         </svg>
         {children ? <div className="relative flex flex-col items-center text-center">{children}</div> : null}
      </div>
   );
}
