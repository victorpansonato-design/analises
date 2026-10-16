/**
 * Painel do caso (docs/05 §3), na ordem em que se lê antes de agir: identidade (faixa azul),
 * marcadores, jornada, próximo passo e as abas. Abrir um caso não troca de página: muda `?caso=`.
 * As abas são preenchidas pela página (`renderAba`), porque cada uma é uma feature própria; este
 * painel não conhece análise, documentos nem proposta.
 */
import { MousePointerClick, SearchX } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Kbd } from "@/components/core/kbd";
import { Status } from "@/components/core/status";
import { Tag } from "@/components/core/tag";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgora } from "@/hooks/use-agora";
import { useAtalho } from "@/hooks/use-atalho";
import { stamp } from "@/lib/format";
import { pageVariants } from "@/lib/motion";
import { lerErroApi } from "@/services/api-erro";

import { useMe } from "@/features/sessao";

import { useCaso } from "@/features/casos/api/casos.queries";
import { ROTULO_ABA, abaPadrao, abasDoTipo, type Aba } from "@/features/casos/domain/abas";
import { PAPEL_DONO_DA_ETAPA } from "@/features/casos/domain/acoes";
import { tomDaEtapa } from "@/features/casos/domain/filas";
import { FaixaIdentidade } from "@/features/casos/components/painel/faixa-identidade";
import { JornadaCaso } from "@/features/casos/components/painel/jornada-caso";
import { ProximoPassoCard } from "@/features/casos/components/painel/proximo-passo-card";
import { useAcoesDoCaso } from "@/features/casos/components/painel/use-acoes-do-caso";
import { StatusEtapa } from "@/features/casos/components/status-etapa";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import type { CasoDetalhe } from "@/features/casos/types/caso.schema";

export type RenderAba = (aba: Aba, caso: CasoDetalhe) => ReactNode;

interface PainelCasoProps {
   renderAba: RenderAba;
   /** A página compõe o painel da equipe, disponível em todas as abas. */
   renderLateral?: (caso: CasoDetalhe) => ReactNode;
   /** Complemento da faixa azul (ex.: link do aluno), também composto pela página. */
   renderIdentidade?: (caso: CasoDetalhe) => ReactNode;
   /** Telas estreitas: o painel abre por cima da fila e oferece "Voltar à fila". */
   onVoltar?: () => void;
}

function SkeletonPainel() {
   return (
      <div aria-label="Carregando o caso">
         <div className="bg-surface-2 px-6 py-5">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="mt-2 h-4 w-96 max-w-full" />
         </div>
         <div className="space-y-4 p-5">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-40 w-full" />
         </div>
      </div>
   );
}

export function PainelCaso({ renderAba, renderLateral, renderIdentidade, onVoltar }: PainelCasoProps) {
   const { casoId, abrirCaso } = useCasosUrlState();
   const consulta = useCaso(casoId);
   const naoEncontrado = lerErroApi(consulta.error).status === 404;

   if (!casoId) {
      return (
         <section className="flex h-full items-center justify-center rounded-xl bg-card">
            <EmptyPanel
               icon={MousePointerClick}
               title="Selecione um caso na fila"
               message={
                  <>
                     Ou use <Kbd>J</Kbd> e <Kbd>K</Kbd> para andar pela fila.
                  </>
               }
            />
         </section>
      );
   }

   return (
      <section aria-label="Caso aberto" className="caso-aberto flex h-full min-h-0 flex-col overflow-hidden rounded-xl bg-card">
         <AsyncState
            className="flex min-h-0 flex-1 flex-col"
            isLoading={consulta.isLoading}
            isError={consulta.isError}
            loading={<SkeletonPainel />}
            error={
               <EmptyPanel
                  tone={naoEncontrado ? "plain" : "crit"}
                  icon={naoEncontrado ? SearchX : undefined}
                  title={naoEncontrado ? "Caso não encontrado" : "Não conseguimos abrir o caso"}
                  message={lerErroApi(consulta.error).message}
                  action={
                     naoEncontrado ? (
                        <Button size="sm" onClick={() => abrirCaso(null)}>
                           Voltar à fila
                        </Button>
                     ) : (
                        <Button size="sm" onClick={() => void consulta.refetch()}>
                           Tentar de novo
                        </Button>
                     )
                  }
               />
            }
         >
            {consulta.data ? (
               <ConteudoCaso
                  caso={consulta.data}
                  renderAba={renderAba}
                  renderLateral={renderLateral}
                  renderIdentidade={renderIdentidade}
                  onVoltar={onVoltar}
               />
            ) : null}
         </AsyncState>
      </section>
   );
}

function ConteudoCaso({ caso, renderAba, renderLateral, renderIdentidade, onVoltar }: { caso: CasoDetalhe } & PainelCasoProps) {
   const { aba: abaUrl, setAba } = useCasosUrlState();
   const { data: me } = useMe();
   const agora = useAgora();
   const { executar, dialogos, ocupado } = useAcoesDoCaso(caso);
   const abas = abasDoTipo(caso.tipo);
   const abaPedida = abaUrl ?? abaPadrao(me?.papeis ?? [], caso.etapa);
   const aba = abas.includes(abaPedida) ? abaPedida : "analise";
   const c = caso.contadores;

   useAtalho(["1", "2", "3", "4"], e => {
      const destino = abas[Number(e.key) - 1];
      if (destino) setAba(destino);
   });

   const contagem: Partial<Record<Aba, ReactNode>> = {
      analise: c.itensMatriz > 0 && c.itensSemDecisao > 0 ? c.itensSemDecisao : undefined,
      documentos: c.documentosObrigatorios > 0 ? `${c.documentosAceitos}/${c.documentosObrigatorios}` : undefined,
   };
   const temDono = PAPEL_DONO_DA_ETAPA[caso.etapa] !== null;

   return (
      <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">
         <AnimatePresence mode="wait" initial={false}>
            <motion.div key={caso.id} variants={pageVariants} initial="initial" animate="animate" exit="exit">
               <FaixaIdentidade caso={caso} onVoltar={onVoltar} extra={renderIdentidade?.(caso)} />
               <div
                  className={
                     renderLateral
                        ? "caso-trabalho grid items-start gap-5 px-5 pt-5 pb-8 sm:px-6 xl:grid-cols-[minmax(0,1fr)_360px]"
                        : "px-5 pt-5 pb-8 sm:px-8"
                  }
               >
                  {renderLateral ? (
                     <aside
                        aria-label="Painel da equipe"
                        tabIndex={0}
                        className="caso-lateral scroll-slim order-1 min-w-0 rounded-xl bg-card xl:sticky xl:top-4 xl:order-2"
                     >
                        {renderLateral(caso)}
                     </aside>
                  ) : null}
                  <div className="order-2 flex min-w-0 flex-col gap-5 xl:order-1">
                     <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 print:hidden">
                        <span className="caso-etapa" data-tom={tomDaEtapa(caso.etapa)}>
                           <StatusEtapa etapa={caso.etapa} />
                        </span>
                        {caso.flags.ouvidoria ? (
                           <Status tone="crit" solid>
                              Ouvidoria
                           </Status>
                        ) : null}
                        {caso.flags.escalado ? <Status tone="risk">Escalado</Status> : null}
                        {caso.flags.preAnaliseFalhou ? <Status tone="warn">Pré-análise não concluiu</Status> : null}
                        {caso.reanalises > 0 ? <Tag>{caso.reanalises + 1}ª análise</Tag> : null}
                        {caso.candidato.ra ? <Tag mono>RA {caso.candidato.ra}</Tag> : null}
                        <span className="text-[12px] text-ink-3">
                           {caso.responsavel ? (
                              <>
                                 Com{" "}
                                 <span className="font-medium text-ink-2">
                                    {caso.responsavel.id === me?.id ? "você" : caso.responsavel.nome}
                                 </span>
                              </>
                           ) : temDono ? (
                              "Sem responsável"
                           ) : null}
                        </span>
                        <span className="ml-auto text-[11.5px] text-ink-4">Atualizado {stamp(caso.atualizadoEm, agora).toLowerCase()}</span>
                     </div>
                     <div className="print:hidden">
                        <JornadaCaso caso={caso} agora={agora} />
                     </div>
                     <ProximoPassoCard caso={caso} meuId={me?.id ?? ""} agora={agora} ocupado={ocupado} onExecutar={executar} />
                     <div>
                        <UnderlineTabs<Aba>
                           tabs={abas.map(a => ({ value: a, label: ROTULO_ABA[a], count: contagem[a] }))}
                           value={aba}
                           onChange={setAba}
                           layoutId={`abas-caso-${caso.id}`}
                           ariaLabel="Abas do caso"
                           idBase="caso"
                           className="caso-abas print:hidden"
                        />
                        <div role="tabpanel" id={`caso-panel-${aba}`} aria-labelledby={`caso-tab-${aba}`} className="pt-5">
                           {renderAba(aba, caso)}
                        </div>
                     </div>
                  </div>
               </div>
            </motion.div>
         </AnimatePresence>
         {dialogos}
      </div>
   );
}
