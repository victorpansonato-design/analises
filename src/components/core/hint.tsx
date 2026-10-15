/**
 * Hint (design system §10.16): a válvula do progressive disclosure. Nenhuma métrica ambígua fica
 * sem definição e nenhuma definição ocupa espaço permanente. O `title` nativo não abre por teclado,
 * não é lido de forma confiável e demora meio segundo: o controle que explica um número não pode
 * ser o menos acessível da página.
 *
 * Abre no hover, no foco e no toque; fecha no Escape e ao sair. Renderiza em portal (Radix Tooltip)
 * para não ser cortado por contêineres com rolagem.
 */
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Info } from "lucide-react";
import { useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface HintProps {
   /** O que está sendo explicado: vira `aria-label="Como {label} é calculado"`. */
   label: string;
   align?: "left" | "right";
   /** Gatilho próprio (ex.: o nome de uma etapa). Sem ele, usa o ícone de informação. */
   trigger?: ReactNode;
   /** Texto do aria-label quando o gatilho é próprio. */
   triggerLabel?: string;
   className?: string;
   children: ReactNode;
}

export function Hint({ label, align = "left", trigger, triggerLabel, className, children }: HintProps) {
   const [aberto, setAberto] = useState(false);
   return (
      <TooltipPrimitive.Provider delayDuration={120} skipDelayDuration={0}>
         <TooltipPrimitive.Root open={aberto} onOpenChange={setAberto}>
            <TooltipPrimitive.Trigger asChild>
               <button
                  type="button"
                  aria-label={trigger ? (triggerLabel ?? label) : `Como ${label} é calculado`}
                  onClick={() => setAberto(v => !v)}
                  className={cn(
                     "inline-flex items-center rounded-xs transition-colors",
                     trigger ? "text-left" : "size-4 justify-center text-ink-4 hover:text-ink-2",
                     className,
                  )}
               >
                  {trigger ?? <Info className="size-3.5" aria-hidden />}
               </button>
            </TooltipPrimitive.Trigger>
            <TooltipPrimitive.Portal>
               <TooltipPrimitive.Content
                  side="bottom"
                  align={align === "left" ? "start" : "end"}
                  sideOffset={6}
                  collisionPadding={12}
                  className="z-50 w-[268px] rounded-xl bg-card p-3 text-left text-[11.5px] leading-relaxed text-ink-2 shadow-overlay data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0"
               >
                  {children}
               </TooltipPrimitive.Content>
            </TooltipPrimitive.Portal>
         </TooltipPrimitive.Root>
      </TooltipPrimitive.Provider>
   );
}
