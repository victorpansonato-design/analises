/**
 * SegmentedControl (design system §7 e §10.12): controle FÍSICO. Trilho afundado e uma pastilha
 * com espessura que desliza com `spring` (`layoutId` único por instância: dois segmenteds com o
 * mesmo id fazem a pastilha voar entre eles).
 *
 * `fantasma`: a opção marcada ainda é só uma sugestão (ex.: a IA sugeriu "Dispensa"). A pastilha
 * aparece translúcida até alguém confirmar; confirmada, fica sólida. Assim a interface nunca trata
 * sugestão como decisão.
 *
 * Semântica de grupo de rádio: setas movem a seleção, Tab entra e sai do grupo.
 */
import { motion } from "motion/react";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { press, spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
   value: T;
   label: ReactNode;
   /** Texto para leitor de tela quando o rótulo visual é abreviado. */
   ariaLabel?: string;
   count?: number;
   icon?: ReactNode;
   disabled?: boolean;
}

interface SegmentedControlProps<T extends string> {
   options: readonly SegmentedOption<T>[];
   value: T | null;
   onChange: (value: T) => void;
   layoutId: string;
   ariaLabel: string;
   size?: "xs" | "sm";
   full?: boolean;
   fantasma?: boolean;
   disabled?: boolean;
   className?: string;
}

export function SegmentedControl<T extends string>({
   options,
   value,
   onChange,
   layoutId,
   ariaLabel,
   size = "sm",
   full = false,
   fantasma = false,
   disabled = false,
   className,
}: SegmentedControlProps<T>) {
   const refs = useRef<(HTMLButtonElement | null)[]>([]);
   const indiceAtual = options.findIndex(o => o.value === value);

   function mover(e: KeyboardEvent<HTMLDivElement>) {
      const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      const base = indiceAtual < 0 ? 0 : indiceAtual;
      for (let i = 1; i <= options.length; i++) {
         const alvo = (base + delta * i + options.length) % options.length;
         if (!options[alvo].disabled) {
            onChange(options[alvo].value);
            refs.current[alvo]?.focus();
            return;
         }
      }
   }

   return (
      <div
         role="radiogroup"
         aria-label={ariaLabel}
         aria-disabled={disabled || undefined}
         onKeyDown={disabled ? undefined : mover}
         className={cn("seg-track shrink-0 items-center", full && "flex w-full", disabled && "opacity-55", className)}
      >
         {options.map((o, i) => {
            const ativo = o.value === value;
            const focavel = ativo || (indiceAtual < 0 && i === 0);
            return (
               <motion.button
                  key={o.value}
                  ref={el => {
                     refs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={ativo}
                  aria-label={o.ariaLabel}
                  tabIndex={focavel ? 0 : -1}
                  disabled={disabled || o.disabled}
                  whileTap={disabled ? undefined : press}
                  onClick={() => onChange(o.value)}
                  className={cn(
                     "relative flex items-center justify-center gap-1.5 rounded-full whitespace-nowrap transition-colors duration-150 disabled:cursor-not-allowed",
                     size === "xs" ? "h-7 px-2.5 text-[11.5px]" : "h-8 px-3 text-[12.5px]",
                     full && "flex-1",
                     ativo && !fantasma
                        ? "font-semibold text-ink"
                        : ativo
                          ? "font-medium text-ink-2"
                          : "font-medium text-ink-3 hover:text-ink",
                  )}
               >
                  {ativo ? (
                     <motion.span
                        layoutId={layoutId}
                        transition={spring}
                        className={cn("seg-thumb", fantasma && "opacity-45")}
                        aria-hidden
                     />
                  ) : null}
                  <span className="relative z-10 flex items-center gap-1.5">
                     {o.icon}
                     {o.label}
                     {o.count !== undefined ? (
                        <span className={cn("font-mono text-[10.5px] font-medium", ativo ? "text-ink-3" : "text-ink-4")}>{o.count}</span>
                     ) : null}
                  </span>
               </motion.button>
            );
         })}
      </div>
   );
}
