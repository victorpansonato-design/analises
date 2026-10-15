/**
 * Chip de filtro (design system §10.12). O ativo é TINTA SÓLIDA, não azul: o azul é conquistado e
 * não se gasta em filtro. `crit` existe para o filtro "Só atrasados".
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface ChipProps {
   active: boolean;
   onClick: () => void;
   count?: number;
   tone?: "plain" | "crit";
   icon?: ReactNode;
   className?: string;
   children: ReactNode;
}

export function Chip({ active, onClick, count, tone = "plain", icon, className, children }: ChipProps) {
   return (
      <motion.button
         type="button"
         aria-pressed={active}
         whileTap={press}
         onClick={onClick}
         className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-[12px] whitespace-nowrap transition-colors duration-150",
            active
               ? tone === "crit"
                  ? "bg-crit font-semibold text-white"
                  : "bg-ink font-semibold text-card"
               : "bg-surface-2 font-medium text-ink-3 hover:bg-surface-3 hover:text-ink",
            className,
         )}
      >
         {icon}
         {children}
         {count !== undefined ? <span className="font-mono text-[10.5px] opacity-70">{count}</span> : null}
      </motion.button>
   );
}
