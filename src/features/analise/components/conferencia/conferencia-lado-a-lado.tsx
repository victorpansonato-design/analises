/**
 * Conferência lado a lado (decisão de 15/10/2026): para análises com muitas disciplinas, a analista
 * ou o coordenador abre dois painéis grandes. À esquerda, o histórico escolar anexado (uma aba por
 * documento); à direita, a matriz atual com a decisão de cada disciplina.
 *
 * - Selecionar uma disciplina grifa no histórico as origens dela; se a IA está em dúvida, o grifo é
 *   âmbar e a nota da IA aparece junto da linha (`HistoricoPapel`). A aba do documento troca sozinha.
 * - "Dúvidas da IA" filtra a matriz; "Próxima dúvida" (ou `]` e `[`) caminha só por elas.
 * - Teclado: ↑ ↓ disciplina, 1–4 decidir (Dispensa, DP, ADAP, Regular), Esc fecha.
 * - Decidir aqui usa a mesma mutação da grade (versão da análise, desfazer pela grade).
 * Estado na URL: `conferir=1` e `item` (o link abre a mesma disciplina grifada).
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, FileSearch, Sparkles, X } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";

import { Kbd } from "@/components/core/kbd";
import { SegmentedControl } from "@/components/core/segmented-control";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { Button } from "@/components/ui/button";
import type { CasoDetalhe, DecisaoItem } from "@/features/casos";
import { int, plural } from "@/lib/format";
import { emphasis, modalVariants, scrimVariants } from "@/lib/motion";

import { HistoricoPapel } from "@/features/analise/components/conferencia/historico-papel";
import { MatrizConferencia } from "@/features/analise/components/conferencia/matriz-conferencia";
import { DECISOES } from "@/features/analise/domain/analise.domain";
import { documentoDoGrifo, documentosDoHistorico, grifoDoItem, iaEmDuvida, proximaDuvida } from "@/features/analise/domain/conferencia";
import type { Analise, ItemAnalise, ItemOrigem } from "@/features/analise/types/analise.schema";

type FiltroConferencia = "todas" | "duvidas";

interface ConferenciaProps {
   caso: CasoDetalhe;
   analise: Analise;
   aberta: boolean;
   itemInicial: string | null;
   podeDecidir: boolean;
   onFechar: () => void;
   onSelecionar: (id: string) => void;
   onDecidir: (item: ItemAnalise, valor: DecisaoItem, origemIds?: string[]) => void;
}

export function ConferenciaLadoALado(props: ConferenciaProps) {
   return (
      <DialogPrimitive.Root open={props.aberta} onOpenChange={v => !v && props.onFechar()}>
         <AnimatePresence>
            {props.aberta ? (
               <DialogPrimitive.Portal forceMount>
                  <DialogPrimitive.Overlay asChild forceMount>
                     <motion.div
                        className="scrim fixed inset-0 z-50"
                        variants={scrimVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                     />
                  </DialogPrimitive.Overlay>
                  <DialogPrimitive.Content asChild forceMount aria-describedby={undefined}>
                     <motion.div
                        variants={modalVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className="fixed inset-3 z-50 flex flex-col overflow-hidden rounded-2xl bg-workspace shadow-overlay outline-none"
                     >
                        <Conteudo {...props} />
                     </motion.div>
                  </DialogPrimitive.Content>
               </DialogPrimitive.Portal>
            ) : null}
         </AnimatePresence>
      </DialogPrimitive.Root>
   );
}

function Conteudo({ caso, analise, itemInicial, podeDecidir, onSelecionar, onDecidir }: ConferenciaProps) {
   const origemPorId = useMemo(() => new Map(analise.origem.map(o => [o.id, o])), [analise.origem]);
   const documentos = useMemo(
      () => documentosDoHistorico(analise.origem, caso.origem.iesNome ?? undefined),
      [analise.origem, caso.origem.iesNome],
   );
   const duvidas = analise.itens.filter(iaEmDuvida).length;
   const [filtro, setFiltro] = useState<FiltroConferencia>(duvidas > 0 ? "duvidas" : "todas");
   const visiveis = filtro === "duvidas" ? analise.itens.filter(i => iaEmDuvida(i) || i.id === itemInicial) : analise.itens;

   const inicial =
      itemInicial && analise.itens.some(i => i.id === itemInicial)
         ? itemInicial
         : (proximaDuvida(analise.itens, null) ?? analise.itens[0]?.id ?? null);
   const [selecionadoId, setSelecionadoId] = useState<string | null>(inicial);
   const selecionado = analise.itens.find(i => i.id === selecionadoId) ?? null;
   const grifo = selecionado ? grifoDoItem(selecionado) : null;

   // A aba acompanha o grifo: ao trocar de disciplina, o documento certo entra sozinho.
   const [docEscolhido, setDocEscolhido] = useState<string | null>(null);
   const [grifoVisto, setGrifoVisto] = useState<string | null>(null);
   if (selecionadoId !== grifoVisto) {
      setGrifoVisto(selecionadoId);
      const doGrifo = grifo ? documentoDoGrifo(documentos, grifo) : null;
      if (doGrifo) setDocEscolhido(doGrifo);
   }
   const docAtivo = documentos.find(d => d.id === docEscolhido) ?? documentos[0] ?? null;
   const indiceDoc = docAtivo ? documentos.indexOf(docAtivo) : 0;

   function selecionar(id: string | null) {
      if (!id) return;
      setSelecionadoId(id);
      onSelecionar(id);
   }

   function mover(passo: 1 | -1) {
      const i = visiveis.findIndex(x => x.id === selecionadoId);
      selecionar(visiveis[Math.max(0, Math.min(visiveis.length - 1, i + passo))]?.id ?? null);
   }

   function onTecla(e: KeyboardEvent<HTMLDivElement>) {
      const el = e.target as HTMLElement;
      if (e.metaKey || e.ctrlKey || e.altKey || el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const indice = Number(e.key) - 1;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") mover(e.key === "ArrowDown" ? 1 : -1);
      else if (e.key === "]" || e.key === "[") selecionar(proximaDuvida(analise.itens, selecionadoId, e.key === "]" ? 1 : -1));
      else if (indice >= 0 && indice < DECISOES.length && selecionado && podeDecidir) onDecidir(selecionado, DECISOES[indice]);
      else return;
      e.preventDefault();
   }

   const vincular = (o: ItemOrigem) => selecionado && onDecidir(selecionado, "DISPENSA", [o.id]);

   return (
      <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onTecla}>
         <header className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-hairline bg-card px-5 py-3">
            <span className="grid size-9 place-items-center rounded-lg bg-brand-soft text-brand-text">
               <FileSearch aria-hidden className="size-4.5" />
            </span>
            <div className="min-w-0">
               <DialogPrimitive.Title className="text-[15px] font-semibold text-ink">Conferência lado a lado</DialogPrimitive.Title>
               <p className="truncate text-[12px] text-ink-3">
                  {caso.candidato.nome} · matriz <span className="font-mono">{analise.matriz.codigo}</span> ·{" "}
                  {plural(documentos.length, "histórico anexado", "históricos anexados")}
               </p>
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
               <span className="hidden items-center gap-3 text-[11px] text-ink-3 xl:inline-flex">
                  <span className="inline-flex items-center gap-1.5">
                     <span aria-hidden className="h-2.5 w-4 rounded-[3px] bg-[oklch(90%_0.12_85)]" /> IA em dúvida
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                     <span aria-hidden className="h-2.5 w-4 rounded-[3px] bg-[oklch(91%_0.05_255)]" /> Correspondência
                  </span>
               </span>
               <SegmentedControl<FiltroConferencia>
                  options={[
                     { value: "todas", label: "Todas", count: analise.itens.length },
                     { value: "duvidas", label: "Dúvidas da IA", count: duvidas, icon: <Sparkles aria-hidden className="size-3" /> },
                  ]}
                  value={filtro}
                  onChange={setFiltro}
                  layoutId="conferencia-filtro"
                  ariaLabel="Disciplinas da matriz"
                  size="xs"
               />
               <span className="flex items-center gap-1">
                  <Button
                     size="xs"
                     variant="ghost"
                     icon={<ChevronUp aria-hidden />}
                     disabled={duvidas === 0}
                     onClick={() => selecionar(proximaDuvida(analise.itens, selecionadoId, -1))}
                  >
                     Dúvida anterior
                  </Button>
                  <Button
                     size="xs"
                     variant="secondary"
                     icon={<ChevronDown aria-hidden />}
                     disabled={duvidas === 0}
                     onClick={() => selecionar(proximaDuvida(analise.itens, selecionadoId, 1))}
                  >
                     Próxima dúvida
                  </Button>
               </span>
               <DialogPrimitive.Close asChild>
                  <Button variant="ghost" square icon={<X aria-hidden />} aria-label="Fechar conferência" />
               </DialogPrimitive.Close>
            </div>
         </header>

         <div className="grid min-h-0 flex-1 grid-cols-2 gap-3 p-3">
            <section aria-label="Histórico escolar" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card">
               {documentos.length > 1 ? (
                  <UnderlineTabs
                     tabs={documentos.map(d => ({ value: d.id, label: d.instituicao, count: int(d.itens.length) }))}
                     value={docAtivo?.id ?? ""}
                     onChange={setDocEscolhido}
                     layoutId="conferencia-docs"
                     ariaLabel="Históricos anexados"
                     idBase="conferencia-doc"
                     className="shrink-0 px-3 pt-1"
                  />
               ) : (
                  <p className="shrink-0 border-b border-hairline px-4 py-2.5 text-[12.5px] font-semibold text-ink">
                     Histórico escolar · {docAtivo?.instituicao}
                  </p>
               )}
               <div className="scroll-slim min-h-0 flex-1 overflow-y-auto bg-surface-2 px-6 py-6">
                  {grifo?.tom === "sem-origem" && selecionado ? (
                     <motion.p
                        key={selecionado.id}
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: emphasis }}
                        className="mx-auto mb-4 flex max-w-[760px] items-start gap-2 rounded-lg bg-card px-3.5 py-2.5 text-[12px] text-ink-2"
                     >
                        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                        <span>
                           <span className="font-semibold text-ink">{selecionado.disciplina}:</span> {grifo.nota}
                           {podeDecidir ? " Passe o mouse numa linha do histórico para usá-la nesta disciplina." : ""}
                        </span>
                     </motion.p>
                  ) : null}
                  <AnimatePresence mode="wait" initial={false}>
                     {docAtivo ? (
                        <motion.div
                           key={docAtivo.id}
                           initial={{ opacity: 0, x: -12 }}
                           animate={{ opacity: 1, x: 0 }}
                           exit={{ opacity: 0, x: 12 }}
                           transition={{ duration: 0.22, ease: emphasis }}
                        >
                           <HistoricoPapel
                              documento={docAtivo}
                              indice={indiceDoc}
                              total={documentos.length}
                              aluno={caso.candidato.nome}
                              curso={caso.origem.cursoNome ?? null}
                              selecionado={selecionado}
                              grifo={grifo}
                              podeVincular={podeDecidir}
                              onVincular={vincular}
                           />
                        </motion.div>
                     ) : (
                        <p className="text-center text-[12.5px] text-ink-3">Nenhum histórico com disciplinas extraídas neste caso.</p>
                     )}
                  </AnimatePresence>
               </div>
            </section>

            <section aria-label="Matriz atual" className="flex min-h-0 flex-col overflow-hidden rounded-xl bg-card">
               <p className="shrink-0 border-b border-hairline px-4 py-2.5 text-[12.5px] font-semibold text-ink">
                  Matriz atual · {caso.destino.cursoNome}
                  <span className="ml-2 font-normal text-ink-3">
                     {filtro === "duvidas"
                        ? plural(duvidas, "dúvida da IA", "dúvidas da IA")
                        : plural(analise.itens.length, "disciplina", "disciplinas")}
                  </span>
               </p>
               <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
                  {visiveis.length === 0 ? (
                     <p className="px-4 py-6 text-center text-[12.5px] text-ink-3">
                        A IA não tem dúvida em nenhuma disciplina. Veja todas para conferir.
                     </p>
                  ) : (
                     <MatrizConferencia
                        itens={visiveis}
                        origemPorId={origemPorId}
                        selecionadoId={selecionadoId}
                        podeDecidir={podeDecidir}
                        onSelecionar={selecionar}
                        onDecidir={(item, valor) => onDecidir(item, valor)}
                     />
                  )}
               </div>
               <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline px-4 py-2 text-[11px] text-ink-4">
                  <span>
                     <Kbd>↑</Kbd> <Kbd>↓</Kbd> disciplina
                  </span>
                  <span>
                     <Kbd>]</Kbd> <Kbd>[</Kbd> dúvidas da IA
                  </span>
                  {podeDecidir ? (
                     <span>
                        <Kbd>1</Kbd>–<Kbd>4</Kbd> decidir
                     </span>
                  ) : null}
                  <span>
                     <Kbd>Esc</Kbd> fechar
                  </span>
               </footer>
            </section>
         </div>
      </div>
   );
}
