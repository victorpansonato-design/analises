/**
 * As duas abas do currículo. Disciplinas: seriadas, por período, com subtotal de CH. Disciplinas
 * por grupo: as que não têm série obrigatória (estágio, eletivas, TCC, práticas extensionistas),
 * cada grupo com a sua regra. Lista com divisor hairline; código e CH em mono para alinhar.
 */
import { BriefcaseBusiness, GraduationCap, HandHeart, Layers, Shuffle, type LucideIcon } from "lucide-react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { horas, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

import { chDoGrupo, disciplinasPorPeriodo, regraDoGrupo, rotuloPeriodo } from "@/features/matriz-curricular/domain/curriculo";
import {
   ROTULO_GRUPO,
   type DisciplinaCurriculo,
   type DisciplinaSeriada,
   type GrupoDisciplinas,
   type TipoGrupo,
} from "@/features/matriz-curricular/types/matriz.schema";

const ICONE_GRUPO: Record<TipoGrupo, LucideIcon> = {
   ESTAGIO: BriefcaseBusiness,
   ELETIVAS: Shuffle,
   TCC: GraduationCap,
   EXTENSAO: HandHeart,
};

export function DisciplinasPorPeriodo({ disciplinas }: { disciplinas: readonly DisciplinaSeriada[] }) {
   const periodos = disciplinasPorPeriodo(disciplinas);
   if (!periodos.length)
      return (
         <EmptyPanel compact icon={Layers} title="Nenhuma disciplina seriada" message="Este currículo não tem disciplinas por período." />
      );

   return (
      <div className="grid grid-cols-2 gap-x-10 gap-y-8">
         {periodos.map(p => (
            <section key={p.periodo} aria-labelledby={`matriz-periodo-${p.periodo}`}>
               <div className="flex items-baseline justify-between gap-4 border-b border-hairline pb-2">
                  <h3 id={`matriz-periodo-${p.periodo}`} className="text-[13px] font-semibold text-ink">
                     {rotuloPeriodo(p.periodo)}
                  </h3>
                  <span className="text-[12px] text-ink-3">
                     {plural(p.disciplinas.length, "disciplina", "disciplinas")} ·{" "}
                     <span className="font-mono font-medium text-ink-2">{horas(p.ch)}</span>
                  </span>
               </div>
               <ListaDisciplinas disciplinas={p.disciplinas} />
            </section>
         ))}
      </div>
   );
}

export function DisciplinasPorGrupo({ grupos }: { grupos: readonly GrupoDisciplinas[] }) {
   if (!grupos.length)
      return (
         <EmptyPanel
            icon={Layers}
            title="Este currículo não tem disciplinas por grupo"
            message="Todas as disciplinas têm período definido e aparecem na aba Disciplinas."
         />
      );

   return (
      <div className="grid grid-cols-2 gap-4">
         {grupos.map(g => {
            const Icone = ICONE_GRUPO[g.tipo];
            return (
               <section key={g.id} aria-labelledby={`matriz-grupo-${g.id}`} className="rounded-xl bg-surface-2 p-4">
                  <div className="flex items-start gap-3">
                     <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-card text-ink-3">
                        <Icone className="size-4" aria-hidden />
                     </span>
                     <div className="min-w-0 flex-1">
                        <h3 id={`matriz-grupo-${g.id}`} className="text-[14px] leading-tight font-semibold text-ink">
                           {ROTULO_GRUPO[g.tipo]}
                        </h3>
                        <p className="mt-1 text-[12px] text-ink-3">{regraDoGrupo(g)}</p>
                     </div>
                     <span className="shrink-0 font-mono text-[13px] font-medium text-ink-2">{horas(chDoGrupo(g))}</span>
                  </div>
                  <ListaDisciplinas disciplinas={g.disciplinas} className="mt-3 border-t border-hairline" />
               </section>
            );
         })}
      </div>
   );
}

function ListaDisciplinas({ disciplinas, className }: { disciplinas: readonly DisciplinaCurriculo[]; className?: string }) {
   return (
      <ul className={cn("divide-y divide-hairline", className)}>
         {disciplinas.map(d => (
            <li key={d.codigo} className="grid grid-cols-[76px_minmax(0,1fr)_52px] items-baseline gap-3 py-2">
               <span className="font-mono text-[12px] text-ink-3">{d.codigo}</span>
               <span className="text-[13px] text-ink">{d.nome}</span>
               <span className="text-right font-mono text-[12px] text-ink-2">{horas(d.ch)}</span>
            </li>
         ))}
      </ul>
   );
}
