/**
 * Recusa de documento (docs/05 §3.4 e docs/08 §2). Motivo em lista fechada (docs/15 §4) e dica
 * opcional. Recusar DISPARA a mensagem ao candidato automaticamente: por isso o modal mostra a prévia
 * exata antes de confirmar, e avisa quando o candidato não autorizou o WhatsApp (a mensagem não sai).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { MessageSquareWarning } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { CONTROL, Field } from "@/components/core/field";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import type { CasoDetalhe } from "@/features/casos";
import { BolhaWhatsapp } from "@/features/comunicacao";

import { motivoRecusaInvalido, TEXTO_RECUSA_MAX, textoRecusa } from "@/features/documentos/domain/recusa";
import {
   MotivoRecusaSchema,
   ROTULO_MOTIVO_RECUSA,
   type ItemChecklist,
   type MotivoRecusa,
} from "@/features/documentos/types/documento.schema";

const RecusaSchema = z.object({ motivo: MotivoRecusaSchema.or(z.literal("")), texto: z.string() }).superRefine((v, ctx) => {
   const erro = motivoRecusaInvalido(v.motivo || null, v.texto);
   if (erro) ctx.addIssue({ code: "custom", path: [v.motivo ? "texto" : "motivo"], message: erro });
});
type RecusaForm = z.infer<typeof RecusaSchema>;

interface ModalRecusaProps {
   caso: CasoDetalhe;
   item: ItemChecklist | null;
   enviando: boolean;
   onOpenChange: (aberto: boolean) => void;
   onConfirmar: (motivo: MotivoRecusa, texto: string) => void;
}

export function ModalRecusa({ caso, item, enviando, onOpenChange, onConfirmar }: ModalRecusaProps) {
   return (
      <Modal
         open={!!item}
         onOpenChange={onOpenChange}
         icon={MessageSquareWarning}
         title="Recusar documento"
         description={item ? `${item.nome}. O candidato recebe a mensagem automaticamente pelo WhatsApp e pode reenviar.` : undefined}
      >
         {item ? (
            <Formulario
               key={item.id}
               caso={caso}
               item={item}
               enviando={enviando}
               onCancelar={() => onOpenChange(false)}
               onConfirmar={onConfirmar}
            />
         ) : null}
      </Modal>
   );
}

function Formulario({
   caso,
   item,
   enviando,
   onCancelar,
   onConfirmar,
}: {
   caso: CasoDetalhe;
   item: ItemChecklist;
   enviando: boolean;
   onCancelar: () => void;
   onConfirmar: (motivo: MotivoRecusa, texto: string) => void;
}) {
   const form = useForm<RecusaForm>({ resolver: zodResolver(RecusaSchema), defaultValues: { motivo: "", texto: "" } });
   const motivo = useWatch({ control: form.control, name: "motivo" });
   const texto = useWatch({ control: form.control, name: "texto" });
   const erros = form.formState.errors;
   const arquivo = item.arquivos[item.arquivos.length - 1]?.nome ?? item.nome;
   const previa = motivo ? textoRecusa({ nome: caso.candidato.nome.split(" ")[0], arquivo, documento: item.nome, motivo, texto }) : null;

   const enviar = form.handleSubmit(v => {
      if (v.motivo) onConfirmar(v.motivo, v.texto.trim());
   });

   return (
      <form onSubmit={e => void enviar(e)} noValidate>
         <div className="space-y-4 p-5">
            <Field label="Motivo" required error={erros.motivo?.message}>
               {props => (
                  <select {...props} {...form.register("motivo")} className={`${CONTROL} h-9`} data-autofocus>
                     <option value="" disabled>
                        Escolha o motivo
                     </option>
                     {MotivoRecusaSchema.options.map(m => (
                        <option key={m} value={m}>
                           {ROTULO_MOTIVO_RECUSA[m]}
                        </option>
                     ))}
                  </select>
               )}
            </Field>
            <Field
               label="Dica para o candidato"
               required={motivo === "OUTRO"}
               hint={motivo === "OUTRO" ? undefined : "opcional"}
               help={`Substitui a dica padrão da mensagem. Até ${TEXTO_RECUSA_MAX} caracteres.`}
               error={erros.texto?.message}
            >
               {props => (
                  <Textarea
                     {...props}
                     {...form.register("texto")}
                     rows={2}
                     maxLength={TEXTO_RECUSA_MAX}
                     placeholder="Ex.: envie a página 2, com as notas do 3º semestre."
                  />
               )}
            </Field>

            <div>
               <p className="mb-2 text-[12px] font-medium text-ink-3">O candidato recebe pelo WhatsApp:</p>
               <div className="rounded-xl bg-workspace p-4">
                  {previa ? (
                     <BolhaWhatsapp texto={previa} />
                  ) : (
                     <p className="text-[12px] text-ink-3">Escolha o motivo para ver a mensagem.</p>
                  )}
               </div>
            </div>

            {!caso.candidato.optInWhatsapp ? (
               <Notice tone="warn" title="A mensagem não vai sair">
                  O candidato não autorizou contato pelo WhatsApp. A recusa fica registrada; combine o reenvio por outro canal.
               </Notice>
            ) : null}
         </div>
         <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
            <Button variant="ghost" onClick={onCancelar}>
               Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={enviando}>
               {enviando ? "Recusando…" : "Recusar e avisar o candidato"}
            </Button>
         </footer>
      </form>
   );
}
