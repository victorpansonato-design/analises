/**
 * Status (design system §12): um VEREDITO sobre o qual talvez seja preciso agir. Ponto colorido +
 * palavra, sem preenchimento e sem contorno. Dez linhas de balão tingido viram um saco de balas;
 * dez linhas de palavra pontuada varrem numa passada e ainda deixam a linha crítica pular.
 *
 * - O estado saudável (`ok`) não tem ponto: não há nada a fazer, então a linha fica em silêncio.
 * - `solid` gasta peso de tinta (não fundo) quando o veredito é o ponto da linha. Só `crit` fica
 *   vermelho.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type StatusTone = "ok" | "warn" | "risk" | "crit" | "info" | "neutral" | "muted";

const DOT: Record<StatusTone, string> = {
   ok: "",
   warn: "bg-warn",
   risk: "bg-risk",
   crit: "bg-crit",
   info: "bg-info",
   neutral: "bg-ink-4",
   muted: "bg-ink-4",
};

const EMPHASIS_INK: Record<StatusTone, string> = {
   ok: "text-ink-2",
   warn: "text-warn-ink",
   risk: "text-risk-ink",
   crit: "text-crit-ink",
   info: "text-brand-text",
   neutral: "text-ink-2",
   muted: "text-ink-3",
};

interface StatusProps {
   tone?: StatusTone;
   /** Este veredito é o ponto da linha: ganha peso de tinta. */
   solid?: boolean;
   /** Valor que é código ou contagem regressiva (alinha em coluna). */
   mono?: boolean;
   className?: string;
   children: ReactNode;
}

export function Status({ tone = "neutral", solid = false, mono = false, className, children }: StatusProps) {
   const semPonto = tone === "ok";
   return (
      <span
         className={cn(
            "inline-flex shrink-0 items-center gap-1.5 text-[12px] whitespace-nowrap",
            solid ? `font-semibold ${EMPHASIS_INK[tone]}` : semPonto ? "font-medium text-ink-3" : "font-medium text-ink-2",
            mono && "font-mono",
            className,
         )}
      >
         {semPonto ? null : <span aria-hidden className={cn("size-1.25 shrink-0 rounded-full", DOT[tone])} />}
         {children}
      </span>
   );
}
