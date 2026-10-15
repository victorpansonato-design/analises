/**
 * Reabrir análise (transição SOLICITAR_REANALISE, decisão de 15/10/2026). Depois da proposta (ou do
 * aproveitamento concluído) o aluno contesta dispensas: a análise volta para a equipe de análises ou
 * direto para a coordenação do curso, com as disciplinas contestadas marcadas.
 *
 * - Para a coordenação, marcar pelo menos uma disciplina é obrigatório: o coordenador recebe só elas,
 *   cada uma como pergunta com o texto da contestação.
 * - O texto do que o aluno contestou é obrigatório e fica na linha do tempo e em cada disciplina.
 * - O resumo enviado deixa de valer; a proposta (ou o aproveitamento) sai de novo depois da nova conclusão.
 * Formulário RHF + Zod; a transição vai com a versão do caso (If-Match) pelo `useTransicao`.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { GraduationCap, Search, UsersRound, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CONTROL, Field } from "@/components/core/field";
import { Modal } from "@/components/core/overlay";
import { Notice } from "@/components/core/notice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
   DESTINOS_REANALISE,
   ROTULO_DECISAO,
   ROTULO_DESTINO_REANALISE,
   ROTULO_MOTIVO_REANALISE,
   terminaNaAnalise,
   useTransicao,
   type CasoDetalhe,
   type DestinoReanalise,
} from "@/features/casos";
import { plural, searchKey } from "@/lib/format";
import { notificar } from "@/lib/notify";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { tituloPeriodo } from "@/features/analise/domain/analise.domain";
import { itemDecidido, type ItemAnalise } from "@/features/analise/types/analise.schema";

const EXPLICACAO: Record<DestinoReanalise, { icone: LucideIcon; texto: string }> = {
   ANALISE: { icone: UsersRound, texto: "A analista revê as disciplinas marcadas e conclui a análise de novo." },
   COORDENACAO: {
      icone: GraduationCap,
      texto: "O coordenador dá o parecer técnico nas disciplinas marcadas e devolve para a equipe de análises conferir.",
   },
};

const ReabrirSchema = z
   .object({
      destino: z.enum(DESTINOS_REANALISE),
      motivo: z.string().min(1, "Escolha o motivo"),
      texto: z.string().trim().min(10, "Conte em uma frase o que o aluno contestou"),
      itemIds: z.array(z.string()),
   })
   .superRefine((v, ctx) => {
      if (v.destino === "COORDENACAO" && v.itemIds.length === 0)
         ctx.addIssue({ code: "custom", path: ["itemIds"], message: "Marque as disciplinas contestadas: a coordenação recebe só elas" });
   });
type ReabrirForm = z.infer<typeof ReabrirSchema>;

interface ReabrirAnaliseModalProps {
   caso: CasoDetalhe;
   itens: readonly ItemAnalise[];
   aberto: boolean;
   onFechar: () => void;
}

export function ReabrirAnaliseModal({ caso, itens, aberto, onFechar }: ReabrirAnaliseModalProps) {
   const transicao = useTransicao(caso);
   const [busca, setBusca] = useState("");
   const form = useForm<ReabrirForm>({
      resolver: zodResolver(ReabrirSchema),
      defaultValues: { destino: "ANALISE", motivo: "CANDIDATO_CONTESTOU_DISCIPLINA", texto: "", itemIds: [] },
   });
   const destino = useWatch({ control: form.control, name: "destino" });
   const marcados = useWatch({ control: form.control, name: "itemIds" });
   const erros = form.formState.errors;
   // Contestação é sobre decisão tomada: dispensas primeiro, depois o resto decidido.
   const candidatas = useMemo(
      () =>
         itens
            .filter(itemDecidido)
            .filter(i => !busca || searchKey(`${i.disciplina} ${i.codigo ?? ""}`).includes(searchKey(busca)))
            .sort((a, b) => Number(b.decisao?.valor === "DISPENSA") - Number(a.decisao?.valor === "DISPENSA")),
      [itens, busca],
   );

   const enviar = form.handleSubmit(v =>
      transicao.mutate(
         { acao: "SOLICITAR_REANALISE", motivo: v.motivo, texto: v.texto.trim(), destinoReanalise: v.destino, itemIds: v.itemIds },
         {
            onSuccess: () => {
               notificar({
                  titulo:
                     v.destino === "COORDENACAO" ? "Análise reaberta para a coordenação" : "Análise reaberta para a equipe de análises",
                  detalhe: v.itemIds.length ? plural(v.itemIds.length, "disciplina contestada", "disciplinas contestadas") : undefined,
               });
               form.reset();
               onFechar();
            },
         },
      ),
   );

   const alternar = (id: string) =>
      form.setValue("itemIds", marcados.includes(id) ? marcados.filter(x => x !== id) : [...marcados, id], {
         shouldValidate: form.formState.isSubmitted,
      });

   return (
      <Modal
         open={aberto}
         onOpenChange={v => !v && onFechar()}
         title="Reabrir análise"
         description="O aluno contestou alguma decisão? Escolha para onde a análise volta e marque as disciplinas."
         size="lg"
         footer={
            <>
               <Button variant="ghost" onClick={onFechar}>
                  Voltar
               </Button>
               <Button variant="primary" type="submit" form="form-reabrir-analise" disabled={transicao.isPending}>
                  {transicao.isPending ? "Reabrindo" : "Reabrir análise"}
               </Button>
            </>
         }
      >
         <form id="form-reabrir-analise" onSubmit={enviar} className="space-y-5 px-5 py-4" noValidate>
            <Field label="Para onde a análise volta" required>
               {() => (
                  <Controller
                     control={form.control}
                     name="destino"
                     render={({ field }) => (
                        <div role="radiogroup" aria-label="Para onde a análise volta" className="grid grid-cols-2 gap-2.5">
                           {DESTINOS_REANALISE.map(d => {
                              const { icone: Icone, texto } = EXPLICACAO[d];
                              const ativo = field.value === d;
                              return (
                                 <motion.button
                                    key={d}
                                    type="button"
                                    role="radio"
                                    aria-checked={ativo}
                                    whileTap={press}
                                    onClick={() => field.onChange(d)}
                                    className={cn(
                                       "flex items-start gap-3 rounded-xl p-3.5 text-left transition-colors",
                                       ativo ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2 hover:bg-surface-3",
                                    )}
                                 >
                                    <span
                                       className={cn(
                                          "grid size-8 shrink-0 place-items-center rounded-lg",
                                          ativo ? "bg-brand text-on-brand" : "bg-card text-ink-3",
                                       )}
                                    >
                                       <Icone aria-hidden className="size-4" />
                                    </span>
                                    <span>
                                       <span className="block text-[13px] font-semibold text-ink">{ROTULO_DESTINO_REANALISE[d]}</span>
                                       <span className="mt-0.5 block text-[12px] leading-relaxed text-ink-3">{texto}</span>
                                    </span>
                                 </motion.button>
                              );
                           })}
                        </div>
                     )}
                  />
               )}
            </Field>

            <div className="grid grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-4">
               <Field label="Motivo" required error={erros.motivo?.message}>
                  {props => (
                     <select {...props} {...form.register("motivo")} className={cn(CONTROL, "h-9 cursor-pointer")}>
                        {Object.entries(ROTULO_MOTIVO_REANALISE).map(([valor, rotulo]) => (
                           <option key={valor} value={valor}>
                              {rotulo}
                           </option>
                        ))}
                     </select>
                  )}
               </Field>
               <Field label="O que o aluno contestou" required error={erros.texto?.message}>
                  {props => (
                     <Textarea
                        {...props}
                        {...form.register("texto")}
                        rows={2}
                        placeholder="Ex.: diz que cursou Cálculo I com 80 h e a ementa cobre limites e derivadas"
                     />
                  )}
               </Field>
            </div>

            <Field
               label="Disciplinas contestadas"
               required={destino === "COORDENACAO"}
               hint={marcados.length ? plural(marcados.length, "marcada", "marcadas") : destino === "ANALISE" ? "opcional" : undefined}
               error={erros.itemIds?.message}
            >
               {() => (
                  <div className="space-y-2">
                     <div className="relative">
                        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-4" />
                        <Input
                           value={busca}
                           onChange={e => setBusca(e.target.value)}
                           placeholder="Buscar disciplina ou código"
                           className="pl-8"
                        />
                     </div>
                     <ul className="scroll-slim max-h-[240px] divide-y divide-hairline overflow-y-auto rounded-lg bg-surface-2/60">
                        {candidatas.map(i => (
                           <li key={i.id}>
                              <label className="flex cursor-pointer items-center gap-3 px-3 py-2 transition-colors hover:bg-surface-3/60">
                                 <input
                                    type="checkbox"
                                    checked={marcados.includes(i.id)}
                                    onChange={() => alternar(i.id)}
                                    className="size-4 accent-brand"
                                 />
                                 <span className="min-w-0 flex-1">
                                    <span className="block truncate text-[12.5px] text-ink">{i.disciplina}</span>
                                    <span className="text-[11px] text-ink-4">
                                       {i.codigo ? <span className="font-mono">{i.codigo} · </span> : null}
                                       {tituloPeriodo(i.periodo)}
                                    </span>
                                 </span>
                                 <span className="text-[11.5px] font-medium text-ink-2">
                                    {i.decisao ? ROTULO_DECISAO[i.decisao.valor] : ""}
                                 </span>
                              </label>
                           </li>
                        ))}
                        {candidatas.length === 0 ? (
                           <li className="px-3 py-3 text-[12px] text-ink-3">Nenhuma disciplina decidida com esse nome.</li>
                        ) : null}
                     </ul>
                  </div>
               )}
            </Field>

            <Notice tone="info">
               {terminaNaAnalise(caso.tipo)
                  ? "O aproveitamento volta a ficar em andamento. Depois da nova conclusão, as dispensas são lançadas de novo."
                  : "O resumo enviado deixa de valer. Depois da nova conclusão, a proposta precisa ser enviada de novo ao aluno."}
            </Notice>
         </form>
      </Modal>
   );
}
