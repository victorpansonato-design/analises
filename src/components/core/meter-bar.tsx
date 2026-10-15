/**
 * MeterBar (design system §11): uma proporção contra um alvo. Barra fina, sem rótulo dentro: o
 * número com denominador mora ao lado, em texto. A cor é de status e só muda quando há veredito.
 */
import { motion } from "motion/react";

import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";

export type MeterTone = "brand" | "ink" | "warn" | "crit";

const FILL: Record<MeterTone, string> = {
   brand: "bg-brand",
   ink: "bg-ink-3",
   warn: "bg-warn",
   crit: "bg-crit",
};

interface MeterBarProps {
   /** Fração de 0 a 1 (valores acima de 1 enchem a barra). */
   value: number;
   tone?: MeterTone;
   height?: number;
   /** Texto do valor para leitor de tela, ex.: "48 h de 60 h". */
   label: string;
   className?: string;
}

export function MeterBar({ value, tone = "brand", height = 4, label, className }: MeterBarProps) {
   const largura = `${Math.max(0, Math.min(1, value)) * 100}%`;
   return (
      <div
         role="meter"
         aria-label={label}
         aria-valuemin={0}
         aria-valuemax={100}
         aria-valuenow={Math.round(Math.max(0, Math.min(1, value)) * 100)}
         aria-valuetext={label}
         className={cn("w-full overflow-hidden rounded-full bg-track", className)}
         style={{ height }}
      >
         <motion.div
            className={cn("h-full rounded-full", FILL[tone])}
            initial={{ width: 0 }}
            animate={{ width: largura }}
            transition={{ duration: 0.75, ease: emphasis }}
         />
      </div>
   );
}
