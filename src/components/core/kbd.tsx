/** Tecla de atalho (`⌘K`, `J`). Mono porque é valor de interface, não rótulo. */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
   return (
      <kbd
         className={cn(
            "inline-flex h-5 min-w-5 items-center justify-center rounded-xs bg-surface-2 px-1 font-mono text-[10.5px] font-medium text-ink-3",
            className,
         )}
      >
         {children}
      </kbd>
   );
}
