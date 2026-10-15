/** Grade compacta; origem, alertas e ementas ficam nos detalhes pelos três pontos. */
import { History, MessageCircleQuestion, MoreHorizontal, Replace, SplitSquareHorizontal, TriangleAlert, Undo2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { memo } from "react";

import { CONTROL } from "@/components/core/field";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DecisaoItem } from "@/features/casos";
import { decimal, horas } from "@/lib/format";
import { collapseVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { COLUNAS_GRADE } from "@/features/analise/components/grade-layout";
import { ComparacaoCh, EmentasLadoALado } from "@/features/analise/components/origem";
import { anoSemestre, decisaoExibida, extracaoBaixa, OPCOES_DECISAO, origensDoItem } from "@/features/analise/domain/analise.domain";
import {
   MotivoAlteracaoSchema,
   ROTULO_MOTIVO_ALTERACAO,
   type ItemAnalise,
   type ItemOrigem,
   type MotivoAlteracao,
} from "@/features/analise/types/analise.schema";

export interface AcoesLinha {
   decidir: (item: ItemAnalise, valor: DecisaoItem) => void;
   focar: (id: string) => void;
   selecionar: (id: string, shift: boolean) => void;
   expandir: (id: string) => void;
   perguntar: (item: ItemAnalise) => void;
   retirarPergunta: (item: ItemAnalise) => void;
   trocarOrigem: (item: ItemAnalise) => void;
   historico: (item: ItemAnalise) => void;
   motivo: (item: ItemAnalise, motivo: MotivoAlteracao | null) => void;
}

export interface LinhaItemProps {
   item: ItemAnalise;
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   focado: boolean;
   selecionado: boolean;
   expandido: boolean;
   podeDecidir: boolean;
   podePerguntar: boolean;
   layoutBase: string;
   acoes: AcoesLinha;
}

function LinhaItemBase({
   item,
   origemPorId,
   focado,
   selecionado,
   expandido,
   podeDecidir,
   podePerguntar,
   layoutBase,
   acoes,
}: LinhaItemProps) {
   const origens = origensDoItem(item, origemPorId);
   const exibida = decisaoExibida(item);
   const s = item.sugestao;
   const perguntaAberta = item.estado === "PERGUNTA_ABERTA";
   const alterou = !!item.decisao && !!s && item.decisao.valor !== s.decisao && item.decisao.origem === "ANALISTA";
   const alertas = s?.alertas ?? [];

   return (
      <div
         role="row"
         id={`linha-${item.id}`}
         data-item-id={item.id}
         tabIndex={focado ? 0 : -1}
         aria-selected={selecionado}
         onFocus={() => acoes.focar(item.id)}
         className={cn(
            "relative outline-none transition-colors focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset print:hidden",
            focado ? "bg-surface-hover" : "even:bg-surface-2/35 hover:bg-surface-hover/60",
            selecionado && "bg-brand-soft",
         )}
      >
         <div className={cn(COLUNAS_GRADE, "min-h-11 py-1.5 text-[12px]")}>
            <div role="gridcell" className="flex items-center">
               <input
                  type="checkbox"
                  aria-label={`Selecionar ${item.disciplina}`}
                  checked={selecionado}
                  disabled={!podeDecidir}
                  onChange={e => acoes.selecionar(item.id, (e.nativeEvent as MouseEvent).shiftKey === true)}
                  className="size-4 cursor-pointer accent-brand disabled:cursor-not-allowed disabled:opacity-40"
               />
            </div>

            <div role="gridcell" className="min-w-0 py-0.5 text-[13px] leading-5 font-medium break-words text-ink">
               {item.disciplina}
               {item.contestacao ? (
                  <span
                     title={item.contestacao.texto}
                     className="ml-2 inline-flex translate-y-[-1px] items-center gap-1 text-[11px] font-medium text-risk-ink"
                  >
                     <span aria-hidden className="size-1.25 rounded-full bg-risk" />
                     Contestada
                  </span>
               ) : null}
            </div>
            <div role="gridcell" className="font-mono text-[11.5px] whitespace-nowrap text-ink-2">
               {item.codigo ?? "—"}
            </div>
            <div role="gridcell" className="text-right whitespace-nowrap text-ink-2 tabular-nums">
               {horas(item.ch)}
            </div>
            <div role="gridcell" className="flex flex-col items-center gap-0.5 text-ink-2 tabular-nums">
               {origens.length ? origens.map(o => <span key={o.id}>{o.ano === null ? "—" : anoSemestre(o)}</span>) : <span>—</span>}
            </div>
            <div role="gridcell" className="flex flex-col items-end gap-0.5 text-ink-2 tabular-nums">
               {origens.length ? (
                  origens.map(o => (
                     <span key={o.id} className={cn(extracaoBaixa(o) && "rounded-xs bg-warn-soft px-1 text-warn-ink")}>
                        {o.nota === null ? "—" : decimal(o.nota)}
                     </span>
                  ))
               ) : (
                  <span>—</span>
               )}
            </div>
            <div
               role="gridcell"
               className="justify-self-end"
               aria-describedby={exibida.fantasma ? `${layoutBase}-${item.id}-confirmacao` : undefined}
            >
               {exibida.fantasma ? (
                  <span id={`${layoutBase}-${item.id}-confirmacao`} className="sr-only">
                     Opção pré-marcada ainda não confirmada.
                  </span>
               ) : null}
               <SegmentedControl
                  options={OPCOES_DECISAO}
                  value={exibida.valor}
                  fantasma={exibida.fantasma}
                  onChange={v => acoes.decidir(item, v)}
                  layoutId={`${layoutBase}-${item.id}`}
                  ariaLabel={`Decisão para ${item.disciplina}`}
                  size="xs"
                  disabled={!podeDecidir || perguntaAberta}
               />
            </div>
            <div role="gridcell">
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button
                        variant="ghost"
                        size="xs"
                        square
                        icon={<MoreHorizontal />}
                        aria-label={`Mais ações para ${item.disciplina}`}
                        title={perguntaAberta ? "Aguardando a coordenação" : alertas.length ? alertas.join(" · ") : "Mais ações"}
                     />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-56 bg-card">
                     <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => acoes.expandir(item.id)}>
                           <SplitSquareHorizontal /> {expandido ? "Fechar detalhes" : "Ver detalhes e ementas"}
                        </DropdownMenuItem>
                        {podeDecidir && !perguntaAberta ? (
                           <DropdownMenuItem onSelect={() => acoes.trocarOrigem(item)}>
                              <Replace /> Trocar origem
                           </DropdownMenuItem>
                        ) : null}
                        {podePerguntar && !item.pergunta?.resposta ? (
                           <DropdownMenuItem onSelect={() => acoes.perguntar(item)}>
                              <MessageCircleQuestion /> {perguntaAberta ? "Editar pergunta" : "Perguntar à coordenação"}
                           </DropdownMenuItem>
                        ) : null}
                        {podePerguntar && perguntaAberta ? (
                           <DropdownMenuItem onSelect={() => acoes.retirarPergunta(item)}>
                              <Undo2 /> Retirar pergunta
                           </DropdownMenuItem>
                        ) : null}
                     </DropdownMenuGroup>
                     <DropdownMenuSeparator />
                     <DropdownMenuGroup>
                        <DropdownMenuItem onSelect={() => acoes.historico(item)}>
                           <History /> Histórico da decisão
                        </DropdownMenuItem>
                     </DropdownMenuGroup>
                  </DropdownMenuContent>
               </DropdownMenu>
            </div>
         </div>

         <AnimatePresence initial={false}>
            {expandido ? (
               <motion.div
                  key="ementas"
                  variants={collapseVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="overflow-hidden"
               >
                  <div className="flex flex-col gap-2 px-9 pt-1 pb-3">
                     {perguntaAberta ? <p className="text-[12px] text-ink-2">Aguardando a coordenação</p> : null}
                     {item.contestacao ? (
                        <p className="rounded-lg bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
                           <span className="font-medium text-risk-ink">Contestação do aluno</span> · registrada por{" "}
                           {item.contestacao.por.nome}: {item.contestacao.texto}
                        </p>
                     ) : null}
                     {origens.length > 0 ? <ComparacaoCh origens={origens} chDestino={item.ch} /> : null}
                     {alertas.length > 0 ? (
                        <p className="flex items-start gap-1 text-[12px] text-warn-ink">
                           <TriangleAlert aria-hidden className="mt-0.5 size-3 shrink-0" /> {alertas.join(" · ")}
                        </p>
                     ) : null}
                     <EmentasLadoALado item={item} origens={origens} />
                     {alterou && podeDecidir && item.decisao ? (
                        <label className="flex items-center gap-1.5 text-[11.5px] text-ink-3">
                           <span>Motivo</span>
                           <select
                              value={item.decisao.motivoAlteracao ?? ""}
                              onChange={e => acoes.motivo(item, e.target.value ? MotivoAlteracaoSchema.parse(e.target.value) : null)}
                              className={cn(CONTROL, "h-7 w-auto pr-7 text-[12px]")}
                           >
                              <option value="">Opcional</option>
                              {MotivoAlteracaoSchema.options.map(m => (
                                 <option key={m} value={m}>
                                    {ROTULO_MOTIVO_ALTERACAO[m]}
                                 </option>
                              ))}
                           </select>
                        </label>
                     ) : null}
                  </div>
               </motion.div>
            ) : null}
         </AnimatePresence>
      </div>
   );
}

export const LinhaItem = memo(LinhaItemBase);
