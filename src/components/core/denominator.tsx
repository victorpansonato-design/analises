/**
 * Denominator (design system §10.16): uma taxa nunca é publicada sozinha. O `÷` fica visível de
 * propósito: foi a ausência de separador entre contagem e percentual que produziu `2648,1%`.
 *
 *    24 no prazo ÷ 34 apurados
 */
import { int } from "@/lib/format";
import { cn } from "@/lib/utils";

interface DenominatorProps {
   numerator: number;
   numeratorLabel?: string;
   denominator: number;
   denominatorLabel?: string;
   /** Formata os números (padrão: inteiro pt-BR). */
   format?: (n: number) => string;
   className?: string;
}

export function Denominator({ numerator, numeratorLabel, denominator, denominatorLabel, format = int, className }: DenominatorProps) {
   return (
      <span className={cn("inline-flex flex-wrap items-baseline gap-x-1 text-[12px] text-ink-3", className)}>
         <span className="font-mono font-medium text-ink-2">{format(numerator)}</span>
         {numeratorLabel ? <span>{numeratorLabel}</span> : null}
         <span aria-hidden className="px-0.5 text-ink-4">
            ÷
         </span>
         <span className="sr-only">de</span>
         <span className="font-mono font-medium text-ink-2">{format(denominator)}</span>
         {denominatorLabel ? <span>{denominatorLabel}</span> : null}
      </span>
   );
}
