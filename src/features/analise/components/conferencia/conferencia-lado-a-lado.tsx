/**
 * Conferência lado a lado (decisão de 15/10/2026; fluxo revisto em 16/10/2026): dois painéis
 * grandes. À esquerda, o histórico escolar anexado (uma aba por documento); à direita, a matriz
 * atual com a decisão de cada disciplina.
 *
 * - Selecionar uma disciplina grifa no histórico as origens dela; se a IA está em dúvida, o grifo é
 *   âmbar e a nota da IA aparece junto da linha (`HistoricoPapel`). A aba do documento troca sozinha.
 * - Equipe de análises: abre nas "Dúvidas da IA"; `]` e `[` caminham por elas; 1–4 decide e já passa
 *   para a próxima. A disciplina decidida continua na lista até fechar (nada some debaixo do cursor).
 * - Coordenação (`parecer`): abre na primeira pergunta aberta, a matriz mostra só as perguntas e o
 *   parecer fica embaixo da matriz. 1–4 escolhe a sigla, Enter registra e a próxima pergunta entra.
 * - Decidir aqui usa a mesma mutação da grade (versão da análise, desfazer pela grade).
 * Estado na URL: `conferir=1` e `item` (o link abre a mesma disciplina grifada).
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp, FileSearch, MessageSquareText, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Kbd } from "@/components/core/kbd";
import { SegmentedControl } from "@/components/core/segmented-control";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { Button } from "@/components/ui/button";
import type { CasoDetalhe, DecisaoItem } from "@/features/casos";
import { horas, int, plural } from "@/lib/format";
import { emphasis, modalVariants, scrimVariants } from "@/lib/motion";

import { HistoricoPapel } from "@/features/analise/components/conferencia/historico-papel";
import { MatrizConferencia } from "@/features/analise/components/conferencia/matriz-conferencia";
import { FormParecer, ParecerRegistrado, PerguntaDaAnalista } from "@/features/analise/components/parecer-form";
import { DECISOES, paraCoordenacao } from "@/features/analise/domain/analise.domain";
import {
   documentoDoGrifo,
   documentosDoHistorico,
   grifoDoItem,
   iaEmDuvida,
   perguntaAberta,
   proximaQue,
} from "@/features/analise/domain/conferencia";
import type { Analise, ItemAnalise, ItemOrigem, RespostaEntrada } from "@/features/analise/types/analise.schema";

type FiltroConferencia = "todas" | "duvidas" | "perguntas";

const VAZIO: ReadonlySet<string> = new Set();
const FORM_PARECER = "conferencia-parecer";

/** Parecer da coordenação dentro da conferência. `aoConcluir` roda quando o servidor confirma. */
export interface ParecerNaConferencia {
   podeResponder: boolean;
   salvando: boolean;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada, aoConcluir: () => void) => void;
}

interface ConferenciaProps {
   caso: CasoDetalhe;
   analise: Analise;
   aberta: boolean;
   itemInicial: string | null;
   podeDecidir: boolean;
   onFechar: () => void;
   onSelecionar: (id: string) => void;
   onDecidir: (item: ItemAnalise, valor: DecisaoItem, origemIds?: string[]) => void;
   /** Presente quando a análise está com a coordenação: a conferência vira o lugar do parecer. */
   parecer?: ParecerNaConferencia | null;
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
                  <DialogPrimitive.Content asChild forceMount aria-describedby={undefined} onOpenAutoFocus={e => e.preventDefault()}>
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

function Conteudo({ caso, analise, itemInicial, podeDecidir, onFechar, onSelecionar, onDecidir, parecer }: ConferenciaProps) {
   const itens = analise.itens;
   const origemPorId = useMemo(() => new Map(analise.origem.map(o => [o.id, o])), [analise.origem]);
   const documentos = useMemo(
      () => documentosDoHistorico(analise.origem, caso.origem.iesNome ?? undefined),
      [analise.origem, caso.origem.iesNome],
   );

   // O que "Próxima" percorre: perguntas abertas (coordenação) ou dúvidas da IA (equipe).
   const perguntas = itens.filter(paraCoordenacao);
   const abertas = itens.filter(perguntaAberta).length;
   const duvidas = itens.filter(iaEmDuvida).length;
   const alvo = parecer ? (abertas > 0 ? perguntaAberta : paraCoordenacao) : iaEmDuvida;
   const nAlvo = parecer ? perguntas.length : duvidas;
   const rotuloAlvo = parecer ? "pergunta" : "dúvida";

   const [filtro, setFiltro] = useState<FiltroConferencia>(() =>
      parecer ? (perguntas.length ? "perguntas" : "todas") : duvidas > 0 ? "duvidas" : "todas",
   );
   // Disciplinas decididas aqui ficam visíveis no filtro até fechar.
   const [fixados, setFixados] = useState<ReadonlySet<string>>(VAZIO);
   const criterio = filtro === "duvidas" ? iaEmDuvida : filtro === "perguntas" ? paraCoordenacao : null;
   const visiveis = criterio ? itens.filter(i => criterio(i) || i.id === itemInicial || fixados.has(i.id)) : itens;

   const [selecionadoId, setSelecionadoId] = useState<string | null>(() =>
      itemInicial && itens.some(i => i.id === itemInicial) ? itemInicial : (proximaQue(itens, null, alvo) ?? itens[0]?.id ?? null),
   );
   const selecionado = itens.find(i => i.id === selecionadoId) ?? null;
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

   // Atalhos valem desde a abertura e depois de clicar em qualquer ponto: a raiz recebe o foco
   // (clique em área sem foco próprio cai nela, em vez de jogar o foco para fora do painel).
   const raiz = useRef<HTMLDivElement>(null);
   useEffect(() => raiz.current?.focus({ preventScroll: true }), []);

   // Sigla escolhida pelo teclado no parecer (vale só para a disciplina em que foi dada).
   const [tecla, setTecla] = useState<{ itemId: string; valor: DecisaoItem; n: number } | null>(null);

   function selecionar(id: string | null) {
      if (!id) return;
      setSelecionadoId(id);
      onSelecionar(id);
   }

   function mover(passo: 1 | -1) {
      const i = visiveis.findIndex(x => x.id === selecionadoId);
      selecionar(visiveis[Math.max(0, Math.min(visiveis.length - 1, i + passo))]?.id ?? null);
   }

   function decidir(item: ItemAnalise, valor: DecisaoItem, origemIds?: string[]) {
      setFixados(prev => (prev.has(item.id) ? prev : new Set([...prev, item.id])));
      onDecidir(item, valor, origemIds);
   }

   /** Teclado: decide e já leva à próxima (dúvida, no filtro de dúvidas; a linha de baixo, nos outros). */
   function decidirEAvancar(item: ItemAnalise, valor: DecisaoItem) {
      decidir(item, valor);
      const i = visiveis.findIndex(x => x.id === item.id);
      const proxima = filtro === "duvidas" ? proximaQue(itens, item.id, x => iaEmDuvida(x) && x.id !== item.id) : visiveis[i + 1]?.id;
      if (proxima) selecionar(proxima);
   }

   function responder(item: ItemAnalise, entrada: RespostaEntrada) {
      parecer?.onResponder(item, entrada, () => {
         // O formulário registrado sai da tela: o foco volta para a raiz e os atalhos seguem valendo.
         raiz.current?.focus({ preventScroll: true });
         selecionar(proximaQue(itens, item.id, x => perguntaAberta(x) && x.id !== item.id));
      });
   }

   function onTecla(e: KeyboardEvent<HTMLDivElement>) {
      const el = e.target as HTMLElement;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return;
      const indice = Number(e.key) - 1;
      const sigla = indice >= 0 && indice < DECISOES.length ? DECISOES[indice] : null;
      const parecerAberto = !!parecer?.podeResponder && !!selecionado && perguntaAberta(selecionado);
      if (e.key === "ArrowDown" || e.key === "ArrowUp") mover(e.key === "ArrowDown" ? 1 : -1);
      else if (e.key === "]" || e.key === "[") selecionar(proximaQue(itens, selecionadoId, alvo, e.key === "]" ? 1 : -1));
      else if (sigla && selecionado && parecerAberto) setTecla(t => ({ itemId: selecionado.id, valor: sigla, n: (t?.n ?? 0) + 1 }));
      else if (sigla && selecionado && podeDecidir && !perguntaAberta(selecionado)) decidirEAvancar(selecionado, sigla);
      else if (e.key === "Enter" && parecerAberto && !(el instanceof HTMLButtonElement))
         (document.getElementById(FORM_PARECER) as HTMLFormElement | null)?.requestSubmit();
      else return;
      e.preventDefault();
   }

   // Pergunta aberta é da coordenação: a equipe não troca a origem enquanto espera o parecer.
   const podeVincular = podeDecidir && !!selecionado && !perguntaAberta(selecionado);
   const vincular = (o: ItemOrigem) => selecionado && decidir(selecionado, "DISPENSA", [o.id]);
   const opcoesFiltro = parecer
      ? [
           {
              value: "perguntas" as const,
              label: "Perguntas",
              count: perguntas.length,
              icon: <MessageSquareText aria-hidden className="size-3" />,
           },
           { value: "todas" as const, label: "Todas", count: itens.length },
        ]
      : [
           { value: "todas" as const, label: "Todas", count: itens.length },
           { value: "duvidas" as const, label: "Dúvidas da IA", count: duvidas, icon: <Sparkles aria-hidden className="size-3" /> },
        ];
   const contagemMatriz =
      filtro === "duvidas"
         ? plural(duvidas, "dúvida da IA", "dúvidas da IA")
         : filtro === "perguntas"
           ? abertas > 0
              ? `${plural(abertas, "pergunta aberta", "perguntas abertas")} de ${perguntas.length}`
              : "pareceres registrados"
           : plural(itens.length, "disciplina", "disciplinas");

   return (
      <div ref={raiz} tabIndex={-1} className="flex min-h-0 flex-1 flex-col outline-none" onKeyDown={onTecla}>
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
                  options={opcoesFiltro}
                  value={filtro}
                  onChange={setFiltro}
                  layoutId="conferencia-filtro"
                  ariaLabel="Disciplinas da matriz"
                  size="xs"
               />
               {nAlvo > 0 ? (
                  <span className="flex items-center gap-1">
                     <Button
                        size="xs"
                        variant="ghost"
                        square
                        icon={<ChevronUp aria-hidden />}
                        aria-label={rotuloAlvo === "pergunta" ? "Pergunta anterior" : "Dúvida anterior"}
                        onClick={() => selecionar(proximaQue(itens, selecionadoId, alvo, -1))}
                     />
                     <Button
                        size="xs"
                        variant="secondary"
                        icon={<ChevronDown aria-hidden />}
                        onClick={() => selecionar(proximaQue(itens, selecionadoId, alvo, 1))}
                     >
                        {rotuloAlvo === "pergunta" ? "Próxima pergunta" : "Próxima dúvida"}
                     </Button>
                  </span>
               ) : null}
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
                        transition={{ duration: 0.25, ease: emphasis }}
                        className="mx-auto mb-4 flex max-w-[760px] items-start gap-2 rounded-lg bg-card px-3.5 py-2.5 text-[12px] text-ink-2"
                     >
                        <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ink-4" />
                        <span>
                           <span className="font-semibold text-ink">{selecionado.disciplina}:</span> {grifo.nota}
                           {podeVincular ? " Passe o mouse numa linha do histórico para usá-la nesta disciplina." : ""}
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
                           transition={{ duration: 0.18, ease: emphasis }}
                        >
                           <HistoricoPapel
                              documento={docAtivo}
                              indice={indiceDoc}
                              total={documentos.length}
                              aluno={caso.candidato.nome}
                              curso={caso.origem.cursoNome ?? null}
                              selecionado={selecionado}
                              grifo={grifo}
                              podeVincular={podeVincular}
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
                  <span className="ml-2 font-normal text-ink-3">{contagemMatriz}</span>
               </p>
               <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
                  {visiveis.length === 0 ? (
                     <p className="px-4 py-6 text-center text-[12.5px] text-ink-3">
                        {filtro === "duvidas" ? "A IA não tem dúvida em nenhuma disciplina." : "Nenhuma disciplina neste filtro."}
                     </p>
                  ) : (
                     <MatrizConferencia
                        itens={visiveis}
                        origemPorId={origemPorId}
                        selecionadoId={selecionadoId}
                        podeDecidir={podeDecidir}
                        marcarPerguntas={!!parecer}
                        onSelecionar={selecionar}
                        onDecidir={(item, valor) => decidir(item, valor)}
                     />
                  )}
               </div>
               {parecer && selecionado && paraCoordenacao(selecionado) ? (
                  <PainelParecer
                     item={selecionado}
                     posicao={perguntas.findIndex(p => p.id === selecionado.id) + 1}
                     total={perguntas.length}
                     abertas={abertas}
                     parecer={parecer}
                     tecla={tecla?.itemId === selecionado.id ? tecla : null}
                     onResponder={responder}
                     onFechar={onFechar}
                  />
               ) : null}
               <footer className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-hairline px-4 py-2 text-[11px] text-ink-4">
                  <span>
                     <Kbd>↑</Kbd> <Kbd>↓</Kbd> disciplina
                  </span>
                  {nAlvo > 0 ? (
                     <span>
                        <Kbd>]</Kbd> <Kbd>[</Kbd> {parecer ? "perguntas" : "dúvidas da IA"}
                     </span>
                  ) : null}
                  {parecer?.podeResponder ? (
                     <>
                        <span>
                           <Kbd>1</Kbd>–<Kbd>4</Kbd> parecer
                        </span>
                        <span>
                           <Kbd>Enter</Kbd> registrar
                        </span>
                     </>
                  ) : podeDecidir ? (
                     <span>
                        <Kbd>1</Kbd>–<Kbd>4</Kbd> decidir e seguir
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

interface PainelParecerProps {
   item: ItemAnalise;
   posicao: number;
   total: number;
   abertas: number;
   parecer: ParecerNaConferencia;
   tecla: { valor: DecisaoItem; n: number } | null;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada) => void;
   onFechar: () => void;
}

/** O parecer da disciplina selecionada, embaixo da matriz: pergunta, ementa e as siglas. */
function PainelParecer({ item, posicao, total, abertas, parecer, tecla, onResponder, onFechar }: PainelParecerProps) {
   const respondida = item.estado === "RESPONDIDO" ? (item.pergunta?.resposta ?? null) : null;
   return (
      <section aria-label={`Parecer sobre ${item.disciplina}`} className="shrink-0 space-y-2.5 border-t border-hairline bg-card px-4 py-3">
         <div className="flex items-baseline gap-2">
            <p className="min-w-0 truncate text-[13.5px] font-semibold text-ink">
               {item.disciplina} <span className="font-mono text-[11.5px] font-normal text-ink-4">{horas(item.ch)}</span>
            </p>
            <span className="ml-auto shrink-0 font-mono text-[11px] text-ink-4">
               {posicao} de {total}
            </span>
         </div>
         <PerguntaDaAnalista item={item} />
         {item.ementa ? (
            <p className="scroll-slim max-h-18 overflow-y-auto text-[12px] leading-relaxed text-ink-3">
               <span className="font-medium text-ink-4">Ementa: </span>
               {item.ementa}
            </p>
         ) : null}
         {respondida ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
               <ParecerRegistrado resposta={respondida} />
               {abertas === 0 ? (
                  <Button size="xs" variant="ghost" onClick={onFechar}>
                     Fechar e devolver no Próximo passo
                  </Button>
               ) : null}
            </div>
         ) : parecer.podeResponder ? (
            <FormParecer
               key={item.id}
               id={FORM_PARECER}
               item={item}
               contexto="conferencia"
               salvando={parecer.salvando}
               tecla={tecla}
               onResponder={e => onResponder(item, e)}
            />
         ) : null}
      </section>
   );
}
