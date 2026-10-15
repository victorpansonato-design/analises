/**
 * MetricSheet (DS §10.17): o aprofundamento que não sai do painel. Sempre a mesma ordem:
 * 1. qual é a medida e sobre qual denominador (por extenso: medida sem denominador não sai);
 * 2. do que ela é feita (linhas com rótulo, valor, `|`, percentual e `MeterBar`);
 * 3. o que ela significa ("Como ler", uma frase sem eufemismo);
 * e a série das últimas semanas. Rodapé com um único "Voltar ao painel"; nenhuma ação de
 * atendimento. Tudo sai do MESMO objeto que montou o cartão: o detalhe não tem como discordar dele.
 */
import { motion } from "motion/react";

import { Drawer } from "@/components/core/overlay";
import { MeterBar } from "@/components/core/meter-bar";
import { SectionLabel } from "@/components/core/section-label";
import { Button } from "@/components/ui/button";
import { definicaoDe } from "@/features/indicadores/domain/definicoes";
import { denominadorPorExtenso, formatarValor, fracaoDaLinha, lerLinha } from "@/features/indicadores/domain/formato";
import type { Indicador } from "@/features/indicadores/types/indicadores.schema";
import { GraficoLinha } from "@/features/indicadores/components/grafico-linha";
import { staggerContainer, staggerItem } from "@/lib/motion";

interface MetricSheetProps {
   indicador: Indicador | null;
   grupo: string | null;
   onFechar: () => void;
}

export function MetricSheet({ indicador, grupo, onFechar }: MetricSheetProps) {
   return (
      <Drawer
         open={indicador !== null}
         onOpenChange={aberto => !aberto && onFechar()}
         title={indicador?.rotulo ?? "Indicador"}
         description={grupo ?? undefined}
         width="md"
         footer={
            <Button variant="secondary" onClick={onFechar} data-autofocus>
               Voltar ao painel
            </Button>
         }
      >
         {indicador ? <Conteudo i={indicador} /> : null}
      </Drawer>
   );
}

function Conteudo({ i }: { i: Indicador }) {
   return (
      <div className="space-y-7 px-5 py-5">
         <section aria-label="Medida">
            <span className="block font-mono text-[42px] leading-none font-medium tracking-tight text-ink tabular-nums">
               {i.valor === null ? "Sem dados" : formatarValor(i.unidade, i.valor)}
            </span>
            <p className="mt-3 text-[13px] text-ink-2">{denominadorPorExtenso(i)}</p>
            {i.detalhe || i.meta ? (
               <p className="mt-1 text-[12px] text-ink-3">{[i.detalhe, i.meta ? `Meta: ${i.meta}` : null].filter(Boolean).join(" · ")}</p>
            ) : null}
            <p className="mt-3 text-[12px] leading-relaxed text-ink-3">{definicaoDe(i)}</p>
         </section>

         <section className="space-y-3">
            <SectionLabel as="h3">Do que é feito</SectionLabel>
            {i.composicao.length === 0 ? (
               <p className="text-[12.5px] text-ink-3">Nenhuma linha para mostrar neste recorte.</p>
            ) : (
               <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="space-y-3">
                  {i.composicao.map(linha => {
                     const texto = lerLinha(i, linha);
                     return (
                        <motion.li key={linha.rotulo} variants={staggerItem}>
                           <div className="flex items-baseline justify-between gap-3">
                              <span className="min-w-0 truncate text-[12.5px] text-ink-2">{linha.rotulo}</span>
                              <span className="flex shrink-0 items-baseline gap-2 font-mono text-[12px] tabular-nums">
                                 <span className="font-medium text-ink">{texto.valor}</span>
                                 {texto.lado ? (
                                    <>
                                       <span aria-hidden className="text-ink-4">
                                          |
                                       </span>
                                       <span className="w-14 text-right text-ink-3">{texto.lado}</span>
                                    </>
                                 ) : null}
                              </span>
                           </div>
                           <MeterBar
                              value={fracaoDaLinha(i.composicao, linha)}
                              tone="ink"
                              height={5}
                              label={`${linha.rotulo}: ${texto.valor}${texto.lado ? `, ${texto.lado}` : ""}`}
                              className="mt-1.5"
                           />
                        </motion.li>
                     );
                  })}
               </motion.ul>
            )}
         </section>

         <section className="rounded-xl bg-surface-2 p-4">
            <h3 className="text-[12px] font-semibold text-ink-3">Como ler</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-ink">{i.comoLer}</p>
         </section>

         <section className="space-y-3">
            <SectionLabel as="h3">Últimas semanas</SectionLabel>
            {i.serie.length > 1 ? (
               <GraficoLinha serie={i.serie} unidade={i.unidade} rotulo={i.rotulo} />
            ) : (
               <p className="text-[12.5px] text-ink-3">Série curta demais para desenhar uma tendência.</p>
            )}
         </section>
      </div>
   );
}
