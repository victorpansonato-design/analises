/**
 * Resumo da análise (docs/06 §1 e §6), em faixa acima da grade. A lateral é reservada às observações.
 * Regras:
 *
 * - Aproveitamento sempre com denominador ("1.020 h de 3.200 h") e percentual da CH do curso.
 * - Ingresso é SUGESTÃO até a analista confirmar (PATCH); previsão de semestres é sempre
 *   "estimativa" e "depende da oferta de disciplinas".
 * - `Concluir análise` NÃO mora aqui (é a ação primária do card "Próximo passo"). Aqui só "Faltam N
 *   decisões" e a lista de bloqueios clicáveis, que levam até a linha.
 */
import { ArrowRight, CircleAlert } from "lucide-react";
import { motion } from "motion/react";
import type { ReactNode } from "react";

import { AnimatedNumber } from "@/components/core/animated-number";
import { CONTROL } from "@/components/core/field";
import { MeterBar } from "@/components/core/meter-bar";
import { Button } from "@/components/ui/button";
import { ROTULO_TURNO, type CasoDetalhe } from "@/features/casos";
import { horas, int, ordinal, percent, plural } from "@/lib/format";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { aproveitamento } from "@/features/analise/domain/analise.domain";
import type { Analise } from "@/features/analise/types/analise.schema";

interface ResumoAnaliseProps {
   caso: CasoDetalhe;
   analise: Analise;
   podeDecidir: boolean;
   salvandoIngresso: boolean;
   onDefinirIngresso: (periodo: number) => void;
   onIrParaItem: (itemId: string) => void;
}

function Bloco({ titulo, children, className }: { titulo: string; children: ReactNode; className?: string }) {
   return (
      <div className={cn("min-w-0 space-y-1.5", className)}>
         <h3 className="text-[12px] font-semibold text-ink-3">{titulo}</h3>
         {children}
      </div>
   );
}

export function ResumoAnalise({ caso, analise, podeDecidir, salvandoIngresso, onDefinirIngresso, onIrParaItem }: ResumoAnaliseProps) {
   const r = analise.resumo;
   const fracao = aproveitamento(r.chDispensada, r.chTotalMatriz);
   const c = r.contagem;
   const faltam = c.pendentes;
   const periodo = r.periodoIngresso ?? r.periodoIngressoSugerido;
   const confirmado = r.periodoIngresso !== null;
   const periodos = Array.from({ length: analise.matriz.periodos }, (_, i) => i + 1);

   return (
      <aside
         aria-label="Resumo da análise"
         className={cn("rounded-xl bg-card p-4", "grid gap-4 sm:grid-cols-2 2xl:grid-cols-4", "print:hidden")}
      >
         <Bloco titulo="Aproveitamento">
            <p className="text-[15px] font-semibold text-ink">
               <span className="font-mono">{horas(r.chDispensada)}</span> <span className="font-normal text-ink-3">de</span>{" "}
               <span className="font-mono">{horas(r.chTotalMatriz)}</span>
            </p>
            <p className="text-[12px] text-ink-3">{percent(fracao)} da CH do curso</p>
            <MeterBar value={fracao} label={`${horas(r.chDispensada)} de ${horas(r.chTotalMatriz)}`} />
         </Bloco>

         <Bloco titulo="Disciplinas">
            <p className="text-[12.5px] text-ink-2">
               <span className="font-mono">{int(c.dispensa)}</span> dispensa · <span className="font-mono">{int(c.regular)}</span> regular ·{" "}
               <span className="font-mono">{int(c.dp)}</span> DP · <span className="font-mono">{int(c.adap)}</span> ADAP
            </p>
            <p className={cn("text-[12.5px]", faltam > 0 ? "font-semibold text-ink" : "text-ink-3")}>
               {faltam > 0 ? (
                  <>
                     Faltam <AnimatedNumber value={faltam} format={int} /> {faltam === 1 ? "decisão" : "decisões"}
                  </>
               ) : (
                  "Todas as disciplinas decididas"
               )}
            </p>
            {c.perguntas > 0 ? <p className="text-[12px] text-ink-3">Perguntas à coordenação: {int(c.perguntas)}</p> : null}
         </Bloco>

         <Bloco titulo={confirmado ? "Ingresso confirmado" : "Ingresso sugerido"}>
            <p className="text-[13px] font-medium text-ink">
               {periodo === null ? "Não informado" : `${ordinal(periodo)} período`} · {ROTULO_TURNO[caso.destino.turno]}
            </p>
            {podeDecidir ? (
               <div className="flex flex-wrap items-center gap-2">
                  {!confirmado && periodo !== null ? (
                     <Button
                        className="acao-destaque"
                        data-tom="novas"
                        size="xs"
                        onClick={() => onDefinirIngresso(periodo)}
                        disabled={salvandoIngresso}
                     >
                        Confirmar {ordinal(periodo)} período
                     </Button>
                  ) : null}
                  <label className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                     <span>{confirmado ? "Alterar" : "Outro"}</span>
                     <select
                        value={r.periodoIngresso ?? ""}
                        disabled={salvandoIngresso}
                        onChange={e => e.target.value && onDefinirIngresso(Number(e.target.value))}
                        className={cn(CONTROL, "h-7 w-auto pr-7 text-[12px]")}
                     >
                        <option value="">Período</option>
                        {periodos.map(p => (
                           <option key={p} value={p}>
                              {ordinal(p)}
                           </option>
                        ))}
                     </select>
                  </label>
               </div>
            ) : !confirmado ? (
               <p className="text-[11.5px] text-ink-4">É sugestão: a analista confirma o período.</p>
            ) : null}
            <p className="text-[12px] text-ink-2">
               Previsão: {r.previsaoSemestres === null ? "não calculada" : plural(r.previsaoSemestres, "semestre", "semestres")}{" "}
               (estimativa)
            </p>
            <p className="text-[11.5px] text-ink-4">Depende da oferta de disciplinas.</p>
         </Bloco>

         <Bloco titulo={r.bloqueios.length ? `Para concluir (${r.bloqueios.length})` : "Para concluir"}>
            {r.bloqueios.length === 0 ? (
               <p className="text-[12px] text-ink-3">Nada bloqueia a conclusão. Conclua pelo card Próximo passo.</p>
            ) : (
               <ul className="space-y-1">
                  {r.bloqueios.map((b, i) => (
                     <li key={`${b.mensagem}-${i}`} className="flex items-start gap-1.5 text-[12px] text-ink-2">
                        <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                        <span className="min-w-0 flex-1">
                           {b.mensagem}
                           {b.itemId ? (
                              <motion.button
                                 type="button"
                                 whileTap={press}
                                 onClick={() => b.itemId && onIrParaItem(b.itemId)}
                                 className="ml-1.5 inline-flex items-center gap-0.5 rounded-full font-medium text-brand-text transition-colors hover:text-ink"
                              >
                                 Ir para o item <ArrowRight aria-hidden className="size-3" />
                              </motion.button>
                           ) : null}
                        </span>
                     </li>
                  ))}
               </ul>
            )}
         </Bloco>
      </aside>
   );
}
