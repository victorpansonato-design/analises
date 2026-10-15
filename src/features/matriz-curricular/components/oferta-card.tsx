/**
 * Um curso numa modalidade (a oferta) com os seus currículos ativos. Cada currículo é uma linha
 * clicável que abre a página dele; os inativos ficam fora e viram uma linha discreta de contagem.
 */
import { motion } from "motion/react";
import { ChevronRight } from "lucide-react";

import { Surface } from "@/components/core/surface";
import { fullDate, horas, plural } from "@/lib/format";
import { pressSubtle } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { ROTULO_MODALIDADE_MATRIZ, ROTULO_TURNO_MATRIZ, type OfertaMatriz } from "@/features/matriz-curricular/types/matriz.schema";

export function OfertaCard({ oferta, onAbrir }: { oferta: OfertaMatriz; onAbrir: (id: string) => void }) {
   const presencial = oferta.modalidade === "PRESENCIAL";
   const modalidade = ROTULO_MODALIDADE_MATRIZ[oferta.modalidade];

   return (
      <Surface as="article" padded={false} className="overflow-hidden" aria-label={`${oferta.curso}, ${modalidade}`}>
         <header className="flex items-baseline justify-between gap-4 px-5 pt-4 pb-3">
            <div className="flex min-w-0 items-baseline gap-3">
               <h2 className="truncate text-[15px] leading-tight font-semibold text-ink">{oferta.curso}</h2>
               <span className="text-[12.5px] text-ink-3">{modalidade}</span>
            </div>
            <span className="shrink-0 text-[12px] text-ink-3">
               Código <span className="font-mono font-medium text-ink-2">{oferta.codigo}</span>
            </span>
         </header>

         {oferta.curriculos.length ? (
            <ul className="divide-y divide-hairline border-t border-hairline">
               {oferta.curriculos.map(c => (
                  <li key={c.id}>
                     <motion.button
                        type="button"
                        whileTap={pressSubtle}
                        onClick={() => onAbrir(c.id)}
                        aria-label={`Abrir ${c.rotulo}${c.turno ? `, ${ROTULO_TURNO_MATRIZ[c.turno]}` : ""}, ${oferta.curso} ${modalidade}`}
                        className={cn(
                           "grid w-full items-center gap-4 px-5 py-3 text-left transition-colors hover:bg-surface-hover",
                           presencial
                              ? "grid-cols-[minmax(0,1fr)_96px_170px_80px_110px_16px]"
                              : "grid-cols-[minmax(0,1fr)_170px_80px_110px_16px]",
                        )}
                     >
                        <span className="flex min-w-0 items-baseline gap-2.5">
                           <span className="text-[13px] font-medium text-ink">{c.rotulo}</span>
                           <span className="truncate font-mono text-[11.5px] text-ink-3">{c.codigo}</span>
                        </span>
                        {presencial ? (
                           <span className="text-[12.5px] text-ink-2">{c.turno ? ROTULO_TURNO_MATRIZ[c.turno] : null}</span>
                        ) : null}
                        <span className="text-[12px] text-ink-3">Vigência desde {fullDate(c.vigenciaInicio)}</span>
                        <span className="text-right font-mono text-[12.5px] text-ink-2">{horas(c.chTotal)}</span>
                        <span className="text-right text-[12px] text-ink-3">{plural(c.totalDisciplinas, "disciplina", "disciplinas")}</span>
                        <ChevronRight className="size-4 text-ink-4" aria-hidden />
                     </motion.button>
                  </li>
               ))}
            </ul>
         ) : (
            <p className="border-t border-hairline px-5 py-3 text-[12.5px] text-ink-3">Nenhum currículo ativo nesta oferta.</p>
         )}

         {oferta.inativos ? (
            <p className="border-t border-hairline px-5 py-2.5 text-[11.5px] text-ink-4">
               {plural(oferta.inativos, "currículo inativo oculto", "currículos inativos ocultos")}
            </p>
         ) : null}
      </Surface>
   );
}
