/**
 * Efetivar matrícula (docs/03 EFETIVAR_MATRICULA). A guarda é "aceite registrado (canal + data)":
 * o aceite é registrado AQUI e vai junto na transição. A data não pode ser futura (é o registro de
 * algo que já aconteceu) e vem preenchida com agora, o caso mais comum (aceite no balcão ou ao
 * telefone). A integração com o ERP é do backend: a tela só pede e mostra o resultado.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";

import { CONTROL, Field } from "@/components/core/field";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import { notificar } from "@/lib/notify";

import { CanalAceiteSchema, ROTULO_CANAL_ACEITE, useTransicao, type CasoDetalhe } from "@/features/casos";

import { propostaKeys } from "@/features/proposta/api/proposta.queries";
import { deInputLocal, paraInputLocal, type BotaoProposta } from "@/features/proposta/domain/proposta";
import { aceiteFormSchema, type AceiteForm, type AceiteFormEntrada } from "@/features/proposta/types/proposta.schema";

interface EfetivarMatriculaModalProps {
   caso: CasoDetalhe;
   botao: BotaoProposta | null;
   open: boolean;
   onClose: () => void;
}

const OPCOES = CanalAceiteSchema.options.map(v => ({ value: v, label: ROTULO_CANAL_ACEITE[v] }));
const FORM_ID = "form-efetivar-matricula";

export function EfetivarMatriculaModal({ caso, botao, open, onClose }: EfetivarMatriculaModalProps) {
   const queryClient = useQueryClient();
   const transicao = useTransicao(caso);
   const schema = useMemo(() => aceiteFormSchema(), []);
   const form = useForm<AceiteFormEntrada, unknown, AceiteForm>({
      resolver: zodResolver(schema),
      defaultValues: { canal: null, em: paraInputLocal(new Date()) },
   });

   // O modal fica montado com a aba: ao abrir, recomeça com "agora".
   useEffect(() => {
      if (open) form.reset({ canal: null, em: paraInputLocal(new Date()) });
   }, [open, form]);

   const enviar = form.handleSubmit(v => {
      const canal = v.canal;
      transicao.mutate(
         { acao: "EFETIVAR_MATRICULA", aceite: { canal, em: deInputLocal(v.em) } },
         {
            onSuccess: () => {
               void queryClient.invalidateQueries({ queryKey: propostaKeys.detalhe(caso.id) });
               notificar({ titulo: "Matrícula efetivada", detalhe: `${caso.candidato.nome} · ${caso.destino.cursoNome}` });
               onClose();
            },
         },
      );
   });

   return (
      <Modal
         open={open}
         onOpenChange={v => (v ? null : onClose())}
         title="Efetivar matrícula"
         description="Registre como e quando o candidato aceitou a proposta."
         icon={GraduationCap}
         size="sm"
         footer={
            <>
               {botao && !botao.habilitada && botao.motivo ? <p className="mr-auto text-[11.5px] text-ink-3">{botao.motivo}</p> : null}
               <Button variant="ghost" onClick={onClose}>
                  Cancelar
               </Button>
               <Button variant="primary" type="submit" form={FORM_ID} disabled={!botao?.habilitada || transicao.isPending}>
                  {transicao.isPending ? "Efetivando…" : "Efetivar matrícula"}
               </Button>
            </>
         }
      >
         <form id={FORM_ID} onSubmit={enviar} className="space-y-4 p-5" noValidate>
            <Field label="Canal do aceite" required error={form.formState.errors.canal?.message}>
               {() => (
                  <Controller
                     control={form.control}
                     name="canal"
                     render={({ field }) => (
                        <SegmentedControl
                           options={OPCOES}
                           value={field.value}
                           onChange={field.onChange}
                           layoutId={`aceite-canal-${caso.id}`}
                           ariaLabel="Canal do aceite"
                           full
                        />
                     )}
                  />
               )}
            </Field>
            <Field label="Data e hora do aceite" required error={form.formState.errors.em?.message} help="Não pode ser no futuro.">
               {props => (
                  <input
                     {...props}
                     type="datetime-local"
                     max={paraInputLocal(new Date())}
                     className={`${CONTROL} h-9`}
                     {...form.register("em")}
                  />
               )}
            </Field>
            <Notice tone="info">
               A matrícula no sistema acadêmico (ERP) é feita pelo backend ao confirmar. O candidato recebe a confirmação com o RA pelo
               WhatsApp.
            </Notice>
         </form>
      </Modal>
   );
}
