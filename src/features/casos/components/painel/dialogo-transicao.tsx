/**
 * Confirmação de transição. Encerrar, cancelar, adiar, reanálise e reabrir pedem motivo (lista
 * fechada + texto; docs/03 §4). Toda transição diz o que vai acontecer ANTES de confirmar. Ação
 * destrutiva usa o botão `danger`.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CONTROL, Field } from "@/components/core/field";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { useTransicao } from "@/features/casos/api/casos.mutations";
import { useCursos, useMatrizes } from "@/features/casos/api/casos.queries";
import { CONFIG_TRANSICAO, type ConfigTransicao } from "@/features/casos/components/painel/config-transicao";
import {
   ROTULO_MODALIDADE,
   ROTULO_TURNO,
   type AcaoTransicao,
   type CasoDetalhe,
   type Modalidade,
   type Turno,
} from "@/features/casos/types/caso.schema";

function amanha(): string {
   const d = new Date(Date.now() + 86_400_000);
   return d.toISOString().slice(0, 10);
}

interface DialogoTransicaoProps {
   caso: CasoDetalhe;
   acao: AcaoTransicao | null;
   onClose: () => void;
}

export function DialogoTransicao({ caso, acao, onClose }: DialogoTransicaoProps) {
   const config = acao ? CONFIG_TRANSICAO[acao] : undefined;
   return config && acao ? <Conteudo key={acao} caso={caso} acao={acao} config={config} onClose={onClose} /> : null;
}

function Conteudo({
   caso,
   acao,
   config,
   onClose,
}: {
   caso: CasoDetalhe;
   acao: AcaoTransicao;
   config: ConfigTransicao;
   onClose: () => void;
}) {
   const transicao = useTransicao(caso);
   const { data: cursos } = useCursos();

   const schema = useMemo(
      () =>
         z
            .object({
               motivo: z.string(),
               texto: z.string().max(1000, "Até 1.000 caracteres"),
               retomarEm: z.string(),
               cursoId: z.string(),
               turno: z.string(),
               modalidade: z.string(),
            })
            .superRefine((v, ctx) => {
               if (config.motivos && !v.motivo) ctx.addIssue({ code: "custom", path: ["motivo"], message: "Escolha o motivo" });
               const precisaTexto = config.texto === "obrigatorio" || (config.texto === "se-outro" && v.motivo === "OUTRO");
               if (precisaTexto && v.texto.trim().length < 3)
                  ctx.addIssue({ code: "custom", path: ["texto"], message: "Conte em poucas palavras o que aconteceu" });
               if (config.data && (!v.retomarEm || v.retomarEm < amanha()))
                  ctx.addIssue({ code: "custom", path: ["retomarEm"], message: "Escolha uma data a partir de amanhã" });
               if (config.destino) {
                  if (!v.cursoId) ctx.addIssue({ code: "custom", path: ["cursoId"], message: "Escolha o curso" });
                  if (!v.turno) ctx.addIssue({ code: "custom", path: ["turno"], message: "Escolha o turno" });
                  if (!v.modalidade) ctx.addIssue({ code: "custom", path: ["modalidade"], message: "Escolha a modalidade" });
                  if (v.cursoId === caso.destino.cursoId && v.turno === caso.destino.turno && v.modalidade === caso.destino.modalidade) {
                     ctx.addIssue({ code: "custom", path: ["cursoId"], message: "O destino escolhido é o mesmo de hoje" });
                  }
               }
            }),
      [caso.destino, config],
   );
   type Form = z.infer<typeof schema>;

   const form = useForm<Form>({
      resolver: zodResolver(schema),
      defaultValues: {
         motivo: "",
         texto: "",
         retomarEm: "",
         cursoId: caso.destino.cursoId,
         turno: caso.destino.turno,
         modalidade: caso.destino.modalidade,
      },
   });
   const cursoId = useWatch({ control: form.control, name: "cursoId" });
   const motivo = useWatch({ control: form.control, name: "motivo" });
   const curso = cursos?.find(c => c.id === cursoId);
   const { data: matrizes } = useMatrizes(config.destino ? cursoId : null);

   useEffect(() => {
      if (!curso) return;
      const atual = form.getValues();
      if (!curso.turnos.includes(atual.turno as Turno)) form.setValue("turno", curso.turnos[0] ?? "");
      if (!curso.modalidades.includes(atual.modalidade as Modalidade)) form.setValue("modalidade", curso.modalidades[0] ?? "");
   }, [curso, form]);

   const enviar = form.handleSubmit(v => {
      const matriz = matrizes?.find(m => m.vigente) ?? null;
      transicao.mutate(
         {
            acao,
            motivo: config.motivos ? v.motivo : config.motivoFixo,
            texto: v.texto.trim() || undefined,
            retomarEm: config.data ? new Date(`${v.retomarEm}T09:00:00-03:00`).toISOString() : undefined,
            novoDestino:
               config.destino && curso
                  ? {
                       cursoId: curso.id,
                       cursoNome: curso.nome,
                       turno: v.turno as Turno,
                       modalidade: v.modalidade as Modalidade,
                       matrizId: matriz?.id ?? null,
                       ciclo: caso.destino.ciclo,
                    }
                  : undefined,
         },
         {
            onSuccess: () => {
               notificar({ titulo: config.sucesso, detalhe: caso.candidato.nome });
               onClose();
            },
         },
      );
   });

   const erros = form.formState.errors;
   const precisaTexto = config.texto === "obrigatorio" || (config.texto === "se-outro" && motivo === "OUTRO");

   return (
      <Modal
         open
         onOpenChange={aberto => !aberto && onClose()}
         title={config.titulo}
         description={config.descricao}
         size="md"
         footer={
            <>
               <Button variant="ghost" onClick={onClose}>
                  Voltar
               </Button>
               <Button variant={config.perigo ? "danger" : "primary"} onClick={() => void enviar()} disabled={transicao.isPending}>
                  {transicao.isPending ? "Enviando…" : config.confirmar}
               </Button>
            </>
         }
      >
         <form
            className="space-y-4 px-5 py-4"
            onSubmit={e => {
               e.preventDefault();
               void enviar();
            }}
         >
            {config.motivos ? (
               <fieldset>
                  <legend className="mb-1.5 text-[12px] font-medium text-ink">
                     Motivo <span className="text-crit">*</span>
                  </legend>
                  <div className="grid gap-1.5 sm:grid-cols-2" role="radiogroup" aria-label="Motivo">
                     {Object.entries(config.motivos).map(([valor, rotulo], i) => (
                        <label
                           key={valor}
                           className={cn(
                              "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors",
                              motivo === valor ? "bg-surface-3 font-medium text-ink" : "bg-surface-2 text-ink-2 hover:bg-surface-3",
                           )}
                        >
                           <input
                              type="radio"
                              value={valor}
                              {...form.register("motivo")}
                              data-autofocus={i === 0 ? true : undefined}
                              className="accent-(--brand)"
                           />
                           {rotulo}
                        </label>
                     ))}
                  </div>
                  {erros.motivo ? <p className="mt-1.5 text-[11.5px] font-medium text-crit-ink">{erros.motivo.message}</p> : null}
               </fieldset>
            ) : null}

            {config.data ? (
               <Field
                  label="Retomar em"
                  required
                  error={erros.retomarEm?.message}
                  help="Às 9h desse dia o caso volta para a fila de quem estava com ele."
               >
                  {p => <input type="date" min={amanha()} {...p} {...form.register("retomarEm")} className={cn(CONTROL, "h-9")} />}
               </Field>
            ) : null}

            {config.destino ? (
               <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Curso" required error={erros.cursoId?.message} className="sm:col-span-3">
                     {p => (
                        <select {...p} {...form.register("cursoId")} className={cn(CONTROL, "h-9")}>
                           {(cursos ?? []).map(c => (
                              <option key={c.id} value={c.id}>
                                 {c.nome}
                              </option>
                           ))}
                        </select>
                     )}
                  </Field>
                  <Field label="Turno" required error={erros.turno?.message}>
                     {p => (
                        <select {...p} {...form.register("turno")} className={cn(CONTROL, "h-9")}>
                           {(curso?.turnos ?? []).map(t => (
                              <option key={t} value={t}>
                                 {ROTULO_TURNO[t]}
                              </option>
                           ))}
                        </select>
                     )}
                  </Field>
                  <Field label="Modalidade" required error={erros.modalidade?.message}>
                     {p => (
                        <select {...p} {...form.register("modalidade")} className={cn(CONTROL, "h-9")}>
                           {(curso?.modalidades ?? []).map(m => (
                              <option key={m} value={m}>
                                 {ROTULO_MODALIDADE[m]}
                              </option>
                           ))}
                        </select>
                     )}
                  </Field>
                  <div className="self-end pb-2 text-[11.5px] text-ink-4">
                     Matriz vigente {matrizes?.find(m => m.vigente)?.codigo ?? "…"}
                  </div>
               </div>
            ) : null}

            {config.texto ? (
               <Field
                  label={config.textoRotulo ?? (precisaTexto ? "Conte o que aconteceu" : "Observação")}
                  required={precisaTexto}
                  hint={precisaTexto ? undefined : "opcional"}
                  error={erros.texto?.message}
               >
                  {p => <Textarea rows={3} {...p} {...form.register("texto")} data-autofocus={!config.motivos ? true : undefined} />}
               </Field>
            ) : null}

            {config.aviso ? <Notice tone="info">{config.aviso}</Notice> : null}
         </form>
      </Modal>
   );
}
