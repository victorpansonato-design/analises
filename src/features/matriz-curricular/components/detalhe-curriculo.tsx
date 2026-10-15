/**
 * Página inteira de um currículo: identidade (curso, modalidade, turno, código e vigência), as
 * horas em cartões tonais e duas abas: as disciplinas seriadas por período e as disciplinas por
 * grupo (sem série obrigatória). "Voltar" devolve a mesma busca.
 */
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, CircleAlert, Clock, FileSearch, GraduationCap, HandHeart, RotateCcw, Shuffle, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Status } from "@/components/core/status";
import { Surface } from "@/components/core/surface";
import { Tag } from "@/components/core/tag";
import { UnderlineTabs } from "@/components/core/underline-tabs";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fullDate, horas, int, plural } from "@/lib/format";
import { enterFast, exitFast } from "@/lib/motion";

import { curriculoNaoEncontrado, useCurriculo } from "@/features/matriz-curricular/api/matriz.queries";
import { DisciplinasPorGrupo, DisciplinasPorPeriodo } from "@/features/matriz-curricular/components/disciplinas";
import type { AbaCurriculo, MatrizUrl } from "@/features/matriz-curricular/hooks/use-matriz-url";
import { ROTULO_MODALIDADE_MATRIZ, ROTULO_TURNO_MATRIZ, type Curriculo } from "@/features/matriz-curricular/types/matriz.schema";

import "./matriz-curricular.css";

export function DetalheCurriculo({ id, url }: { id: string; url: MatrizUrl }) {
   const curriculo = useCurriculo(id);
   const naoEncontrado = curriculoNaoEncontrado(curriculo.error);

   return (
      <>
         <div>
            <Button variant="ghost" size="sm" onClick={url.fecharCurriculo} icon={<ArrowLeft aria-hidden />} className="-ml-2">
               Voltar
            </Button>
         </div>
         <AsyncState
            isLoading={curriculo.isPending}
            isError={curriculo.isError}
            loading={<CarregandoCurriculo />}
            error={
               <Surface>
                  {naoEncontrado ? (
                     <EmptyPanel
                        icon={FileSearch}
                        title="Currículo não encontrado"
                        message="O link pode estar desatualizado. Volte à busca e abra o currículo pelo curso."
                     />
                  ) : (
                     <EmptyPanel
                        tone="crit"
                        icon={CircleAlert}
                        title="Não foi possível abrir o currículo"
                        message="A consulta falhou. Tente de novo em instantes."
                        action={
                           <Button onClick={() => void curriculo.refetch()} icon={<RotateCcw aria-hidden />}>
                              Tentar de novo
                           </Button>
                        }
                     />
                  )}
               </Surface>
            }
         >
            {curriculo.data ? <ConteudoCurriculo curriculo={curriculo.data} aba={url.aba} onAba={url.setAba} /> : null}
         </AsyncState>
      </>
   );
}

function ConteudoCurriculo({ curriculo: c, aba, onAba }: { curriculo: Curriculo; aba: AbaCurriculo; onAba: (a: AbaCurriculo) => void }) {
   const extensao = c.grupos.find(g => g.tipo === "EXTENSAO");
   const eletivas = c.grupos.find(g => g.tipo === "ELETIVAS");

   return (
      <div className="flex flex-col gap-5">
         <header className="px-1">
            <p className="text-[12.5px] text-ink-3">
               {ROTULO_MODALIDADE_MATRIZ[c.oferta.modalidade]}
               {c.turno ? ` · ${ROTULO_TURNO_MATRIZ[c.turno]}` : ""} · Código do curso{" "}
               <span className="font-mono font-medium text-ink-2">{c.oferta.codigo}</span>
            </p>
            <h1 className="mt-1 text-[28px] leading-tight font-semibold tracking-[-0.03em]">{c.oferta.curso}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px]">
               <span className="font-medium text-ink">{c.rotulo}</span>
               <Tag mono>{c.codigo}</Tag>
               <span className="text-ink-3">Vigência desde {fullDate(c.vigenciaInicio)}</span>
               {c.ativo ? null : <Status tone="muted">Inativo</Status>}
            </div>
         </header>

         <div className="grid grid-cols-4 gap-3" aria-label="Horas do currículo" role="group">
            <CartaoHoras
               tom="total"
               icon={Clock}
               rotulo="Carga horária total"
               valor={c.chTotal}
               detalhe={`${plural(c.totalDisciplinas, "disciplina", "disciplinas")} em ${plural(c.periodos, "período", "períodos")}`}
            />
            <CartaoHoras
               tom="extensao"
               icon={HandHeart}
               rotulo="Horas de extensão"
               valor={c.horas.extensao}
               detalhe={
                  extensao
                     ? plural(extensao.disciplinas.length, "prática extensionista", "práticas extensionistas")
                     : "Dentro das disciplinas do curso"
               }
            />
            <CartaoHoras
               tom="complementares"
               icon={GraduationCap}
               rotulo="Horas complementares"
               valor={c.horas.complementares}
               detalhe="Atividades fora da grade"
            />
            <CartaoHoras
               tom="eletivas"
               icon={Shuffle}
               rotulo="Horas eletivas"
               valor={c.horas.eletivas}
               detalhe={eletivas ? `Escolhidas entre ${int(eletivas.disciplinas.length)} opções` : "Este currículo não tem eletivas"}
            />
         </div>

         <Surface padded={false}>
            <div className="px-5 pt-1.5">
               <UnderlineTabs
                  ariaLabel="Disciplinas do currículo"
                  layoutId="matriz-abas"
                  idBase="matriz"
                  value={aba}
                  onChange={onAba}
                  tabs={[
                     { value: "disciplinas", label: "Disciplinas", count: int(c.disciplinas.length) },
                     {
                        value: "grupos",
                        label: "Disciplinas por grupo",
                        count: int(c.grupos.reduce((soma, g) => soma + g.disciplinas.length, 0)),
                     },
                  ]}
               />
            </div>
            <AnimatePresence mode="wait" initial={false}>
               <motion.div
                  key={aba}
                  role="tabpanel"
                  id={`matriz-panel-${aba}`}
                  aria-labelledby={`matriz-tab-${aba}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: enterFast }}
                  exit={{ opacity: 0, transition: exitFast }}
                  className="p-5"
               >
                  {aba === "disciplinas" ? (
                     <DisciplinasPorPeriodo disciplinas={c.disciplinas} />
                  ) : (
                     <DisciplinasPorGrupo grupos={c.grupos} />
                  )}
               </motion.div>
            </AnimatePresence>
         </Surface>
      </div>
   );
}

function CartaoHoras({
   tom,
   icon: Icon,
   rotulo,
   valor,
   detalhe,
}: {
   tom: "total" | "extensao" | "complementares" | "eletivas";
   icon: LucideIcon;
   rotulo: string;
   valor: number;
   detalhe: ReactNode;
}) {
   return (
      <div className="matriz-horas flex flex-col rounded-xl p-4" data-tom={tom}>
         <div className="flex items-start justify-between gap-3">
            <span className="text-[12.5px] font-medium">{rotulo}</span>
            <Icon className="size-4 opacity-70" aria-hidden />
         </div>
         <span className="mt-3 font-mono text-[26px] leading-none font-medium tracking-tight">{horas(valor)}</span>
         <span className="mt-2 text-[12px] text-ink-2">{detalhe}</span>
      </div>
   );
}

function CarregandoCurriculo() {
   return (
      <div aria-busy="true" className="flex flex-col gap-5">
         <div className="flex flex-col gap-2 px-1">
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-8 w-80" />
            <Skeleton className="h-4 w-72" />
         </div>
         <div className="grid grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
               <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
         </div>
         <Skeleton className="h-96 rounded-xl" />
         <span className="sr-only">Carregando o currículo…</span>
      </div>
   );
}
