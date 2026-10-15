/**
 * Tag (design system §12): um FATO sobre o registro (tipo, modalidade, código). Chip preenchido
 * quieto em `ink-3`. Não carrega urgência, então não ganha cor nem ponto: assim nunca se confunde
 * com um Status.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface TagProps {
   mono?: boolean;
   className?: string;
   title?: string;
   children: ReactNode;
}

export function Tag({ mono = false, className, title, children }: TagProps) {
   return (
      <span
         title={title}
         className={cn(
            "inline-flex shrink-0 items-center rounded-sm bg-surface-2 px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap text-ink-3",
            mono && "font-mono",
            className,
         )}
      >
         {children}
      </span>
   );
}
