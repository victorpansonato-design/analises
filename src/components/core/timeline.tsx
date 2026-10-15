/**
 * Timeline (design system §10.20): um fio cronológico único. O ícone carrega a fonte; o autor diz
 * se foi uma pessoa, o sistema, a IA ou o próprio candidato. O trilho para no último nó.
 *
 * Anel: `plain` (comum), `crit` (alerta), `brand` (intervenção que muda o caso).
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Timeline({ children, className }: { children: ReactNode; className?: string }) {
   return (
      <ol className={cn("relative", className)}>
         <span aria-hidden className="absolute top-4 left-[13px] w-px bg-hairline" style={{ height: "calc(100% - 2rem)" }} />
         {children}
      </ol>
   );
}

const RING = {
   plain: "bg-surface-2 text-ink-3",
   crit: "bg-crit-soft text-crit-ink",
   brand: "bg-brand-soft text-brand-text",
} as const;

interface TimelineItemProps {
   icon: LucideIcon;
   tone?: keyof typeof RING;
   title: ReactNode;
   stamp: ReactNode;
   detail?: ReactNode;
   children?: ReactNode;
   className?: string;
}

export function TimelineItem({ icon: Icon, tone = "plain", title, stamp, detail, children, className }: TimelineItemProps) {
   return (
      <li className={cn("relative flex gap-3 pb-5 last:pb-0", className)}>
         <span className={cn("relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full", RING[tone])}>
            <Icon className="size-3.5" aria-hidden />
         </span>
         <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
               <p className="text-[12.5px] leading-snug font-semibold text-ink">{title}</p>
               <span className="shrink-0 font-mono text-[10.5px] text-ink-4">{stamp}</span>
            </div>
            {detail ? <div className="mt-1 text-[12px] leading-relaxed text-ink-3">{detail}</div> : null}
            {children}
         </div>
      </li>
   );
}
