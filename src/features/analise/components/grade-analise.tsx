/**
 * Grade da análise agrupada por período (colapsável). É um `role="grid"` com `data-atalhos-locais`:
 * os atalhos globais da tela (J/K, 1–5…) ignoram o que acontece aqui dentro, e a grade trata as
 * suas teclas (docs/06 §5) no `onKeyDown` recebido do workspace. Foco "itinerante": só a linha
 * focada está na ordem de Tab; as setas movem entre linhas.
 */
import { ChevronDown } from "lucide-react";
import { motion } from "motion/react";
import type { KeyboardEvent, Ref } from "react";

import { Button } from "@/components/ui/button";
import { plural } from "@/lib/format";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { LinhaItem, type AcoesLinha } from "@/features/analise/components/linha-item";
import { COLUNAS_GRADE } from "@/features/analise/components/grade-layout";
import { tituloPeriodo, type GrupoPeriodo } from "@/features/analise/domain/analise.domain";
import type { ItemOrigem } from "@/features/analise/types/analise.schema";

interface GradeAnaliseProps {
   grupos: GrupoPeriodo[];
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   focoId: string | null;
   selecionados: ReadonlySet<string>;
   expandidos: ReadonlySet<string>;
   colapsados: ReadonlySet<string>;
   podeDecidir: boolean;
   podePerguntar: boolean;
   layoutBase: string;
   acoes: AcoesLinha;
   onAlternarGrupo: (chave: string) => void;
   onMarcarRegular: (grupo: GrupoPeriodo) => void;
   onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => void;
   gridRef: Ref<HTMLDivElement>;
}

export function GradeAnalise({
   grupos,
   origemPorId,
   focoId,
   selecionados,
   expandidos,
   colapsados,
   podeDecidir,
   podePerguntar,
   layoutBase,
   acoes,
   onAlternarGrupo,
   onMarcarRegular,
   onKeyDown,
   gridRef,
}: GradeAnaliseProps) {
   return (
      <div
         ref={gridRef}
         role="grid"
         aria-label="Disciplinas da matriz de destino"
         aria-multiselectable={podeDecidir || undefined}
         data-atalhos-locais
         onKeyDown={onKeyDown}
         className="space-y-3 print:hidden"
      >
         {grupos.map(g => {
            const fechado = colapsados.has(g.chave);
            const idCorpo = `${layoutBase}-${g.chave}`;
            return (
               <div key={g.chave} role="rowgroup" className="overflow-hidden rounded-xl bg-card">
                  <div role="row" className="grade-periodo flex items-center justify-between gap-3 border-b border-white/20 px-3 py-1.5">
                     <div role="rowheader" className="min-w-0">
                        <motion.button
                           type="button"
                           whileTap={press}
                           onClick={() => onAlternarGrupo(g.chave)}
                           aria-expanded={!fechado}
                           aria-controls={idCorpo}
                           className="flex items-center gap-2 rounded-full text-left transition-colors"
                        >
                           <ChevronDown aria-hidden className={cn("size-3.5 transition-transform duration-150", fechado && "-rotate-90")} />
                           <span className="text-[13px] font-semibold">{tituloPeriodo(g.periodo)}</span>
                           <span className="text-[12px]">
                              {plural(g.itens.length, "disciplina", "disciplinas")} · {plural(g.dispensadas, "dispensada", "dispensadas")} ·{" "}
                              {plural(g.itens.length - g.decididas, "pendente", "pendentes")}
                           </span>
                        </motion.button>
                     </div>
                     {podeDecidir ? (
                        <div role="gridcell" className="shrink-0">
                           <Button variant="ghost" size="xs" onClick={() => onMarcarRegular(g)}>
                              Marcar período como Regular
                           </Button>
                        </div>
                     ) : null}
                  </div>
                  {fechado ? null : (
                     <div id={idCorpo} className="overflow-x-auto">
                        <div
                           role="row"
                           className={cn(
                              COLUNAS_GRADE,
                              "border-b border-hairline bg-surface-2/60 py-1.5 text-[11px] font-medium text-ink-2",
                           )}
                        >
                           <span role="columnheader">
                              <span className="sr-only">Seleção</span>
                           </span>
                           <span role="columnheader">Disciplina</span>
                           <span role="columnheader">Código</span>
                           <span role="columnheader" className="text-right">
                              CH
                           </span>
                           <span role="columnheader" className="text-center">
                              Cursado em
                           </span>
                           <span role="columnheader" className="text-right">
                              Nota
                           </span>
                           <span role="columnheader">
                              <span className="sr-only">Opções</span>
                           </span>
                           <span role="columnheader">
                              <span className="sr-only">Ações</span>
                           </span>
                        </div>
                        <div className="min-w-[760px] divide-y divide-hairline">
                           {g.itens.map(item => (
                              <LinhaItem
                                 key={item.id}
                                 item={item}
                                 origemPorId={origemPorId}
                                 focado={focoId === item.id}
                                 selecionado={selecionados.has(item.id)}
                                 expandido={expandidos.has(item.id)}
                                 podeDecidir={podeDecidir}
                                 podePerguntar={podePerguntar}
                                 layoutBase={layoutBase}
                                 acoes={acoes}
                              />
                           ))}
                        </div>
                     </div>
                  )}
               </div>
            );
         })}
      </div>
   );
}
