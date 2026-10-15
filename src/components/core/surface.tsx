/**
 * Surface: o Card do design system (§10.2). Uma superfície mais clara e um raio de 12 px. É a
 * receita inteira: sem borda (regra 1) e sem sombra (regra 5). `inset` é um passo de contraste
 * para dentro (preenchimento interno de um card).
 */
import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SurfaceProps extends HTMLAttributes<HTMLElement> {
   as?: ElementType;
   tone?: "plain" | "inset";
   padded?: boolean;
   children: ReactNode;
}

export function Surface({ as: Tag = "section", tone = "plain", padded = true, className, children, ...props }: SurfaceProps) {
   return (
      <Tag className={cn("rounded-xl", tone === "plain" ? "bg-card" : "bg-surface-2", padded && "p-5", className)} {...props}>
         {children}
      </Tag>
   );
}

/** Cabeçalho de card (§10.3). `eyebrow` só quando nomeia uma seção real. */
export function SurfaceHeader({
   title,
   subtitle,
   eyebrow,
   action,
   className,
}: {
   title: ReactNode;
   subtitle?: ReactNode;
   eyebrow?: ReactNode;
   action?: ReactNode;
   className?: string;
}) {
   return (
      <div className={cn("relative flex items-start justify-between gap-4", className)}>
         <div className="min-w-0">
            {eyebrow ? <div className="mb-1 flex items-center gap-1.5 text-[12px] font-medium text-ink-3">{eyebrow}</div> : null}
            <h2 className="text-[15px] leading-tight font-semibold text-ink">{title}</h2>
            {subtitle ? <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-ink-3">{subtitle}</p> : null}
         </div>
         {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
      </div>
   );
}
