/**
 * Notice: o Callout do design system (§10.9). O tom vive num trilho de 2 px na esquerda; a caixa é
 * só a superfície recuada. Sem borda em volta, sem fundo tingido de alerta.
 */
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type NoticeTone = "info" | "warn" | "crit" | "ok";

const RAIL: Record<NoticeTone, string> = { info: "bg-brand", warn: "bg-warn", crit: "bg-crit", ok: "bg-ink-4" };
const TEXT: Record<NoticeTone, string> = { info: "text-ink", warn: "text-warn-ink", crit: "text-crit-ink", ok: "text-ink" };

interface NoticeProps {
   tone?: NoticeTone;
   icon?: LucideIcon;
   title?: ReactNode;
   action?: ReactNode;
   className?: string;
   children?: ReactNode;
}

export function Notice({ tone = "info", icon: Icon, title, action, className, children }: NoticeProps) {
   return (
      <div
         role={tone === "crit" ? "alert" : "note"}
         className={cn("relative flex gap-2.5 overflow-hidden rounded-lg bg-surface-2 p-3.5 pl-4", className)}
      >
         <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", RAIL[tone])} />
         {Icon ? <Icon aria-hidden className={cn("mt-px size-4 shrink-0", TEXT[tone])} /> : null}
         <div className="min-w-0 flex-1 text-[12px] leading-relaxed">
            {title ? <p className={cn("font-semibold", TEXT[tone])}>{title}</p> : null}
            {children ? <div className={cn(title && "mt-1", "text-ink-2")}>{children}</div> : null}
         </div>
         {action ? <div className="flex shrink-0 items-start">{action}</div> : null}
      </div>
   );
}
