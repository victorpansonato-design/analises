/**
 * Detalhe de um consultor (Drawer, URL `consultor`): o mês dele contra a meta, o histórico de seis
 * meses, a carteira ativa por etapa e a meta do mês, que a gestora ajusta aqui.
 *
 * - "Salvar meta" é a única ação primária. Mês fechado não muda meta: o campo some e o motivo aparece.
 * - A meta vai com a versão lida (`If-Match`); conflito recarrega e avisa, nunca sobrescreve.
 * - Formulário RHF + Zod; o valor nasce da meta atual e reinicia ao trocar de consultor.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Denominator } from "@/components/core/denominator";
import { Drawer } from "@/components/core/overlay";
import { Field } from "@/components/core/field";
import { MeterBar } from "@/components/core/meter-bar";
import { SectionLabel } from "@/components/core/section-label";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROTULO_ETAPA } from "@/features/casos";
import { decimal, duration, int, monthLabel, percent, plural } from "@/lib/format";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { useDefinirMeta } from "@/features/gestao/api/gestao.mutations";
import { GraficoRitmo } from "@/features/gestao/components/grafico-ritmo";
import { TOM_METER, TOM_SITUACAO } from "@/features/gestao/components/situacao";
import { acumulado, avaliarMeta, carteiraAtiva, type ProgressoMes } from "@/features/gestao/domain/metas";
import { ROTULO_SITUACAO, type ConsultorDesempenho } from "@/features/gestao/types/gestao.schema";

interface DetalheConsultorProps {
   consultor: ConsultorDesempenho | null;
   mes: string | null;
   progresso: ProgressoMes | null;
   onFechar: () => void;
}

export function DetalheConsultor({ consultor, mes, progresso, onFechar }: DetalheConsultorProps) {
   const leitura = consultor && progresso ? avaliarMeta(consultor.meta, consultor.matriculas, progresso) : null;
   return (
      <Drawer
         open={consultor !== null}
         onOpenChange={aberto => !aberto && onFechar()}
         title={consultor?.nome ?? "Consultor"}
         description={mes ? `Consultor de vendas · ${monthLabel(mes)}` : undefined}
         width="lg"
         footer={
            <Button variant="secondary" onClick={onFechar}>
               Voltar à equipe
            </Button>
         }
      >
         {consultor && mes && progresso && leitura ? (
            <div className="space-y-6 px-5 py-5">
               <div className="grid grid-cols-3 gap-3">
                  <Numero titulo="Matrículas">
                     <span className="text-[24px] leading-none font-semibold tracking-tight text-ink">{int(consultor.matriculas)}</span>
                     <span className="text-[12px] text-ink-3"> de {int(consultor.meta)}</span>
                     <MeterBar
                        value={leitura.fracao ?? 0}
                        tone={TOM_METER[leitura.situacao]}
                        height={5}
                        label={`${int(consultor.matriculas)} de ${int(consultor.meta)} matrículas`}
                        className="mt-2.5"
                     />
                  </Numero>
                  <Numero titulo={progresso.fechado ? "Fechou o mês com" : "Projeção (estimativa)"}>
                     <span className="text-[24px] leading-none font-semibold tracking-tight text-ink">
                        {progresso.fechado ? int(consultor.matriculas) : leitura.projecao === null ? "—" : int(leitura.projecao)}
                     </span>
                     <p className="mt-2">
                        <Status tone={TOM_SITUACAO[leitura.situacao]} solid>
                           {ROTULO_SITUACAO[leitura.situacao]}
                        </Status>
                     </p>
                  </Numero>
                  <Numero titulo="Conversão">
                     <span className="text-[24px] leading-none font-semibold tracking-tight text-ink">
                        {consultor.analisesConcluidas > 0 ? percent(consultor.matriculas / consultor.analisesConcluidas, 0) : "—"}
                     </span>
                     <Denominator
                        numerator={consultor.matriculas}
                        numeratorLabel="matrículas"
                        denominator={consultor.analisesConcluidas}
                        denominatorLabel="análises"
                        className="mt-2 text-[11.5px]"
                     />
                  </Numero>
               </div>

               <section className="space-y-2" aria-labelledby="det-ritmo">
                  <SectionLabel>
                     <span id="det-ritmo">Ritmo do mês</span>
                  </SectionLabel>
                  <GraficoRitmo
                     acumulado={acumulado(consultor.matriculasPorDia)}
                     diasNoMes={diasNoMes(mes)}
                     meta={consultor.meta}
                     rotulo={`Ritmo de ${consultor.nome}`}
                     altura={170}
                  />
                  {!progresso.fechado && leitura.faltam > 0 && leitura.porDiaUtil !== null ? (
                     <p className="text-[12px] text-ink-3">
                        Faltam <span className="font-mono font-medium text-ink-2">{int(leitura.faltam)}</span> em{" "}
                        {plural(progresso.restantes, "dia útil", "dias úteis")}: {decimal(leitura.porDiaUtil, 1)} por dia.
                     </p>
                  ) : null}
               </section>

               <section className="space-y-3" aria-labelledby="det-historico">
                  <SectionLabel>
                     <span id="det-historico">Últimos meses</span>
                  </SectionLabel>
                  <Historico historico={consultor.historico} atual={mes} />
               </section>

               <div className="grid grid-cols-2 gap-6">
                  <section className="space-y-3" aria-labelledby="det-carteira">
                     <SectionLabel>
                        <span id="det-carteira">Carteira ativa · {int(carteiraAtiva(consultor))}</span>
                     </SectionLabel>
                     <Carteira consultor={consultor} />
                  </section>
                  <section className="space-y-3" aria-labelledby="det-atividade">
                     <SectionLabel>
                        <span id="det-atividade">Atividade no mês</span>
                     </SectionLabel>
                     <dl className="space-y-2 text-[12.5px]">
                        <Item titulo="Protocolos abertos" valor={int(consultor.protocolosAbertos)} />
                        <Item titulo="Propostas enviadas" valor={int(consultor.propostasEnviadas)} />
                        <Item titulo="Análises concluídas" valor={int(consultor.analisesConcluidas)} />
                        <Item
                           titulo="Primeiro contato (mediana)"
                           valor={consultor.primeiroContatoHoras === null ? "—" : duration(consultor.primeiroContatoHoras * 60)}
                        />
                     </dl>
                  </section>
               </div>

               <section className="space-y-3" aria-labelledby="det-meta">
                  <SectionLabel>
                     <span id="det-meta">Meta de {monthLabel(mes).toLowerCase()}</span>
                  </SectionLabel>
                  {progresso.fechado ? (
                     <p className="text-[12.5px] text-ink-3">
                        O mês já fechou com meta de {plural(consultor.meta, "matrícula", "matrículas")}: ela não muda mais.
                     </p>
                  ) : (
                     <FormularioMeta key={`${consultor.id}-${consultor.versaoMeta}`} consultor={consultor} mes={mes} />
                  )}
               </section>
            </div>
         ) : null}
      </Drawer>
   );
}

function diasNoMes(mes: string): number {
   const [ano, m] = mes.split("-").map(Number);
   return new Date(Date.UTC(ano, m, 0)).getUTCDate();
}

function Numero({ titulo, children }: { titulo: string; children: React.ReactNode }) {
   return (
      <div className="rounded-xl bg-surface-2 p-3.5">
         <p className="mb-2 text-[11.5px] font-medium text-ink-3">{titulo}</p>
         {children}
      </div>
   );
}

function Item({ titulo, valor }: { titulo: string; valor: string }) {
   return (
      <div className="flex items-baseline justify-between gap-3 border-b border-hairline pb-2 last:border-0">
         <dt className="text-ink-3">{titulo}</dt>
         <dd className="font-mono font-medium text-ink tabular-nums">{valor}</dd>
      </div>
   );
}

/** Colunas por mês (matrículas) com a marca da meta; o mês aberto ganha a cor, os outros ficam neutros. */
function Historico({ historico, atual }: { historico: ConsultorDesempenho["historico"]; atual: string }) {
   const maior = Math.max(1, ...historico.flatMap(h => [h.meta, h.matriculas]));
   const ALTURA = 96;
   return (
      <figure>
         <div
            role="img"
            aria-label={`Matrículas por mês: ${historico.map(h => `${monthLabel(h.mes)} ${int(h.matriculas)} de ${int(h.meta)}`).join(", ")}.`}
            className="grid items-end gap-3"
            style={{ gridTemplateColumns: `repeat(${historico.length}, minmax(0, 1fr))` }}
         >
            {historico.map(h => {
               const bateu = h.matriculas >= h.meta && h.meta > 0;
               return (
                  <div key={h.mes} className="flex flex-col items-center gap-1.5">
                     <span className="font-mono text-[11px] font-medium text-ink-2 tabular-nums">{int(h.matriculas)}</span>
                     <div className="relative flex w-full justify-center" style={{ height: ALTURA }}>
                        <span
                           aria-hidden
                           className="absolute inset-x-1 h-px bg-ink-3"
                           style={{ bottom: (h.meta / maior) * ALTURA }}
                           title={`Meta ${int(h.meta)}`}
                        />
                        <span
                           aria-hidden
                           className={cn("mt-auto w-6 max-w-full rounded-t-[4px]", h.mes === atual ? "bg-brand" : "bg-ink-4/45")}
                           style={{ height: Math.max(2, (h.matriculas / maior) * ALTURA) }}
                        />
                     </div>
                     <span className={cn("text-[11px]", h.mes === atual ? "font-semibold text-ink" : "text-ink-3")}>
                        {monthLabel(h.mes).slice(0, 3).toLowerCase()}
                     </span>
                     <span className="text-[10.5px] text-ink-4">{bateu ? "bateu" : `meta ${int(h.meta)}`}</span>
                  </div>
               );
            })}
         </div>
         <figcaption className="mt-2 flex items-center gap-1.5 text-[11px] text-ink-3">
            <span aria-hidden className="h-px w-3.5 bg-ink-3" /> Meta do mês
         </figcaption>
      </figure>
   );
}

function Carteira({ consultor }: { consultor: ConsultorDesempenho }) {
   const total = carteiraAtiva(consultor);
   if (total === 0) return <p className="text-[12.5px] text-ink-3">Nenhum protocolo em andamento.</p>;
   const maior = Math.max(...consultor.carteira.map(e => e.total));
   return (
      <ul className="space-y-2">
         {consultor.carteira.map(e => (
            <li key={e.etapa} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
               <span className="truncate text-[12.5px] text-ink-2">{ROTULO_ETAPA[e.etapa]}</span>
               <span className="font-mono text-[12px] font-medium text-ink tabular-nums">{int(e.total)}</span>
               <MeterBar
                  value={e.total / maior}
                  tone="ink"
                  height={4}
                  label={`${ROTULO_ETAPA[e.etapa]}: ${int(e.total)}`}
                  className="col-span-2"
               />
            </li>
         ))}
      </ul>
   );
}

const MetaFormSchema = z.object({
   meta: z
      .number({ error: "Informe a meta em número de matrículas" })
      .int("Use um número inteiro")
      .min(0, "A meta não pode ser negativa")
      .max(200, "A meta pode ter até 200 matrículas"),
});
type MetaForm = z.infer<typeof MetaFormSchema>;

function FormularioMeta({ consultor, mes }: { consultor: ConsultorDesempenho; mes: string }) {
   const definir = useDefinirMeta();
   const form = useForm<MetaForm>({ resolver: zodResolver(MetaFormSchema), defaultValues: { meta: consultor.meta } });
   const enviar = form.handleSubmit(v =>
      definir.mutate(
         { consultorId: consultor.id, mes, meta: v.meta, versao: consultor.versaoMeta },
         {
            onSuccess: () =>
               notificar({
                  titulo: `Meta de ${consultor.nome} salva`,
                  detalhe: `${plural(v.meta, "matrícula", "matrículas")} em ${monthLabel(mes).toLowerCase()}.`,
               }),
         },
      ),
   );
   const erro = form.formState.errors.meta?.message;
   return (
      <form onSubmit={enviar} className="flex items-end gap-3" noValidate>
         <Field label="Matrículas no mês" required error={erro} className="w-48">
            {props => (
               <Input
                  {...props}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={200}
                  step={1}
                  {...form.register("meta", { valueAsNumber: true })}
               />
            )}
         </Field>
         <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={definir.isPending || !form.formState.isDirty}
            className={erro ? "mb-6" : undefined}
         >
            {definir.isPending ? "Salvando" : "Salvar meta"}
         </Button>
      </form>
   );
}
