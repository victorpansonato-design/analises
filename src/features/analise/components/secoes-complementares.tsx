/**
 * Seções abaixo da grade (docs/06 §1 e §6): disciplinas da origem não aproveitadas, atividades
 * complementares (cada uma ≤ `REGRAS_ANALISE.atividadeComplementarMaxHoras`), prática extensionista
 * (total ÷ exigido pela matriz) e disciplinas personalizadas de pós (só quando o curso tem).
 * Totais sempre com denominador. Formulários com RHF + Zod; o servidor revalida e responde 422 com
 * a mensagem pronta.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Denominator } from "@/components/core/denominator";
import { CONTROL, Field } from "@/components/core/field";
import { Button } from "@/components/ui/button";
import { REGRAS_ANALISE } from "@/features/casos";
import { horas, int } from "@/lib/format";
import { collapseVariants, press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useInserirAtividade, useInserirPratica, useRemoverAtividade } from "@/features/analise/api/analise.mutations";
import { OrigemLinha } from "@/features/analise/components/origem";
import { ATIVIDADES_COMPLEMENTARES, type Analise, type ItemOrigem } from "@/features/analise/types/analise.schema";

function Secao({
   titulo,
   children,
   abertoInicial = false,
   id,
}: {
   titulo: ReactNode;
   children: ReactNode;
   abertoInicial?: boolean;
   id: string;
}) {
   const [aberto, setAberto] = useState(abertoInicial);
   return (
      <section className="overflow-hidden rounded-xl bg-card print:hidden">
         <motion.button
            type="button"
            whileTap={press}
            aria-expanded={aberto}
            aria-controls={id}
            onClick={() => setAberto(v => !v)}
            className="flex w-full items-center gap-2 px-4 py-3 text-left transition-colors hover:bg-surface-hover"
         >
            <ChevronDown aria-hidden className={cn("size-3.5 text-ink-4 transition-transform duration-150", !aberto && "-rotate-90")} />
            <span className="text-[13px] font-semibold text-ink">{titulo}</span>
         </motion.button>
         <AnimatePresence initial={false}>
            {aberto ? (
               <motion.div
                  key="corpo"
                  id={id}
                  variants={collapseVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="overflow-hidden"
               >
                  <div className="border-t border-hairline px-4 py-3">{children}</div>
               </motion.div>
            ) : null}
         </AnimatePresence>
      </section>
   );
}

const MAX = REGRAS_ANALISE.atividadeComplementarMaxHoras;

const AtividadeFormSchema = z.object({
   atividadeId: z.string().min(1, "Escolha a atividade"),
   ch: z.coerce
      .number<string>({ error: "Informe a carga horária" })
      .positive("Informe a carga horária")
      .max(MAX, `Cada atividade vale no máximo ${MAX} h`),
   ano: z.string().regex(/^(\d{4})?$/, "Ano com 4 dígitos"),
});
type AtividadeForm = z.input<typeof AtividadeFormSchema>;

function FormAtividade({ casoId }: { casoId: string }) {
   const inserir = useInserirAtividade(casoId);
   const form = useForm<AtividadeForm, unknown, z.output<typeof AtividadeFormSchema>>({
      resolver: zodResolver(AtividadeFormSchema),
      defaultValues: { atividadeId: "", ch: "", ano: "" },
   });
   const erros = form.formState.errors;
   const enviar = form.handleSubmit(v =>
      inserir.mutate({ atividadeId: v.atividadeId, ch: v.ch, ano: v.ano ? Number(v.ano) : undefined }, { onSuccess: () => form.reset() }),
   );
   return (
      <form onSubmit={enviar} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_110px_auto] sm:items-end" noValidate>
         <Field label="Atividade" error={erros.atividadeId?.message}>
            {p => (
               <select {...p} {...form.register("atividadeId")} className={cn(CONTROL, "h-9")}>
                  <option value="">Escolha</option>
                  {ATIVIDADES_COMPLEMENTARES.map(a => (
                     <option key={a.id} value={a.id}>
                        {a.nome}
                     </option>
                  ))}
               </select>
            )}
         </Field>
         <Field label="Horas" hint={`até ${MAX} h`} error={erros.ch?.message}>
            {p => <input {...p} {...form.register("ch")} inputMode="numeric" className={cn(CONTROL, "h-9 font-mono")} />}
         </Field>
         <Field label="Ano" hint="opcional" error={erros.ano?.message}>
            {p => <input {...p} {...form.register("ano")} inputMode="numeric" className={cn(CONTROL, "h-9 font-mono")} />}
         </Field>
         <Button type="submit" size="md" icon={<Plus />} disabled={inserir.isPending}>
            Inserir
         </Button>
      </form>
   );
}

const PraticaFormSchema = z.object({
   ch: z.coerce.number<string>({ error: "Informe as horas" }).positive("Informe as horas"),
   descricao: z.string().max(200, "Até 200 caracteres"),
});
type PraticaForm = z.input<typeof PraticaFormSchema>;

function FormPratica({ casoId }: { casoId: string }) {
   const inserir = useInserirPratica(casoId);
   const form = useForm<PraticaForm, unknown, z.output<typeof PraticaFormSchema>>({
      resolver: zodResolver(PraticaFormSchema),
      defaultValues: { ch: "", descricao: "" },
   });
   const erros = form.formState.errors;
   const enviar = form.handleSubmit(v =>
      inserir.mutate({ ch: v.ch, descricao: v.descricao || undefined }, { onSuccess: () => form.reset() }),
   );
   return (
      <form onSubmit={enviar} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_110px_auto] sm:items-end" noValidate>
         <Field label="Descrição" hint="opcional" error={erros.descricao?.message}>
            {p => <input {...p} {...form.register("descricao")} className={cn(CONTROL, "h-9")} />}
         </Field>
         <Field label="Horas" error={erros.ch?.message}>
            {p => <input {...p} {...form.register("ch")} inputMode="numeric" className={cn(CONTROL, "h-9 font-mono")} />}
         </Field>
         <Button type="submit" size="md" icon={<Plus />} disabled={inserir.isPending}>
            Inserir
         </Button>
      </form>
   );
}

interface SecoesProps {
   casoId: string;
   analise: Analise;
   naoAproveitadas: ItemOrigem[];
   podeEditar: boolean;
}

export function SecoesComplementares({ casoId, analise, naoAproveitadas, podeEditar }: SecoesProps) {
   const remover = useRemoverAtividade(casoId);
   const ac = analise.resumo.atividadesComplementares;
   const pe = analise.resumo.praticaExtensionista;

   return (
      <div className="space-y-3">
         <Secao id={`${casoId}-nao-aproveitadas`} titulo={`Disciplinas da origem não aproveitadas (${int(naoAproveitadas.length)})`}>
            {naoAproveitadas.length === 0 ? (
               <p className="text-[12px] text-ink-3">Todas as disciplinas da origem sustentam alguma dispensa.</p>
            ) : (
               <ul className="divide-y divide-hairline">
                  {naoAproveitadas.map(o => (
                     <li key={o.id} className="py-1.5">
                        <OrigemLinha origem={o} />
                     </li>
                  ))}
               </ul>
            )}
         </Secao>

         <Secao
            id={`${casoId}-atividades`}
            titulo={
               <>
                  Atividades complementares ·{" "}
                  <Denominator numerator={ac.horas} denominator={ac.exigidas} format={horas} className="text-[13px]" />
               </>
            }
         >
            {analise.atividadesComplementares.length === 0 ? (
               <p className="text-[12px] text-ink-3">Nenhuma atividade complementar registrada.</p>
            ) : (
               <ul className="divide-y divide-hairline">
                  {analise.atividadesComplementares.map(a => {
                     const acima = a.ch > MAX;
                     return (
                        <li key={a.id} className="flex items-center justify-between gap-3 py-1.5">
                           <span className="min-w-0 text-[12.5px] text-ink-2">
                              {a.atividade}
                              {a.ano ? <span className="font-mono text-ink-3"> · {a.ano}</span> : null}
                           </span>
                           <span className="flex items-center gap-2">
                              <span className={cn("font-mono text-[12px]", acima ? "font-semibold text-crit-ink" : "text-ink-2")}>
                                 {horas(a.ch)}
                              </span>
                              {acima ? <span className="text-[11.5px] text-crit-ink">acima do limite de {horas(MAX)}</span> : null}
                              {podeEditar ? (
                                 <Button
                                    variant="ghost"
                                    size="xs"
                                    square
                                    icon={<Trash2 />}
                                    aria-label={`Remover ${a.atividade}`}
                                    disabled={remover.isPending}
                                    onClick={() => remover.mutate(a.id)}
                                 />
                              ) : null}
                           </span>
                        </li>
                     );
                  })}
               </ul>
            )}
            {podeEditar ? <FormAtividade casoId={casoId} /> : null}
         </Secao>

         <Secao
            id={`${casoId}-pratica`}
            titulo={
               <>
                  Prática extensionista ·{" "}
                  <Denominator numerator={pe.horas} denominator={pe.exigidas} format={horas} className="text-[13px]" />
               </>
            }
         >
            {analise.praticaExtensionista.length === 0 ? (
               <p className="text-[12px] text-ink-3">Nenhuma prática extensionista registrada.</p>
            ) : (
               <ul className="divide-y divide-hairline">
                  {analise.praticaExtensionista.map(p => (
                     <li key={p.id} className="flex items-center justify-between gap-3 py-1.5 text-[12.5px] text-ink-2">
                        <span>{p.descricao ?? "Sem descrição"}</span>
                        <span className="font-mono text-[12px]">{horas(p.ch)}</span>
                     </li>
                  ))}
               </ul>
            )}
            {podeEditar ? <FormPratica casoId={casoId} /> : null}
         </Secao>

         {analise.disciplinasPersonalizadasPos.length > 0 ? (
            <Secao id={`${casoId}-pos`} titulo={`Disciplinas personalizadas (pós) (${int(analise.disciplinasPersonalizadasPos.length)})`}>
               <ul className="divide-y divide-hairline">
                  {analise.disciplinasPersonalizadasPos.map(d => (
                     <li key={d.id} className="py-1.5 text-[12.5px] text-ink-2">
                        {d.nome}
                     </li>
                  ))}
               </ul>
            </Secao>
         ) : null}
      </div>
   );
}
