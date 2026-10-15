/**
 * Cartão de um indicador (DS §10.6/§10.7/§10.16). Superfície `bg-card`, sem borda e sem sombra.
 *
 * - Taxa SEMPRE com `Denominator` ("312 matriculados ÷ 845 com análise concluída"); medida sobre uma
 *   base mostra a base por extenso.
 * - `destaque` é o único acento azul da fileira (DS regra 4): o número que responde "e agora?".
 * - Taxa e índice não contam do zero (`countUp={false}`); só contagem inteira conta.
 * - O cartão inteiro abre o MetricSheet (botão esticado), mas o `Hint` fica por cima: dois controles
 *   sem um botão dentro do outro.
 */
import { motion } from "motion/react";

import { AnimatedNumber } from "@/components/core/animated-number";
import { Denominator } from "@/components/core/denominator";
import { Hint } from "@/components/core/hint";
import { definicaoDe } from "@/features/indicadores/domain/definicoes";
import { contaDoZero, ehTaxa, formatarValor } from "@/features/indicadores/domain/formato";
import type { Indicador } from "@/features/indicadores/types/indicadores.schema";
import { Sparkline } from "@/features/indicadores/components/sparkline";
import { int } from "@/lib/format";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface CartaoIndicadorProps {
   indicador: Indicador;
   destaque?: boolean;
   onAbrir: (id: string) => void;
}

export function BaseDoIndicador({ indicador: i, className }: { indicador: Indicador; className?: string }) {
   if (ehTaxa(i)) {
      return (
         <Denominator
            numerator={i.numerador as number}
            numeratorLabel={i.numeradorRotulo ?? undefined}
            denominator={i.denominador as number}
            denominatorLabel={i.denominadorRotulo ?? undefined}
            className={className}
         />
      );
   }
   if (i.denominador === null) return null;
   return (
      <span className={cn("text-[12px] text-ink-3", className)}>
         sobre <span className="font-mono font-medium text-ink-2">{int(i.denominador)}</span> {i.denominadorRotulo}
      </span>
   );
}

export function CartaoIndicador({ indicador: i, destaque = false, onAbrir }: CartaoIndicadorProps) {
   const formato = (v: number) => formatarValor(i.unidade, v);
   return (
      <article className="group relative flex min-h-[176px] flex-col rounded-xl bg-card p-4 transition-colors hover:bg-surface-hover">
         <div className="flex items-start justify-between gap-2">
            <h3 className="text-[12px] font-medium text-ink-3">{i.rotulo}</h3>
            <Hint label={i.rotulo.toLowerCase()} align="right" className="relative z-10">
               {definicaoDe(i)}
            </Hint>
         </div>
         <motion.button
            type="button"
            whileTap={press}
            onClick={() => onAbrir(i.id)}
            aria-label={`${i.rotulo}: ${i.valor === null ? "sem dados" : formato(i.valor)}. Abrir detalhe`}
            className="mt-2 flex items-baseline gap-2 text-left outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-focus"
         >
            {i.valor === null ? (
               <span className="text-[15px] font-medium text-ink-4">Sem dados no recorte</span>
            ) : (
               <AnimatedNumber
                  value={i.valor}
                  format={formato}
                  countUp={contaDoZero(i)}
                  className={cn(
                     "font-mono text-[24px] leading-none font-medium tracking-tight tabular-nums",
                     destaque ? "text-brand-text" : "text-ink",
                  )}
               />
            )}
         </motion.button>
         {i.detalhe ? <p className="mt-1.5 truncate text-[12px] text-ink-3">{i.detalhe}</p> : null}
         <Sparkline serie={i.serie} destaque={destaque} className="mt-3" />
         <footer className="mt-auto flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 border-t border-hairline pt-2.5">
            <BaseDoIndicador indicador={i} className="text-[11.5px]" />
            {i.meta ? <span className="text-[11px] text-ink-3">Meta: {i.meta}</span> : null}
         </footer>
      </article>
   );
}
