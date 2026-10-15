/**
 * Rótulo de seção (design system §10.5): sentence case em `text-[12px] font-semibold text-ink-3`,
 * nunca eyebrow mono em caixa alta. O hairline embaixo divide; não fecha forma.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface SectionLabelProps {
   children: ReactNode;
   action?: ReactNode;
   /** Sem a linha divisória embaixo. */
   plain?: boolean;
   as?: "h2" | "h3";
   className?: string;
}

export function SectionLabel({ children, action, plain = false, as: Tag = "h2", className }: SectionLabelProps) {
   return (
      <div className={cn("flex items-baseline justify-between gap-4", !plain && "border-b border-hairline pb-2", className)}>
         <Tag className="text-[12px] font-semibold text-ink-3">{children}</Tag>
         {action}
      </div>
   );
}
