/**
 * Abas sublinhadas (design system §10.10). O sublinhado desliza com `layoutId` (220 ms, emphasis);
 * contador em mono. Setas esquerda/direita navegam entre as abas (padrão WAI-ARIA de tablist com
 * ativação automática), Home e End vão às pontas.
 */
import { motion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface TabOption<T extends string> {
   value: T;
   label: ReactNode;
   count?: ReactNode;
}

interface UnderlineTabsProps<T extends string> {
   tabs: readonly TabOption<T>[];
   value: T;
   onChange: (value: T) => void;
   layoutId: string;
   ariaLabel: string;
   /** Prefixo dos ids (`{idBase}-tab-{value}` e `{idBase}-panel-{value}`). */
   idBase: string;
   className?: string;
}

export function UnderlineTabs<T extends string>({ tabs, value, onChange, layoutId, ariaLabel, idBase, className }: UnderlineTabsProps<T>) {
   const refs = useRef<(HTMLButtonElement | null)[]>([]);

   function teclar(e: KeyboardEvent<HTMLDivElement>) {
      const atual = tabs.findIndex(t => t.value === value);
      let alvo = -1;
      if (e.key === "ArrowRight") alvo = (atual + 1) % tabs.length;
      else if (e.key === "ArrowLeft") alvo = (atual - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") alvo = 0;
      else if (e.key === "End") alvo = tabs.length - 1;
      if (alvo < 0) return;
      e.preventDefault();
      onChange(tabs[alvo].value);
      refs.current[alvo]?.focus();
   }

   return (
      <div
         role="tablist"
         aria-label={ariaLabel}
         onKeyDown={teclar}
         className={cn("scroll-slim -mb-px flex gap-1 overflow-x-auto border-b border-hairline", className)}
      >
         {tabs.map((t, i) => {
            const ativo = t.value === value;
            return (
               <button
                  key={t.value}
                  ref={el => {
                     refs.current[i] = el;
                  }}
                  id={`${idBase}-tab-${t.value}`}
                  role="tab"
                  type="button"
                  aria-selected={ativo}
                  aria-controls={`${idBase}-panel-${t.value}`}
                  tabIndex={ativo ? 0 : -1}
                  onClick={() => onChange(t.value)}
                  className={cn(
                     "relative shrink-0 px-3.5 py-2.5 text-[13px] whitespace-nowrap transition-colors duration-150",
                     ativo ? "font-semibold text-ink" : "font-medium text-ink-3 hover:text-ink",
                  )}
               >
                  <span className="flex items-center gap-1.5">
                     {t.label}
                     {t.count !== undefined ? (
                        <span
                           className={cn(
                              "rounded-sm px-1.5 py-px font-mono text-[10px] font-medium",
                              ativo ? "bg-surface-3 text-ink-2" : "bg-surface-2 text-ink-4",
                           )}
                        >
                           {t.count}
                        </span>
                     ) : null}
                  </span>
                  {ativo ? (
                     <motion.span
                        layoutId={layoutId}
                        transition={{ duration: 0.22, ease: emphasis }}
                        className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand"
                     />
                  ) : null}
               </button>
            );
         })}
      </div>
   );
}
