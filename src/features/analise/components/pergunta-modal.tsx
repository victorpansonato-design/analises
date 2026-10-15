/**
 * Pergunta à coordenação POR ITEM (docs/06 §4): texto curto obrigatório + a decisão que a analista
 * sugere. O item fica em "Pergunta aberta" e só vai para a coordenação quando ela clicar em
 * "Enviar para coordenação" (uma notificação só, para várias perguntas).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageCircleQuestion } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { Field } from "@/components/core/field";
import { Modal } from "@/components/core/overlay";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DecisaoItemSchema } from "@/features/casos";
import { horas } from "@/lib/format";

import { OPCOES_DECISAO } from "@/features/analise/domain/analise.domain";
import type { ItemAnalise, PerguntaEntrada } from "@/features/analise/types/analise.schema";

const PerguntaFormSchema = z.object({
   texto: z.string().trim().min(5, "Escreva a pergunta com pelo menos 5 caracteres").max(600, "A pergunta pode ter até 600 caracteres"),
   decisaoSugerida: DecisaoItemSchema,
});

interface PerguntaModalProps {
   item: ItemAnalise | null;
   salvando: boolean;
   onFechar: () => void;
   onEnviar: (item: ItemAnalise, entrada: PerguntaEntrada) => void;
}

export function PerguntaModal({ item, salvando, onFechar, onEnviar }: PerguntaModalProps) {
   const form = useForm<PerguntaEntrada>({
      resolver: zodResolver(PerguntaFormSchema),
      defaultValues: { texto: "", decisaoSugerida: "DISPENSA" },
   });

   useEffect(() => {
      if (item) {
         form.reset({
            texto: item.pergunta?.texto ?? "",
            decisaoSugerida: item.pergunta?.decisaoSugerida ?? item.decisao?.valor ?? item.sugestao?.decisao ?? "DISPENSA",
         });
      }
   }, [item, form]);

   const texto = useWatch({ control: form.control, name: "texto" }) ?? "";
   const enviar = form.handleSubmit(v => item && onEnviar(item, v));

   return (
      <Modal
         open={!!item}
         onOpenChange={aberto => !aberto && onFechar()}
         icon={MessageCircleQuestion}
         title="Perguntar à coordenação"
         description={item ? `${item.disciplina} · ${horas(item.ch)}` : undefined}
         footer={
            <>
               <Button variant="ghost" onClick={onFechar}>
                  Cancelar
               </Button>
               <Button variant="primary" onClick={() => void enviar()} disabled={salvando}>
                  {item?.pergunta ? "Salvar pergunta" : "Registrar pergunta"}
               </Button>
            </>
         }
      >
         <form onSubmit={enviar} className="space-y-4 px-5 py-4" noValidate>
            <Field
               label="Pergunta"
               required
               hint={`${texto.trim().length} de 600`}
               help="Seja direta: o que precisa ser decidido e por quê."
               error={form.formState.errors.texto?.message}
            >
               {p => (
                  <Textarea
                     {...p}
                     {...form.register("texto")}
                     data-autofocus
                     rows={4}
                     placeholder="Ex.: a ementa cobre só parte do conteúdo. Dispensa ou adaptação?"
                  />
               )}
            </Field>
            <Field label="Decisão que você sugere" required>
               {() => (
                  <Controller
                     control={form.control}
                     name="decisaoSugerida"
                     render={({ field }) => (
                        <SegmentedControl
                           options={OPCOES_DECISAO}
                           value={field.value}
                           onChange={field.onChange}
                           layoutId="pergunta-decisao"
                           ariaLabel="Decisão sugerida"
                        />
                     )}
                  />
               )}
            </Field>
            <p className="text-[12px] text-ink-3">
               A pergunta fica aberta neste item. Envie todas juntas pelo botão "Enviar para coordenação".
            </p>
         </form>
      </Modal>
   );
}
