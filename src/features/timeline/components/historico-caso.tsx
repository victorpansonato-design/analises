/** Painel compacto da equipe, permanente ao lado de qualquer aba do protocolo. */
import { History, MessageSquareText, Send } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Drawer } from "@/components/core/overlay";
import { Timeline } from "@/components/core/timeline";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { acaoDoCaso, useUsuarios, type CasoDetalhe } from "@/features/casos";
import { useAgora } from "@/hooks/use-agora";
import { useTimeline } from "@/features/timeline/api/timeline.queries";
import { EventoItem } from "@/features/timeline/components/evento-item";
import { ObservacoesCaso } from "@/features/timeline/components/observacoes-caso";
import { lerFiltro } from "@/features/timeline/domain/eventos";
import type { FiltroTimeline } from "@/features/timeline/types/timeline.schema";

export interface HistoricoCasoProps {
   caso: CasoDetalhe;
   /** A página compõe o envio aprovado; esta feature só apresenta os registros. */
   renderMensagem?: (onEnviada: () => void) => ReactNode;
}

type ModoHistorico = "NOTAS" | "MENSAGENS" | "HISTORICO";

export function HistoricoCaso({ caso, renderMensagem }: HistoricoCasoProps) {
   const [params, setParams] = useSearchParams();
   const filtro = params.has("hist") ? lerFiltro(params.get("hist")) : "NOTAS";
   const modo: ModoHistorico = filtro === "NOTAS" ? "NOTAS" : filtro === "MENSAGENS" ? "MENSAGENS" : "HISTORICO";
   const timeline = useTimeline(caso.id, filtro === "NOTAS" ? "TUDO" : filtro, { enabled: modo !== "NOTAS" });
   const usuarios = useUsuarios(null);
   const agora = useAgora();
   const id = useId();
   const [limite, setLimite] = useState(6);
   const [enviando, setEnviando] = useState(false);
   const eventos = timeline.data?.pages.flatMap(p => p.itens) ?? [];
   const acaoMensagem = acaoDoCaso(caso, "ENVIAR_MENSAGEM");

   function escolher(f: FiltroTimeline) {
      setLimite(6);
      setParams(
         prev => {
            const next = new URLSearchParams(prev);
            if (f === "NOTAS") next.delete("hist");
            else next.set("hist", f);
            return next;
         },
         { replace: true },
      );
   }

   return (
      <section className="historico-caso print:hidden" aria-labelledby={`${id}-titulo`}>
         <header className="historico-cabecalho flex items-center gap-2 px-4 py-3.5">
            <MessageSquareText aria-hidden className="size-4 shrink-0" />
            <div>
               <h2 id={`${id}-titulo`} className="text-[15px] font-semibold">
                  Observações do protocolo
               </h2>
               <p className="mt-0.5 text-[11px]">Mais recentes primeiro</p>
            </div>
         </header>
         <div className="p-3.5">
            <UnderlineTabs<ModoHistorico>
               tabs={[
                  { value: "NOTAS", label: "Observações" },
                  { value: "MENSAGENS", label: "Mensagens" },
                  { value: "HISTORICO", label: "Histórico" },
               ]}
               value={modo}
               onChange={m => escolher(m === "HISTORICO" ? "TUDO" : m)}
               layoutId={`historico-${caso.id}`}
               ariaLabel="Painel da equipe"
               idBase={id}
               className="historico-abas mb-3"
            />
            <div role="tabpanel" id={`${id}-panel-NOTAS`} aria-labelledby={`${id}-tab-NOTAS`} hidden={modo !== "NOTAS"}>
               <ObservacoesCaso caso={caso} mostrarTitulo={false} />
            </div>
            {modo !== "NOTAS" ? (
               <div role="tabpanel" id={`${id}-panel-${modo}`} aria-labelledby={`${id}-tab-${modo}`} className="space-y-4">
                  {modo === "MENSAGENS" && renderMensagem ? (
                     <div className="space-y-2">
                        <Button
                           className="acao-destaque w-full"
                           data-tom="liberadas"
                           icon={<Send aria-hidden />}
                           disabled={!acaoMensagem?.habilitada}
                           onClick={() => setEnviando(true)}
                        >
                           Enviar mensagem ao candidato
                        </Button>
                        {!acaoMensagem?.habilitada ? (
                           <p className="text-[11.5px] text-ink-3">{acaoMensagem?.motivos[0] ?? "Envio indisponível neste protocolo."}</p>
                        ) : null}
                     </div>
                  ) : null}
                  {modo === "HISTORICO" ? (
                     <label className="flex items-center gap-2 text-[12px] text-ink-3">
                        <History aria-hidden className="size-3.5" /> Registros
                        <select
                           aria-label="Filtrar registros"
                           value={filtro}
                           onChange={e => escolher(e.target.value as FiltroTimeline)}
                           className="h-8 min-w-0 flex-1 rounded-lg bg-surface-2 px-2 text-[12px] text-ink"
                        >
                           <option value="TUDO">Todos</option>
                           <option value="SISTEMA">Sistema</option>
                           <option value="DECISOES">Decisões</option>
                        </select>
                     </label>
                  ) : null}
                  <AsyncState
                     isLoading={timeline.isLoading}
                     isError={timeline.isError && eventos.length === 0}
                     isEmpty={eventos.length === 0}
                     loading={
                        <div className="space-y-3" aria-label="Carregando registros">
                           <Skeleton className="h-24 rounded-xl" />
                           <Skeleton className="h-20 rounded-xl" />
                        </div>
                     }
                     error={
                        <div className="space-y-2 text-[12px] text-ink-3">
                           <p>Não foi possível carregar os registros.</p>
                           <Button size="xs" onClick={() => void timeline.refetch()}>
                              Tentar de novo
                           </Button>
                        </div>
                     }
                     empty={
                        <p className="rounded-lg bg-surface-2 p-3 text-[12px] text-ink-3">
                           {modo === "MENSAGENS" ? "Nenhuma mensagem registrada neste protocolo." : "Nenhum registro neste filtro."}
                        </p>
                     }
                  >
                     <Timeline>
                        {eventos.slice(0, limite).map(e => (
                           <EventoItem key={e.id} evento={e} agora={agora} pessoas={usuarios.data ?? []} />
                        ))}
                     </Timeline>
                     {timeline.isFetchNextPageError ? (
                        <p role="alert" className="mt-3 text-[12px] text-crit-ink">
                           Não foi possível carregar os registros anteriores. Tente novamente.
                        </p>
                     ) : null}
                     {eventos.length > limite || timeline.hasNextPage ? (
                        <Button
                           size="sm"
                           variant="ghost"
                           className="mt-3 w-full"
                           disabled={timeline.isFetchingNextPage}
                           onClick={async () => {
                              if (eventos.length <= limite && timeline.hasNextPage) await timeline.fetchNextPage();
                              setLimite(n => n + 6);
                           }}
                        >
                           {timeline.isFetchingNextPage ? "Carregando…" : "Ver registros anteriores"}
                        </Button>
                     ) : null}
                  </AsyncState>
               </div>
            ) : null}
         </div>
         {renderMensagem ? (
            <Drawer
               open={enviando}
               onOpenChange={setEnviando}
               title="Mensagem ao candidato"
               description={`${caso.candidato.nome} · ${caso.protocolo}`}
               icon={Send}
               width="lg"
            >
               <div className="p-5">{enviando ? renderMensagem(() => setEnviando(false)) : null}</div>
            </Drawer>
         ) : null}
      </section>
   );
}
