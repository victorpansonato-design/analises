/**
 * Conversão por responsável (docs/10 §3). Só existe para a gestão comercial (`GESTAO`)
 * (`VER_INDICADORES_POR_PESSOA`): a API nem envia o indicador para os outros papéis. Cada linha
 * traz o seu denominador; com poucos casos a diferença entre pessoas não é desempenho.
 */
import { motion } from "motion/react";

import { Denominator } from "@/components/core/denominator";
import { MeterBar } from "@/components/core/meter-bar";
import { SectionLabel } from "@/components/core/section-label";
import { Button } from "@/components/ui/button";
import type { Indicador } from "@/features/indicadores/types/indicadores.schema";
import { percent } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

export function PorResponsavel({ indicador, onAbrir }: { indicador: Indicador; onAbrir: (id: string) => void }) {
   return (
      <section className="space-y-3" aria-labelledby="ind-por-responsavel">
         <SectionLabel
            action={
               <Button variant="ghost" size="xs" onClick={() => onAbrir(indicador.id)}>
                  Ver detalhe
               </Button>
            }
         >
            <span id="ind-por-responsavel">Por responsável</span>
         </SectionLabel>
         <div className="rounded-xl bg-card p-4">
            {indicador.composicao.length === 0 ? (
               <p className="text-[12.5px] text-ink-3">Nenhum caso com análise concluída neste recorte.</p>
            ) : (
               <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="divide-y divide-hairline">
                  {indicador.composicao.map(l => (
                     <motion.li
                        key={l.rotulo}
                        variants={staggerItem}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-2.5 first:pt-0 last:pb-0"
                     >
                        <span className="truncate text-[13px] text-ink">{l.rotulo}</span>
                        <span className="flex items-baseline gap-3">
                           <Denominator
                              numerator={l.valor}
                              numeratorLabel="matricularam"
                              denominator={l.denominador ?? 0}
                              denominatorLabel="recebidos"
                           />
                           <span className="w-12 text-right font-mono text-[12.5px] font-medium text-ink tabular-nums">
                              {l.percentual === null ? "sem casos" : percent(l.percentual, 0)}
                           </span>
                        </span>
                        <MeterBar
                           value={l.percentual ?? 0}
                           tone="ink"
                           height={5}
                           label={`${l.rotulo}: ${l.percentual === null ? "sem casos" : percent(l.percentual, 0)}`}
                           className="col-span-2"
                        />
                     </motion.li>
                  ))}
               </motion.ul>
            )}
            <p className="mt-3 border-t border-hairline pt-2.5 text-[11.5px] text-ink-3">{indicador.comoLer}</p>
         </div>
      </section>
   );
}
