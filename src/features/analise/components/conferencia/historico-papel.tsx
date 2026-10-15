/**
 * O histórico escolar anexado, desenhado como papel (lado esquerdo da conferência). Papel claro nos
 * dois temas, como o documento de verdade. Dados fictícios da semente; nada aqui é documento real.
 *
 * Grifo da IA (a parte que dá vida à conferência):
 * - Ao selecionar uma disciplina da matriz, as linhas de origem ganham um marca-texto que "corre"
 *   da esquerda para a direita (scaleX, 550 ms, emphasis), uma linha por vez.
 * - Âmbar quando a IA está em dúvida; azul quando é só a correspondência. A nota da IA desliza para
 *   junto da linha grifada (`layoutId`), em vez de piscar num canto da tela.
 * - A linha grifada rola até o centro do papel, suave. Com `prefers-reduced-motion`, sem animação.
 * - Com uma disciplina selecionada, cada linha oferece "Usar nesta disciplina" (vincula a origem).
 */
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Landmark, Link2, Sparkles } from "lucide-react";
import { Fragment, useEffect, useRef } from "react";

import { decimal, horas, int } from "@/lib/format";
import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { semestresDoDocumento, type DocumentoHistorico, type Grifo } from "@/features/analise/domain/conferencia";
import { ROTULO_SITUACAO_ORIGEM, type ItemAnalise, type ItemOrigem } from "@/features/analise/types/analise.schema";

interface HistoricoPapelProps {
   documento: DocumentoHistorico;
   indice: number;
   total: number;
   aluno: string;
   curso: string | null;
   selecionado: ItemAnalise | null;
   grifo: Grifo | null;
   podeVincular: boolean;
   onVincular: (origem: ItemOrigem) => void;
}

const LINHA = "grid grid-cols-[84px_minmax(0,1fr)_56px_48px_84px] items-center gap-x-2 py-1.5";

const COR = {
   duvida: { marca: "bg-[oklch(90%_0.12_85)]", barra: "bg-[oklch(70%_0.16_70)]" },
   correspondencia: { marca: "bg-[oklch(91%_0.05_255)]", barra: "bg-[oklch(55%_0.16_258)]" },
} as const;

function codigoVerificacao(doc: DocumentoHistorico): string {
   const n = [...doc.instituicao].reduce((s, c) => (s * 31 + c.charCodeAt(0)) >>> 0, 7);
   const hex = n.toString(16).toUpperCase().padStart(8, "0");
   return `${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

export function HistoricoPapel({
   documento,
   indice,
   total,
   aluno,
   curso,
   selecionado,
   grifo,
   podeVincular,
   onVincular,
}: HistoricoPapelProps) {
   const reduzido = useReducedMotion();
   const linhas = useRef(new Map<string, HTMLDivElement>());
   const grifados = new Set(grifo?.origemIds ?? []);
   const primeiro = documento.itens.find(o => grifados.has(o.id))?.id ?? null;
   const semestres = semestresDoDocumento(documento);
   const chCursada = documento.itens.filter(o => o.situacao === "APROVADO").reduce((s, o) => s + o.ch, 0);
   const notas = documento.itens.map(o => o.nota).filter((n): n is number => n !== null);
   const media = notas.length ? notas.reduce((s, n) => s + n, 0) / notas.length : null;

   // Leva a linha grifada para o centro do papel, depois que a aba (se mudou) terminou de entrar.
   useEffect(() => {
      if (!primeiro) return;
      const el = linhas.current.get(primeiro);
      const t = window.setTimeout(() => el?.scrollIntoView?.({ behavior: reduzido ? "auto" : "smooth", block: "center" }), 60);
      return () => window.clearTimeout(t);
   }, [primeiro, selecionado?.id, reduzido]);

   return (
      <article
         aria-label={`Histórico escolar: ${documento.instituicao}`}
         className="mx-auto w-full max-w-[760px] rounded-md bg-white px-9 py-8 text-[#22314a] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_12px_32px_-12px_rgb(15_30_60/0.25)]"
      >
         <header className="flex items-start justify-between gap-6 border-b border-[#d8dee8] pb-4">
            <div className="flex items-start gap-3">
               <span aria-hidden className="grid size-11 place-items-center rounded-full border border-[#c9d2df] text-[#3a4f73]">
                  <Landmark className="size-5" />
               </span>
               <div>
                  <p className="text-[16px] leading-tight font-semibold">{documento.instituicao}</p>
                  <p className="mt-0.5 text-[11.5px] text-[#5b6a82]">Secretaria acadêmica · histórico escolar</p>
               </div>
            </div>
            <p className="text-right text-[10.5px] leading-relaxed text-[#5b6a82]">
               Documento {indice + 1} de {total}
               <br />
               Anexado pelo candidato
            </p>
         </header>

         <dl className="grid grid-cols-[auto_minmax(0,1fr)_auto_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-[#d8dee8] py-3 text-[11.5px]">
            <dt className="text-[#5b6a82]">Aluno</dt>
            <dd className="font-medium">{aluno}</dd>
            <dt className="text-[#5b6a82]">Curso</dt>
            <dd className="font-medium">{curso ?? "Não informado"}</dd>
            <dt className="text-[#5b6a82]">Período</dt>
            <dd className="font-medium">{documento.periodo ? `${documento.periodo.de} a ${documento.periodo.ate}` : "Não informado"}</dd>
            <dt className="text-[#5b6a82]">Disciplinas</dt>
            <dd className="font-medium">{int(documento.itens.length)}</dd>
         </dl>

         <div role="table" aria-label="Disciplinas cursadas" className="mt-3 text-[11.5px]">
            <div role="row" className={cn(LINHA, "border-b border-[#c9d2df] text-[10.5px] text-[#5b6a82]")}>
               <span role="columnheader" className="font-medium">
                  Código
               </span>
               <span role="columnheader" className="font-medium">
                  Disciplina
               </span>
               <span role="columnheader" className="text-right font-medium">
                  CH
               </span>
               <span role="columnheader" className="text-right font-medium">
                  Nota
               </span>
               <span role="columnheader" className="pl-3 font-medium">
                  Situação
               </span>
            </div>
            {semestres.map(s => (
               <div role="rowgroup" key={s.chave}>
                  <div role="row" className="pt-3 pb-1 text-[10.5px] font-semibold text-[#3a4f73]">
                     <span role="rowheader">{s.titulo}</span>
                  </div>
                  {s.itens.map(o => {
                     const grifada = grifados.has(o.id) && !!grifo && grifo.tom !== "sem-origem";
                     const ordemGrifo = grifo?.origemIds.indexOf(o.id) ?? -1;
                     const cor = grifada ? COR[grifo.tom as "duvida" | "correspondencia"] : null;
                     return (
                        <Fragment key={o.id}>
                           <div
                              role="row"
                              ref={el => {
                                 if (el) linhas.current.set(o.id, el);
                                 else linhas.current.delete(o.id);
                              }}
                              data-origem-id={o.id}
                              aria-current={grifada ? "true" : undefined}
                              className={cn(LINHA, "group relative border-b border-[#edf0f5]")}
                           >
                              {cor ? (
                                 <Fragment key={selecionado?.id}>
                                    <motion.span
                                       aria-hidden
                                       className={cn(
                                          "pointer-events-none absolute inset-y-[3px] -right-2 -left-2 origin-left rounded-[4px]",
                                          cor.marca,
                                       )}
                                       initial={reduzido ? false : { scaleX: 0, opacity: 0.35 }}
                                       animate={{ scaleX: 1, opacity: 1 }}
                                       transition={{ duration: 0.55, ease: emphasis, delay: 0.2 + ordemGrifo * 0.12 }}
                                    />
                                    <motion.span
                                       aria-hidden
                                       className={cn("absolute inset-y-[3px] -left-3.5 w-[3px] rounded-full", cor.barra)}
                                       initial={reduzido ? false : { scaleY: 0 }}
                                       animate={{ scaleY: 1 }}
                                       transition={{ duration: 0.3, ease: emphasis, delay: 0.1 + ordemGrifo * 0.12 }}
                                    />
                                 </Fragment>
                              ) : null}
                              <span role="cell" className="relative font-mono text-[10.5px] text-[#5b6a82]">
                                 {o.codigo ?? "—"}
                              </span>
                              <span role="cell" className={cn("relative flex min-w-0 items-center gap-2", grifada && "font-semibold")}>
                                 <span className="min-w-0">{o.nome}</span>
                                 {podeVincular && selecionado && !grifada ? (
                                    <button
                                       type="button"
                                       onClick={() => onVincular(o)}
                                       className="hidden shrink-0 items-center gap-1 rounded-full bg-[#eef2f8] px-2 py-0.5 text-[10.5px] font-medium whitespace-nowrap text-[#2c4a7a] transition-colors group-hover:inline-flex group-focus-within:inline-flex hover:bg-[#dfe7f3]"
                                    >
                                       <Link2 aria-hidden className="size-3" /> Usar nesta disciplina
                                    </button>
                                 ) : null}
                              </span>
                              <span role="cell" className="relative text-right font-mono tabular-nums">
                                 {horas(o.ch)}
                              </span>
                              <span
                                 role="cell"
                                 className={cn(
                                    "relative text-right font-mono tabular-nums",
                                    o.situacao === "REPROVADO" && "text-[#a3302b]",
                                 )}
                              >
                                 {o.nota === null ? "—" : decimal(o.nota)}
                              </span>
                              <span role="cell" className="relative pl-3 text-[10.5px] text-[#5b6a82]">
                                 {ROTULO_SITUACAO_ORIGEM[o.situacao]}
                              </span>
                           </div>
                           <AnimatePresence initial={false}>
                              {o.id === primeiro && grifo?.nota ? (
                                 <NotaIa key="nota" grifo={grifo} chDestino={selecionado?.ch ?? null} chOrigem={o.ch} />
                              ) : null}
                           </AnimatePresence>
                        </Fragment>
                     );
                  })}
               </div>
            ))}
         </div>

         <footer className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-[#d8dee8] pt-3 text-[10.5px] text-[#5b6a82]">
            <p>
               Carga horária cursada: <span className="font-mono font-medium text-[#22314a]">{horas(chCursada)}</span>
               {media !== null ? (
                  <>
                     {" "}
                     · média geral <span className="font-mono font-medium text-[#22314a]">{decimal(media)}</span>
                  </>
               ) : null}
            </p>
            <p className="font-mono">Verificação {codigoVerificacao(documento)}</p>
         </footer>
      </article>
   );
}

function NotaIa({ grifo, chDestino, chOrigem }: { grifo: Grifo; chDestino: number | null; chOrigem: number }) {
   const duvida = grifo.tom === "duvida";
   return (
      <motion.div
         layoutId="nota-ia-conferencia"
         initial={{ opacity: 0, y: -4 }}
         animate={{ opacity: 1, y: 0 }}
         exit={{ opacity: 0 }}
         transition={{ duration: 0.32, ease: emphasis, delay: 0.25 }}
         className={cn(
            "my-1.5 flex items-start gap-2 rounded-lg px-3 py-2 text-[11.5px] leading-relaxed",
            duvida ? "bg-[oklch(96%_0.05_85)] text-[#5a4304]" : "bg-[#eef3fb] text-[#23406e]",
         )}
         role="note"
      >
         <Sparkles aria-hidden className="mt-0.5 size-3.5 shrink-0" />
         <span>
            <span className="font-semibold">{duvida ? "A IA está em dúvida" : "A IA ligou estas disciplinas"}</span>
            {chDestino !== null ? (
               <span>
                  {" "}
                  · {horas(chOrigem)} no histórico, {horas(chDestino)} na matriz
               </span>
            ) : null}
            {grifo.nota ? <span className="block">{grifo.nota}</span> : null}
         </span>
      </motion.div>
   );
}
