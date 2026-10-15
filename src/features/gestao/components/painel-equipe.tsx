/**
 * Equipe e metas (aba da área de gestão): rendimento da equipe de vendas no mês contra a meta.
 *
 * - Topo: meta da equipe num anel (realizado ÷ meta, com os dois números) e o ritmo do mês ao lado.
 * - Consultores: uma linha por pessoa, ordenada por quanto da meta já fez. Situação = ponto +
 *   palavra; projeção sempre rotulada como estimativa; conversão sempre com denominador.
 * - Clicar numa linha abre o detalhe (URL `consultor`), onde a gestora ajusta a meta.
 * Loading/erro/vazio por `AsyncState`.
 */
import { motion } from "motion/react";
import { ChevronRight, RotateCcw, Users } from "lucide-react";

import { Denominator } from "@/components/core/denominator";
import { EmptyPanel } from "@/components/core/empty-panel";
import { Hint } from "@/components/core/hint";
import { Initials } from "@/components/core/initials";
import { MeterBar } from "@/components/core/meter-bar";
import { ProgressRing } from "@/components/core/progress-ring";
import { Status } from "@/components/core/status";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgora } from "@/hooks/use-agora";
import { decimal, int, monthLabel, percent, plural, relative } from "@/lib/format";
import { pressSubtle, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useEquipe } from "@/features/gestao/api/gestao.queries";
import { DetalheConsultor } from "@/features/gestao/components/detalhe-consultor";
import { GraficoRitmo } from "@/features/gestao/components/grafico-ritmo";
import { TOM_METER, TOM_SITUACAO } from "@/features/gestao/components/situacao";
import {
   acumulado,
   avaliarMeta,
   carteiraAtiva,
   ordenarPorRendimento,
   progressoDoMes,
   totalDaEquipe,
   type ProgressoMes,
} from "@/features/gestao/domain/metas";
import { useGestaoUrl } from "@/features/gestao/hooks/use-gestao-url";
import { ROTULO_SITUACAO, type ConsultorDesempenho, type Equipe } from "@/features/gestao/types/gestao.schema";

export function PainelEquipe() {
   const { mes, consultor, definir } = useGestaoUrl();
   const consulta = useEquipe(mes);
   const agora = useAgora();
   const dados = consulta.data;
   const aberto = dados?.consultores.find(c => c.id === consultor) ?? null;

   return (
      <section aria-labelledby="equipe-titulo" className="space-y-5">
         <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div className="min-w-0">
               <h2 id="equipe-titulo" className="text-[17px] leading-tight font-semibold tracking-[-0.02em] text-ink">
                  Rendimento da equipe de vendas
               </h2>
               <p className="mt-1 text-[12px] text-ink-3">
                  {dados ? <Calendario progresso={progressoDoMes(dados.mes, agora)} /> : "Calculando"}
                  {dados ? ` · atualizado ${relative(dados.geradoEm, agora)}` : null}
               </p>
            </div>
            {dados ? (
               <Select value={dados.mes} onValueChange={v => definir("mes", v === dados.mesesDisponiveis[0] ? null : v)}>
                  <SelectTrigger size="sm" aria-label="Mês" className="min-w-[180px] text-[12.5px]">
                     <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                     {dados.mesesDisponiveis.map(m => (
                        <SelectItem key={m} value={m}>
                           {monthLabel(m)}
                        </SelectItem>
                     ))}
                  </SelectContent>
               </Select>
            ) : null}
         </header>

         <AsyncState
            isLoading={consulta.isLoading}
            isError={consulta.isError && !dados}
            loading={<EquipeSkeleton />}
            error={
               <EmptyPanel
                  tone="crit"
                  icon={Users}
                  title="Não foi possível carregar a equipe"
                  message="A consulta falhou antes de terminar. Nada foi perdido: tente de novo; se continuar, avise o suporte."
                  action={
                     <Button variant="secondary" size="sm" icon={<RotateCcw />} onClick={() => consulta.refetch()}>
                        Tentar de novo
                     </Button>
                  }
               />
            }
         >
            {dados ? <Conteudo dados={dados} agora={agora} onAbrir={id => definir("consultor", id)} /> : null}
         </AsyncState>

         <DetalheConsultor
            consultor={aberto}
            mes={dados?.mes ?? null}
            progresso={dados ? progressoDoMes(dados.mes, agora) : null}
            onFechar={() => definir("consultor", null)}
         />
      </section>
   );
}

function Calendario({ progresso: p }: { progresso: ProgressoMes }) {
   if (p.fechado) return <>Mês fechado · {plural(p.total, "dia útil", "dias úteis")}</>;
   return (
      <>
         Dia útil {int(p.decorridos)} de {int(p.total)} · {plural(p.restantes, "dia útil restante", "dias úteis restantes")}
      </>
   );
}

function Conteudo({ dados, agora, onAbrir }: { dados: Equipe; agora: Date; onAbrir: (id: string) => void }) {
   const progresso = progressoDoMes(dados.mes, agora);
   const total = totalDaEquipe(dados.consultores);
   const leitura = avaliarMeta(total.meta, total.matriculas, progresso);
   const [ano, m] = dados.mes.split("-").map(Number);
   const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();

   if (dados.consultores.length === 0)
      return (
         <EmptyPanel
            icon={Users}
            title="Nenhum consultor na equipe"
            message="Quando a equipe de vendas for configurada, ela aparece aqui."
         />
      );

   return (
      <div className="space-y-5">
         <div className="grid gap-3 xl:grid-cols-12">
            <section aria-labelledby="equipe-meta" className="flex flex-col rounded-xl bg-card p-5 xl:col-span-5">
               <div className="flex items-center gap-1.5">
                  <h3 id="equipe-meta" className="text-[13px] font-semibold text-ink">
                     Meta da equipe
                  </h3>
                  <Hint label="a meta da equipe">
                     Soma das metas mensais de matrícula de cada consultor. O ritmo compara o realizado com a parte da meta esperada para os
                     dias úteis já passados.
                  </Hint>
               </div>
               <div className="mt-4 flex flex-1 items-center gap-6">
                  <ProgressRing
                     value={leitura.fracao ?? 0}
                     size={136}
                     thickness={12}
                     tone={TOM_METER[leitura.situacao]}
                     label={`${int(total.matriculas)} de ${int(total.meta)} matrículas`}
                  >
                     <span className="text-[30px] leading-none font-semibold tracking-tight text-ink">
                        {leitura.fracao === null ? "—" : percent(leitura.fracao, 0)}
                     </span>
                     <span className="mt-1 text-[11px] text-ink-3">da meta</span>
                  </ProgressRing>
                  <dl className="min-w-0 flex-1 space-y-2.5 text-[12.5px]">
                     <Linha titulo="Matrículas">
                        <span className="font-mono font-medium text-ink">{int(total.matriculas)}</span>
                        <span className="text-ink-3"> de {int(total.meta)}</span>
                     </Linha>
                     {!progresso.fechado ? (
                        <>
                           <Linha titulo="Esperado até hoje">
                              <span className="font-mono text-ink-2">{int(Math.round(leitura.esperado))}</span>
                           </Linha>
                           <Linha titulo="Projeção (estimativa)">
                              <span className="font-mono text-ink-2">{leitura.projecao === null ? "—" : int(leitura.projecao)}</span>
                           </Linha>
                           <Linha titulo="Para bater a meta">
                              {leitura.faltam === 0 ? (
                                 <span className="text-ink-2">meta batida</span>
                              ) : (
                                 <span className="text-ink-2">
                                    <span className="font-mono">{int(leitura.faltam)}</span> em {plural(progresso.restantes, "dia", "dias")}
                                    {leitura.porDiaUtil !== null ? ` · ${decimal(leitura.porDiaUtil, 1)} por dia` : ""}
                                 </span>
                              )}
                           </Linha>
                        </>
                     ) : null}
                     <div className="pt-0.5">
                        <Status tone={TOM_SITUACAO[leitura.situacao]} solid>
                           {ROTULO_SITUACAO[leitura.situacao]}
                        </Status>
                     </div>
                  </dl>
               </div>
            </section>

            <section aria-labelledby="equipe-ritmo" className="rounded-xl bg-card p-5 xl:col-span-7">
               <div className="mb-2 flex items-baseline justify-between gap-3">
                  <h3 id="equipe-ritmo" className="text-[13px] font-semibold text-ink">
                     Ritmo do mês
                  </h3>
                  <span className="flex items-center gap-3 text-[11px] text-ink-3">
                     <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="h-0.5 w-3.5 rounded-full bg-brand" />
                        Matrículas acumuladas
                     </span>
                     <span className="inline-flex items-center gap-1.5">
                        <span aria-hidden className="h-px w-3.5 bg-ink-4" />
                        Ritmo da meta
                     </span>
                  </span>
               </div>
               <GraficoRitmo acumulado={acumulado(total.porDia)} diasNoMes={diasNoMes} meta={total.meta} rotulo="Ritmo da equipe" />
            </section>
         </div>

         <TabelaConsultores consultores={dados.consultores} progresso={progresso} onAbrir={onAbrir} />
      </div>
   );
}

function Linha({ titulo, children }: { titulo: string; children: React.ReactNode }) {
   return (
      <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2 last:border-0">
         <dt className="text-ink-3">{titulo}</dt>
         <dd className="text-right">{children}</dd>
      </div>
   );
}

const COLUNAS = "grid grid-cols-[minmax(180px,1.4fr)_minmax(170px,1.3fr)_72px_96px_minmax(150px,1fr)_84px_132px_20px] items-center gap-x-4";

function TabelaConsultores({
   consultores,
   progresso,
   onAbrir,
}: {
   consultores: readonly ConsultorDesempenho[];
   progresso: ProgressoMes;
   onAbrir: (id: string) => void;
}) {
   const ordenados = ordenarPorRendimento(consultores);
   return (
      <section aria-labelledby="equipe-consultores" className="rounded-xl bg-card">
         <div className="flex items-baseline justify-between gap-3 px-5 pt-4 pb-2">
            <h3 id="equipe-consultores" className="text-[13px] font-semibold text-ink">
               Consultores
            </h3>
            <span className="text-[11.5px] text-ink-3">Ordenados por quanto da meta já fizeram · clique para ver e ajustar a meta</span>
         </div>
         <div role="table" aria-label="Rendimento por consultor" className="overflow-x-auto">
            <div role="rowgroup">
               <div role="row" className={cn(COLUNAS, "border-b border-hairline px-5 py-2 text-[11.5px] font-medium text-ink-3")}>
                  <span role="columnheader">Consultor</span>
                  <span role="columnheader">Matrículas ÷ meta</span>
                  <span role="columnheader" className="text-right">
                     Atingido
                  </span>
                  <span role="columnheader" className="text-right">
                     {progresso.fechado ? "Fechou em" : "Projeção"}
                  </span>
                  <span role="columnheader">Conversão</span>
                  <span role="columnheader" className="text-right">
                     Carteira
                  </span>
                  <span role="columnheader">Situação</span>
                  <span role="columnheader" className="sr-only">
                     Abrir
                  </span>
               </div>
            </div>
            <motion.div role="rowgroup" variants={staggerContainer} initial="initial" animate="animate">
               {ordenados.map(c => {
                  const l = avaliarMeta(c.meta, c.matriculas, progresso);
                  return (
                     <motion.div
                        key={c.id}
                        role="row"
                        variants={staggerItem}
                        whileTap={pressSubtle}
                        tabIndex={0}
                        aria-label={`${c.nome}: ${int(c.matriculas)} de ${int(c.meta)} matrículas, ${ROTULO_SITUACAO[l.situacao].toLowerCase()}. Abrir detalhe`}
                        onClick={() => onAbrir(c.id)}
                        onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onAbrir(c.id))}
                        className={cn(
                           COLUNAS,
                           "cursor-pointer border-b border-hairline px-5 py-3 transition-colors outline-none last:border-0 hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-inset",
                        )}
                     >
                        <span role="cell" className="flex min-w-0 items-center gap-2.5">
                           <Initials nome={c.nome} size="sm" />
                           <span className="truncate text-[13px] font-medium text-ink">{c.nome}</span>
                        </span>
                        <span role="cell" className="space-y-1.5">
                           <span className="block text-[12.5px]">
                              <span className="font-mono font-medium text-ink tabular-nums">{int(c.matriculas)}</span>
                              <span className="text-ink-3"> de {int(c.meta)}</span>
                           </span>
                           <MeterBar
                              value={l.fracao ?? 0}
                              tone={TOM_METER[l.situacao]}
                              height={5}
                              label={`${int(c.matriculas)} de ${int(c.meta)} matrículas`}
                           />
                        </span>
                        <span role="cell" className="text-right font-mono text-[12.5px] font-medium text-ink tabular-nums">
                           {l.fracao === null ? "—" : percent(l.fracao, 0)}
                        </span>
                        <span role="cell" className="text-right font-mono text-[12.5px] text-ink-2 tabular-nums">
                           {progresso.fechado ? int(c.matriculas) : l.projecao === null ? "—" : `≈ ${int(l.projecao)}`}
                        </span>
                        <span role="cell" className="min-w-0">
                           <Denominator
                              numerator={c.matriculas}
                              denominator={c.analisesConcluidas}
                              denominatorLabel="análises"
                              className="text-[11.5px]"
                           />
                        </span>
                        <span role="cell" className="text-right font-mono text-[12.5px] text-ink-2 tabular-nums">
                           {int(carteiraAtiva(c))}
                        </span>
                        <span role="cell">
                           <Status tone={TOM_SITUACAO[l.situacao]} solid={l.situacao === "ABAIXO" || l.situacao === "NAO_ATINGIDA"}>
                              {ROTULO_SITUACAO[l.situacao]}
                           </Status>
                        </span>
                        <ChevronRight aria-hidden className="size-4 text-ink-4" />
                     </motion.div>
                  );
               })}
            </motion.div>
         </div>
         {!progresso.fechado ? (
            <p className="border-t border-hairline px-5 py-2.5 text-[11px] text-ink-3">
               Projeção é estimativa: o ritmo de cada consultor até hoje, estendido até o último dia útil do mês.
            </p>
         ) : null}
      </section>
   );
}

function EquipeSkeleton() {
   return (
      <div className="space-y-5" aria-busy="true" aria-label="Carregando equipe">
         <div className="grid gap-3 xl:grid-cols-12">
            <div className="flex items-center gap-6 rounded-xl bg-card p-5 xl:col-span-5">
               <Skeleton className="size-[136px] rounded-full" />
               <div className="flex-1 space-y-3">
                  {Array.from({ length: 4 }, (_, i) => (
                     <Skeleton key={i} className="h-3.5 w-full" />
                  ))}
               </div>
            </div>
            <div className="rounded-xl bg-card p-5 xl:col-span-7">
               <Skeleton className="h-4 w-28" />
               <Skeleton className="mt-4 h-[180px] w-full" />
            </div>
         </div>
         <div className="space-y-3 rounded-xl bg-card p-5">
            {Array.from({ length: 5 }, (_, i) => (
               <Skeleton key={i} className="h-9 w-full" />
            ))}
         </div>
      </div>
   );
}
