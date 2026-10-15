/**
 * StatTile (design system §10.6): um número com rótulo numa superfície. Com `onClick` vira botão
 * (hover só de cor, `whileTap={press}`). `accent` recebe a cor de status quando o número carrega
 * veredito; um tile que filtra mostra "filtrado" no rodapé enquanto o filtro dele está ativo.
 */
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface StatTileProps {
   label: ReactNode;
   value: ReactNode;
   detail?: ReactNode;
   footer?: ReactNode;
   icon?: ReactNode;
   accent?: "crit" | "warn" | "brand";
   tone?: "plain" | "band";
   onClick?: () => void;
   active?: boolean;
   className?: string;
}

const ACCENT = { crit: "text-crit-ink", warn: "text-warn-ink", brand: "text-brand-text" } as const;

export function StatTile({ label, value, detail, footer, icon, accent, tone = "plain", onClick, active, className }: StatTileProps) {
   const corpo = (
      <>
         <div className="flex items-start justify-between gap-3">
            <span className="text-[12px] font-medium text-ink-3">{label}</span>
            {icon ? <span className="text-ink-4">{icon}</span> : null}
         </div>
         <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("font-mono text-[24px] leading-none font-medium tracking-tight", accent ? ACCENT[accent] : "text-ink")}>
               {value}
            </span>
            {detail ? <span className="text-[12px] text-ink-3">{detail}</span> : null}
         </div>
         {footer || active ? (
            <div className="mt-3 flex items-center justify-between gap-2 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
               {footer}
               {active ? <span className="font-mono font-semibold text-brand-text">filtrado</span> : null}
            </div>
         ) : null}
      </>
   );
   const base = cn("flex flex-col rounded-xl p-4 text-left", tone === "band" ? "bg-surface-2" : "bg-card", className);
   if (!onClick) return <div className={base}>{corpo}</div>;
   return (
      <motion.button
         type="button"
         whileTap={press}
         onClick={onClick}
         aria-pressed={active}
         className={cn(base, "transition-colors hover:bg-surface-hover")}
      >
         {corpo}
      </motion.button>
   );
}
