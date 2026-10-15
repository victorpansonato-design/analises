/**
 * Registrar resposta (docs/03 REGISTRAR_RESPOSTA): quando o candidato responde fora do bot (ligação,
 * balcão), a matrícula registra o tipo e uma observação. O caso vai para "Em conversa" e a régua
 * automática para. "Sem interesse" SUGERE encerrar como perdido, sem forçar: às vezes o candidato
 * só precisa de outra condição.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { MessageSquareReply } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { Field } from "@/components/core/field";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notificar } from "@/lib/notify";

import { useTransicao, type CasoDetalhe } from "@/features/casos";

import { propostaKeys } from "@/features/proposta/api/proposta.queries";
import type { BotaoProposta } from "@/features/proposta/domain/proposta";
import {
   ROTULO_TIPO_RESPOSTA,
   RespostaFormSchema,
   TipoRespostaSchema,
   type RespostaForm,
   type RespostaFormEntrada,
} from "@/features/proposta/types/proposta.schema";

interface RegistrarRespostaModalProps {
   caso: CasoDetalhe;
   botao: BotaoProposta | null;
   open: boolean;
   onClose: () => void;
}

const OPCOES = TipoRespostaSchema.options.map(v => ({ value: v, label: ROTULO_TIPO_RESPOSTA[v] }));
const FORM_ID = "form-registrar-resposta";

export function RegistrarRespostaModal({ caso, botao, open, onClose }: RegistrarRespostaModalProps) {
   const queryClient = useQueryClient();
   const transicao = useTransicao(caso);
   const form = useForm<RespostaFormEntrada, unknown, RespostaForm>({
      resolver: zodResolver(RespostaFormSchema),
      defaultValues: { tipo: null, texto: "" },
   });
   const tipo = useWatch({ control: form.control, name: "tipo" });

   useEffect(() => {
      if (open) form.reset({ tipo: null, texto: "" });
   }, [open, form]);

   const enviar = form.handleSubmit(v => {
      const t = v.tipo;
      transicao.mutate(
         { acao: "REGISTRAR_RESPOSTA", motivo: t, texto: v.texto || undefined },
         {
            onSuccess: () => {
               void queryClient.invalidateQueries({ queryKey: propostaKeys.detalhe(caso.id) });
               notificar({ titulo: "Resposta registrada", detalhe: `${ROTULO_TIPO_RESPOSTA[t]} · a régua automática parou` });
               onClose();
            },
         },
      );
   });

   return (
      <Modal
         open={open}
         onOpenChange={v => (v ? null : onClose())}
         title="Registrar resposta do candidato"
         description="Use quando a resposta chegou por outro canal. Respostas pelo WhatsApp entram sozinhas."
         icon={MessageSquareReply}
         size="sm"
         footer={
            <>
               {botao && !botao.habilitada && botao.motivo ? <p className="mr-auto text-[11.5px] text-ink-3">{botao.motivo}</p> : null}
               <Button variant="ghost" onClick={onClose}>
                  Cancelar
               </Button>
               <Button variant="primary" type="submit" form={FORM_ID} disabled={!botao?.habilitada || transicao.isPending}>
                  {transicao.isPending ? "Registrando…" : "Registrar resposta"}
               </Button>
            </>
         }
      >
         <form id={FORM_ID} onSubmit={enviar} className="space-y-4 p-5" noValidate>
            <Field label="O que o candidato respondeu" required error={form.formState.errors.tipo?.message}>
               {() => (
                  <Controller
                     control={form.control}
                     name="tipo"
                     render={({ field }) => (
                        <SegmentedControl
                           options={OPCOES}
                           value={field.value}
                           onChange={field.onChange}
                           layoutId={`resposta-tipo-${caso.id}`}
                           ariaLabel="Resposta do candidato"
                           full
                        />
                     )}
                  />
               )}
            </Field>
            {tipo === "SEM_INTERESSE" ? (
               <Notice tone="warn" title="Quer encerrar o caso?">
                  Se o candidato confirmou que não vai seguir, registre a resposta e depois use Mais ações › Encerrar como perdido, com o
                  motivo. Se ainda há conversa, deixe aberto.
               </Notice>
            ) : null}
            <Field
               label="Observação"
               hint="opcional"
               error={form.formState.errors.texto?.message}
               help="Fica na linha do tempo do caso. Não vai para o candidato."
            >
               {props => (
                  <Textarea {...props} {...form.register("texto")} rows={3} placeholder="Ex.: quer saber se dá para estudar à noite" />
               )}
            </Field>
         </form>
      </Modal>
   );
}
