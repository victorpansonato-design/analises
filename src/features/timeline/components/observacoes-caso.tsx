/** Observações mais recentes do protocolo, no painel permanente da equipe. */
import { MessageSquareText, Plus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { acaoDoCaso, useUsuarios, type CasoDetalhe } from "@/features/casos";
import { fullDate, time } from "@/lib/format";
import { useTimeline } from "@/features/timeline/api/timeline.queries";
import { CompositorNota } from "@/features/timeline/components/compositor-nota";
import { rotuloAutor } from "@/features/timeline/domain/eventos";
import { segmentarMencoes } from "@/features/timeline/domain/mencoes";

export function ObservacoesCaso({ caso, mostrarTitulo = true }: { caso: CasoDetalhe; mostrarTitulo?: boolean }) {
   const timeline = useTimeline(caso.id, "NOTAS");
   const usuarios = useUsuarios(null);
   const pessoas = usuarios.data ?? [];
   const notas = timeline.data?.pages.flatMap(p => p.itens) ?? [];
   const [escrevendo, setEscrevendo] = useState(false);
   const [limite, setLimite] = useState(3);
   const campo = useRef<HTMLDivElement>(null);
   const id = useId();
   const acao = acaoDoCaso(caso, "ADICIONAR_NOTA");

   useEffect(() => {
      if (escrevendo) campo.current?.querySelector("textarea")?.focus();
   }, [escrevendo]);

   return (
      <section
         aria-labelledby={mostrarTitulo ? id : undefined}
         aria-label={mostrarTitulo ? undefined : "Observações"}
         className="observacoes-caso min-w-0 space-y-3 print:hidden"
      >
         <div className="flex items-center justify-between gap-2">
            {mostrarTitulo ? (
               <h2 id={id} className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <MessageSquareText aria-hidden className="size-4 text-ink-3" /> Observações
               </h2>
            ) : (
               <p className="text-[11.5px] text-ink-3">Só a equipe vê</p>
            )}
            <Button
               size="xs"
               variant="ghost"
               className={escrevendo ? undefined : "acao-destaque"}
               data-tom="todas"
               icon={escrevendo ? <X aria-hidden /> : <Plus aria-hidden />}
               aria-expanded={escrevendo}
               aria-controls={`${id}-compositor`}
               disabled={!acao?.habilitada}
               onClick={() => setEscrevendo(e => !e)}
            >
               {escrevendo ? "Fechar campo" : "Adicionar observação"}
            </Button>
         </div>
         {mostrarTitulo ? <p className="text-[11.5px] text-ink-3">Só a equipe vê · mais recentes primeiro</p> : null}
         {acao && !acao.habilitada ? <p className="text-[12px] text-ink-3">{acao.motivos[0]}</p> : null}
         <div ref={campo} id={`${id}-compositor`} hidden={!escrevendo} className="rounded-xl bg-surface-2 p-3">
            <CompositorNota caso={caso} pessoas={pessoas} />
         </div>
         {timeline.isLoading ? (
            <div aria-label="Carregando observações" className="space-y-2">
               <Skeleton className="h-24 rounded-xl" />
               <Skeleton className="h-20 rounded-xl" />
            </div>
         ) : timeline.isError && notas.length === 0 ? (
            <div className="space-y-2 text-[12px] text-ink-3">
               <p>Não foi possível carregar as observações.</p>
               <Button size="xs" onClick={() => void timeline.refetch()}>
                  Tentar de novo
               </Button>
            </div>
         ) : notas.length ? (
            <ol className="space-y-3 pl-2">
               {notas.slice(0, limite).map(n => (
                  <li key={n.id} className="observacao-bolha">
                     <p className="text-[12.5px] leading-relaxed whitespace-pre-wrap wrap-anywhere">
                        {segmentarMencoes(n.detalhe ?? n.titulo, pessoas).map((t, i) => (
                           <span key={i} className={t.mencao ? "font-semibold" : undefined}>
                              {t.texto}
                           </span>
                        ))}
                     </p>
                     <div className="mt-3 flex flex-wrap items-center justify-end gap-x-1.5 gap-y-0.5 text-right text-[10.5px] text-white/90">
                        <time dateTime={n.em}>
                           {fullDate(n.em)} · {time(n.em)}
                        </time>
                        <span>· {rotuloAutor(n.autor)}</span>
                     </div>
                  </li>
               ))}
            </ol>
         ) : (
            <p className="rounded-xl bg-surface-2 px-3 py-4 text-[12px] text-ink-3">
               Nenhuma observação neste protocolo. Registre aqui o que a equipe precisa saber.
            </p>
         )}
         {timeline.isFetchNextPageError ? (
            <p role="alert" className="text-[12px] text-crit-ink">
               Não foi possível carregar as observações anteriores. As notas já carregadas continuam disponíveis.
            </p>
         ) : null}
         {timeline.hasNextPage || notas.length > limite ? (
            <Button
               size="sm"
               variant="ghost"
               className="w-full"
               disabled={timeline.isFetchingNextPage}
               onClick={async () => {
                  if (notas.length <= limite && timeline.hasNextPage) await timeline.fetchNextPage();
                  setLimite(n => n + 3);
               }}
            >
               {timeline.isFetchingNextPage ? "Carregando…" : "Observações anteriores"}
            </Button>
         ) : null}
      </section>
   );
}
