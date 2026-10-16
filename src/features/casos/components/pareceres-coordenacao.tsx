/**
 * Pareceres da coordenação (`/pareceres`, acesso Coordenadores; decisão de 15/10/2026). A porta de
 * entrada do coordenador: só o que espera o parecer dele, direto (sem passo a passo desde 16/10/2026).
 *
 * - "Aguardando o seu parecer": protocolos em AGUARDANDO_COORDENACAO sob a responsabilidade dele.
 * - "Devolvidos para a equipe": os que ele já respondeu e a equipe de análises está conferindo.
 * - "Dar parecer" abre o protocolo na aba Análise, filtrada nas perguntas, e o "Voltar" traz de volta.
 * Loading/erro/vazio por `AsyncState`.
 */
import { motion } from "motion/react";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

import { EmptyPanel } from "@/components/core/empty-panel";
import { SectionLabel } from "@/components/core/section-label";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { useMe } from "@/features/sessao";
import { useAgora } from "@/hooks/use-agora";
import { relative } from "@/lib/format";
import { staggerContainer, staggerItem } from "@/lib/motion";

import { useCasos } from "@/features/casos/api/casos.queries";
import type { FiltrosFila } from "@/features/casos/api/casos.keys";
import { Prazo } from "@/features/casos/components/prazo";
import { ROTULO_MODALIDADE, ROTULO_TIPO_COMPLETO, type CasoResumo } from "@/features/casos/types/caso.schema";

const BASE: FiltrosFila = {
   visao: "TODOS",
   processo: null,
   etapa: null,
   tipo: null,
   curso: null,
   turno: null,
   modalidade: null,
   responsavel: null,
   somenteAtrasados: false,
   comPendencia: false,
   ouvidoria: false,
   incluirEncerrados: false,
   ciclo: null,
   q: "",
   ordem: "SLA",
};

function linkDoParecer(caso: CasoResumo): string {
   const p = new URLSearchParams({ caso: caso.id, aba: "analise", filtro: "coordenacao", voltar: "pareceres" });
   return `/analises?${p.toString()}`;
}

export function PareceresCoordenacao() {
   const me = useMe().data;
   const agora = useAgora();
   const pendentes = useCasos({ ...BASE, etapa: "AGUARDANDO_COORDENACAO", responsavel: me?.id ?? null });
   const devolvidos = useCasos({ ...BASE, etapa: "AJUSTE_POS_COORDENACAO", ordem: "MAIS_ANTIGOS" });
   const cursos = new Set(me?.cursosCoordenados ?? []);
   const listaPendentes = pendentes.data?.pages.flatMap(p => p.itens) ?? [];
   const listaDevolvidos = (devolvidos.data?.pages.flatMap(p => p.itens) ?? []).filter(c => cursos.has(c.destino.cursoId));

   return (
      <div className="mx-auto w-full max-w-[1180px] space-y-6 px-1 pt-1 pb-8">
         <header>
            <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
               Pareceres da coordenação
            </h1>
            <p className="mt-1 text-[13px] text-ink-3">Os protocolos em que a equipe de análises pediu o seu parecer técnico.</p>
         </header>

         <section aria-labelledby="pareceres-pendentes" className="space-y-3">
            <SectionLabel>
               <span id="pareceres-pendentes">Aguardando o seu parecer{pendentes.data ? ` · ${listaPendentes.length}` : ""}</span>
            </SectionLabel>
            <AsyncState
               isLoading={pendentes.isLoading || !me}
               isError={pendentes.isError}
               isEmpty={listaPendentes.length === 0}
               loading={
                  <div className="grid grid-cols-2 gap-3">
                     {[0, 1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-[118px] rounded-xl" />
                     ))}
                  </div>
               }
               error={
                  <EmptyPanel
                     tone="crit"
                     title="Não foi possível carregar os pareceres"
                     message="Recarregue a página para tentar de novo."
                  />
               }
               empty={
                  <EmptyPanel
                     icon={GraduationCap}
                     title="Nenhum parecer pendente"
                     message="Quando a equipe de análises pedir o seu parecer, o protocolo aparece aqui e você recebe uma notificação."
                  />
               }
            >
               <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="grid grid-cols-2 gap-3">
                  {listaPendentes.map(c => (
                     <motion.li key={c.id} variants={staggerItem}>
                        <Link
                           to={linkDoParecer(c)}
                           className="group flex h-full flex-col gap-3 rounded-xl bg-card p-4 transition-colors outline-none hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus"
                        >
                           <span className="flex items-start justify-between gap-3">
                              <span className="min-w-0">
                                 <span className="block truncate text-[14px] font-semibold text-ink">{c.candidato.nome}</span>
                                 <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                                    {ROTULO_TIPO_COMPLETO[c.tipo]} · {c.destino.cursoNome} · {ROTULO_MODALIDADE[c.destino.modalidade]}
                                 </span>
                              </span>
                              <span className="font-mono text-[11.5px] text-ink-4">{c.protocolo}</span>
                           </span>
                           <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                              <Prazo sla={c.sla} agora={agora} />
                              {c.reanalises > 0 ? (
                                 <span className="inline-flex items-center gap-1.5 font-medium text-risk-ink">
                                    <span aria-hidden className="size-1.25 rounded-full bg-risk" />
                                    Contestação do aluno
                                 </span>
                              ) : null}
                              <span className="text-ink-4">pedido {relative(c.etapaDesde, agora)}</span>
                           </span>
                           <span className="mt-auto inline-flex items-center gap-1.5 text-[12.5px] font-medium text-brand-text">
                              Dar parecer
                              <ArrowRight aria-hidden className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                           </span>
                        </Link>
                     </motion.li>
                  ))}
               </motion.ul>
            </AsyncState>
         </section>

         {listaDevolvidos.length > 0 ? (
            <section aria-labelledby="pareceres-devolvidos" className="space-y-3">
               <SectionLabel>
                  <span id="pareceres-devolvidos">Devolvidos para a equipe conferir · {listaDevolvidos.length}</span>
               </SectionLabel>
               <ul className="divide-y divide-hairline rounded-xl bg-card">
                  {listaDevolvidos.slice(0, 8).map(c => (
                     <li key={c.id}>
                        <Link
                           to={linkDoParecer(c)}
                           className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-surface-hover"
                        >
                           <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-ink">{c.candidato.nome}</span>
                              <span className="text-[11.5px] text-ink-3">
                                 {c.destino.cursoNome} · devolvido {relative(c.etapaDesde, agora)}
                              </span>
                           </span>
                           <span className="font-mono text-[11.5px] text-ink-4">{c.protocolo}</span>
                        </Link>
                     </li>
                  ))}
               </ul>
            </section>
         ) : null}
      </div>
   );
}
