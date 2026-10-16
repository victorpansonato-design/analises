/**
 * A matriz atual na conferência (lado direito): uma linha por disciplina, por período, com código,
 * nome, CH, a nota da origem e a decisão (Dispensa, DP, ADAP, Regular). Igual ao que a grade já
 * mostra, mais compacto para caber ao lado do histórico.
 *
 * - Clicar na linha (inclusive na decisão) seleciona: o histórico à esquerda grifa as origens dela.
 * - Pergunta aberta à coordenação mostra "Aguardando parecer" no lugar da decisão; com
 *   `marcarPerguntas` (coordenação), as perguntas ganham o ícone de conversa.
 * - O ponto âmbar com brilho marca onde a IA está em dúvida; o filtro "Dúvidas da IA" mostra só elas.
 * - A linha selecionada tem um fundo que desliza de uma linha para a outra (`layoutId`).
 * - Opção pré-marcada pela IA aparece translúcida até alguém confirmar (`fantasma`).
 */
import { motion } from "motion/react";
import { MessageSquareText, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef } from "react";

import { SegmentedControl } from "@/components/core/segmented-control";
import { Status } from "@/components/core/status";
import { decimal, horas } from "@/lib/format";
import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { DecisaoItem } from "@/features/casos";

import { iaEmDuvida } from "@/features/analise/domain/conferencia";
import {
   OPCOES_DECISAO,
   agruparPorPeriodo,
   decisaoExibida,
   origensDoItem,
   paraCoordenacao,
   tituloPeriodo,
} from "@/features/analise/domain/analise.domain";
import type { ItemAnalise, ItemOrigem } from "@/features/analise/types/analise.schema";

const LINHA = "grid grid-cols-[84px_minmax(0,1fr)_48px_40px_228px] items-center gap-x-3";

interface MatrizConferenciaProps {
   itens: readonly ItemAnalise[];
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   selecionadoId: string | null;
   podeDecidir: boolean;
   marcarPerguntas?: boolean;
   onSelecionar: (id: string) => void;
   onDecidir: (item: ItemAnalise, valor: DecisaoItem) => void;
}

export function MatrizConferencia({
   itens,
   origemPorId,
   selecionadoId,
   podeDecidir,
   marcarPerguntas = false,
   onSelecionar,
   onDecidir,
}: MatrizConferenciaProps) {
   const grupos = agruparPorPeriodo([...itens]);
   const linhas = useRef(new Map<string, HTMLDivElement>());

   // Navegação por teclado ou "Próxima dúvida" traz a linha para a vista, sem saltar.
   useEffect(() => {
      if (selecionadoId) linhas.current.get(selecionadoId)?.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
   }, [selecionadoId]);

   return (
      <div role="grid" aria-label="Disciplinas da matriz" aria-rowcount={itens.length} className="text-[12px]">
         <div
            role="row"
            className={cn(LINHA, "sticky top-0 z-10 border-b border-hairline bg-card px-4 py-2 text-[11px] font-medium text-ink-3")}
         >
            <span role="columnheader">Código</span>
            <span role="columnheader">Disciplina</span>
            <span role="columnheader" className="text-right">
               CH
            </span>
            <span role="columnheader" className="text-right">
               Nota
            </span>
            <span role="columnheader" className="pl-1">
               Decisão
            </span>
         </div>
         {grupos.map(g => (
            <Fragment key={g.chave}>
               <div role="row" className="bg-surface-2/70 px-4 py-1.5 text-[11.5px] font-semibold text-ink-2">
                  <span role="rowheader">{tituloPeriodo(g.periodo)}</span>
               </div>
               {g.itens.map(item => {
                  const ativo = item.id === selecionadoId;
                  const duvida = iaEmDuvida(item);
                  const origens = origensDoItem(item, origemPorId);
                  const exibida = decisaoExibida(item);
                  return (
                     <div
                        key={item.id}
                        role="row"
                        aria-selected={ativo}
                        ref={el => {
                           if (el) linhas.current.set(item.id, el);
                           else linhas.current.delete(item.id);
                        }}
                        onClick={() => onSelecionar(item.id)}
                        className={cn(
                           LINHA,
                           "relative cursor-pointer border-b border-hairline px-4 py-2 transition-colors",
                           !ativo && "hover:bg-surface-hover",
                        )}
                     >
                        {ativo ? (
                           <motion.span
                              layoutId="conferencia-linha-ativa"
                              aria-hidden
                              className={cn(
                                 "absolute inset-0 border-l-[3px]",
                                 duvida ? "border-warn bg-warn-soft/70" : "border-brand bg-brand-soft/70",
                              )}
                              transition={{ duration: 0.28, ease: emphasis }}
                           />
                        ) : null}
                        <span role="gridcell" className="relative truncate font-mono text-[10.5px] text-ink-3">
                           {item.codigo ?? "—"}
                        </span>
                        <span role="gridcell" className="relative flex min-w-0 items-center gap-1.5">
                           <button
                              type="button"
                              className={cn(
                                 "line-clamp-2 min-w-0 text-left text-[12.5px] leading-snug outline-none focus-visible:underline",
                                 ativo ? "font-semibold text-ink" : "font-medium text-ink",
                              )}
                              title={item.disciplina}
                           >
                              {item.disciplina}
                           </button>
                           {marcarPerguntas && paraCoordenacao(item) ? (
                              <span
                                 title="Pergunta da analista"
                                 className="grid size-5 shrink-0 place-items-center rounded-full bg-warn-soft text-warn-ink"
                              >
                                 <MessageSquareText aria-hidden className="size-3" />
                                 <span className="sr-only">Pergunta da analista</span>
                              </span>
                           ) : null}
                           {duvida ? (
                              <span
                                 title="A IA está em dúvida nesta disciplina"
                                 className="grid size-5 shrink-0 place-items-center rounded-full bg-warn-soft text-warn-ink"
                              >
                                 <Sparkles aria-hidden className="size-3" />
                                 <span className="sr-only">A IA está em dúvida</span>
                              </span>
                           ) : null}
                        </span>
                        <span role="gridcell" className="relative text-right font-mono text-ink-2 tabular-nums">
                           {horas(item.ch)}
                        </span>
                        <span role="gridcell" className="relative text-right font-mono text-ink-2 tabular-nums">
                           {origens[0]?.nota === null || origens.length === 0 ? "—" : decimal(origens[0].nota ?? 0)}
                        </span>
                        <span role="gridcell" className="relative">
                           {item.estado === "PERGUNTA_ABERTA" ? (
                              <span className="flex h-7 items-center pl-1">
                                 <Status tone="warn">Aguardando parecer</Status>
                              </span>
                           ) : (
                              <SegmentedControl
                                 options={OPCOES_DECISAO}
                                 value={exibida.valor}
                                 onChange={v => onDecidir(item, v)}
                                 layoutId={`conferencia-decisao-${item.id}`}
                                 ariaLabel={`Decisão para ${item.disciplina}`}
                                 size="xs"
                                 full
                                 fantasma={exibida.fantasma}
                                 disabled={!podeDecidir}
                              />
                           )}
                        </span>
                     </div>
                  );
               })}
            </Fragment>
         ))}
      </div>
   );
}
