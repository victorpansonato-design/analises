/**
 * EmptyPanel (design system §10.11): um vazio SEMPRE explica por quê e oferece a saída. Nunca uma
 * lista vazia sem frase. Também serve ao estado de erro (com a mensagem da fonte e "Tentar de novo").
 */
import { Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface EmptyPanelProps {
   title: ReactNode;
   message?: ReactNode;
   icon?: LucideIcon;
   action?: ReactNode;
   compact?: boolean;
   tone?: "plain" | "crit";
   className?: string;
}

export function EmptyPanel({ title, message, icon: Icon = Inbox, action, compact = false, tone = "plain", className }: EmptyPanelProps) {
   return (
      <div
         role={tone === "crit" ? "alert" : undefined}
         className={cn(
            "flex flex-col items-center justify-center text-center",
            compact ? "gap-2 px-6 py-10" : "gap-3 px-6 py-16",
            className,
         )}
      >
         <div
            className={cn(
               "flex size-10 items-center justify-center rounded-xl",
               tone === "crit" ? "bg-crit-soft text-crit-ink" : "bg-surface-2 text-ink-4",
            )}
         >
            <Icon className="size-5" aria-hidden />
         </div>
         <div>
            <p className="text-[13px] font-semibold text-ink">{title}</p>
            {message ? <p className="mx-auto mt-1 max-w-sm text-[12px] leading-relaxed text-ink-3">{message}</p> : null}
         </div>
         {action}
      </div>
   );
}
