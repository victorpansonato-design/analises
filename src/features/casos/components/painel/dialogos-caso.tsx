/**
 * Diálogos das ações que não mudam a etapa: atribuir responsável, pendência externa (pausa o prazo
 * com motivo e data de revisão; docs/03 §5) e marcar ouvidoria ou escalar.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { EmptyPanel } from "@/components/core/empty-panel";
import { CONTROL, Field } from "@/components/core/field";
import { Initials } from "@/components/core/initials";
import { Modal } from "@/components/core/overlay";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { useAtribuir, useAtualizarFlags } from "@/features/casos/api/casos.mutations";
import { useUsuarios } from "@/features/casos/api/casos.queries";
import { PAPEL_DONO_DA_ETAPA } from "@/features/casos/domain/acoes";
import { ROTULO_PENDENCIA, TipoPendenciaSchema, type CasoDetalhe, type TipoPendencia } from "@/features/casos/types/caso.schema";

export function DialogoAtribuir({ caso, aberto, onClose }: { caso: CasoDetalhe; aberto: boolean; onClose: () => void }) {
   const papel = PAPEL_DONO_DA_ETAPA[caso.etapa];
   const { data: usuarios, isLoading } = useUsuarios(papel);
   const [escolhido, setEscolhido] = useState<string | null>(caso.responsavel?.id ?? null);
   const atribuir = useAtribuir(caso);

   return (
      <Modal
         open={aberto}
         onOpenChange={v => !v && onClose()}
         title="Atribuir responsável"
         description="A pessoa recebe o caso na vez dela e uma notificação."
         size="sm"
         footer={
            <>
               <Button variant="ghost" onClick={onClose}>
                  Voltar
               </Button>
               <Button
                  variant="primary"
                  disabled={!escolhido || escolhido === caso.responsavel?.id || atribuir.isPending}
                  onClick={() =>
                     escolhido &&
                     atribuir.mutate(escolhido, {
                        onSuccess: () => {
                           notificar({ titulo: "Responsável atualizado", detalhe: usuarios?.find(u => u.id === escolhido)?.nome });
                           onClose();
                        },
                     })
                  }
               >
                  Atribuir
               </Button>
            </>
         }
      >
         {isLoading ? (
            <p className="px-5 py-6 text-[12px] text-ink-3">Carregando a equipe…</p>
         ) : !usuarios?.length ? (
            <EmptyPanel compact title="Ninguém disponível para esta etapa" message="Fale com a gestão da equipe para habilitar alguém." />
         ) : (
            <ul role="radiogroup" aria-label="Responsável" className="divide-y divide-hairline px-2 py-2">
               {usuarios.map(u => (
                  <li key={u.id}>
                     <label
                        className={cn(
                           "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-[13px] transition-colors",
                           escolhido === u.id ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-hover",
                        )}
                     >
                        <input
                           type="radio"
                           name="responsavel"
                           checked={escolhido === u.id}
                           onChange={() => setEscolhido(u.id)}
                           className="accent-(--brand)"
                        />
                        <Initials nome={u.nome} size="sm" />
                        <span className="flex-1">{u.nome}</span>
                        {caso.responsavel?.id === u.id ? <span className="text-[11px] text-ink-4">atual</span> : null}
                     </label>
                  </li>
               ))}
            </ul>
         )}
      </Modal>
   );
}

const PendenciaSchema = z.object({
   tipo: TipoPendenciaSchema,
   revisarEm: z.string().min(1, "Escolha a data de revisão"),
   descricao: z.string().max(300, "Até 300 caracteres"),
});
type PendenciaForm = z.infer<typeof PendenciaSchema>;

function amanha(): string {
   return new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
}

export function DialogoPendencia({ caso, aberto, onClose }: { caso: CasoDetalhe; aberto: boolean; onClose: () => void }) {
   const flags = useAtualizarFlags(caso);
   const form = useForm<PendenciaForm>({
      resolver: zodResolver(
         PendenciaSchema.refine(v => v.revisarEm >= amanha(), { path: ["revisarEm"], message: "Escolha uma data a partir de amanhã" }),
      ),
      defaultValues: { tipo: "EDITAL_DP", revisarEm: "", descricao: "" },
   });
   const resolver = !!caso.pendencia;
   const enviar = form.handleSubmit(v =>
      flags.mutate(
         {
            pendencia: {
               tipo: v.tipo,
               descricao: v.descricao || undefined,
               revisarEm: new Date(`${v.revisarEm}T09:00:00-03:00`).toISOString(),
            },
         },
         {
            onSuccess: () => {
               notificar({ titulo: "Pendência registrada", detalhe: "O prazo fica pausado até a data de revisão." });
               onClose();
            },
         },
      ),
   );

   return (
      <Modal
         open={aberto}
         onOpenChange={v => !v && onClose()}
         title={resolver ? "Resolver pendência externa" : "Registrar pendência externa"}
         description={
            resolver
               ? "O prazo volta a contar a partir de agora."
               : "A pendência não muda a etapa: pausa o prazo com motivo e data de revisão. No dia, o caso volta a contar e o responsável é avisado."
         }
         size="sm"
         footer={
            <>
               <Button variant="ghost" onClick={onClose}>
                  Voltar
               </Button>
               {resolver ? (
                  <Button
                     variant="primary"
                     disabled={flags.isPending}
                     onClick={() =>
                        flags.mutate(
                           { pendencia: null, justificativa: "Pendência resolvida" },
                           {
                              onSuccess: () => {
                                 notificar({ titulo: "Pendência resolvida", detalhe: "O prazo voltou a contar." });
                                 onClose();
                              },
                           },
                        )
                     }
                  >
                     Resolver pendência
                  </Button>
               ) : (
                  <Button variant="primary" disabled={flags.isPending} onClick={() => void enviar()}>
                     Registrar pendência
                  </Button>
               )}
            </>
         }
      >
         {resolver && caso.pendencia ? (
            <p className="px-5 py-4 text-[13px] text-ink-2">{ROTULO_PENDENCIA[caso.pendencia.tipo]}</p>
         ) : (
            <form
               className="space-y-4 px-5 py-4"
               onSubmit={e => {
                  e.preventDefault();
                  void enviar();
               }}
            >
               <Field label="Tipo" required>
                  {p => (
                     <select {...p} {...form.register("tipo")} data-autofocus className={cn(CONTROL, "h-9")}>
                        {(Object.keys(ROTULO_PENDENCIA) as TipoPendencia[]).map(t => (
                           <option key={t} value={t}>
                              {ROTULO_PENDENCIA[t]}
                           </option>
                        ))}
                     </select>
                  )}
               </Field>
               <Field label="Revisar em" required error={form.formState.errors.revisarEm?.message}>
                  {p => <input type="date" min={amanha()} {...p} {...form.register("revisarEm")} className={cn(CONTROL, "h-9")} />}
               </Field>
               <Field label="Detalhe" hint="opcional" error={form.formState.errors.descricao?.message}>
                  {p => <Textarea rows={2} {...p} {...form.register("descricao")} />}
               </Field>
            </form>
         )}
      </Modal>
   );
}

export function DialogoFlag({ caso, flag, onClose }: { caso: CasoDetalhe; flag: "ouvidoria" | "escalado" | null; onClose: () => void }) {
   const flags = useAtualizarFlags(caso);
   const [justificativa, setJustificativa] = useState("");
   if (!flag) return null;
   const ligado = caso.flags[flag];
   const titulo =
      flag === "ouvidoria" ? (ligado ? "Retirar ouvidoria" : "Marcar ouvidoria") : ligado ? "Retirar escalonamento" : "Escalar caso";
   const descricao =
      flag === "ouvidoria"
         ? "Casos de ouvidoria aparecem na vez do suporte e da diretoria e sobem na prioridade da fila."
         : "O caso aparece na vez da diretoria e sobe na prioridade da fila.";

   return (
      <Modal
         open
         onOpenChange={v => !v && onClose()}
         title={titulo}
         description={descricao}
         size="sm"
         footer={
            <>
               <Button variant="ghost" onClick={onClose}>
                  Voltar
               </Button>
               <Button
                  variant="primary"
                  disabled={flags.isPending}
                  onClick={() =>
                     flags.mutate(
                        { [flag]: !ligado, justificativa: justificativa.trim() || undefined },
                        {
                           onSuccess: () => {
                              notificar({ titulo: `${titulo}: feito`, detalhe: caso.candidato.nome });
                              onClose();
                           },
                        },
                     )
                  }
               >
                  {titulo}
               </Button>
            </>
         }
      >
         <div className="px-5 py-4">
            <Field label="Justificativa" hint="opcional">
               {p => <Textarea rows={3} {...p} value={justificativa} onChange={e => setJustificativa(e.target.value)} data-autofocus />}
            </Field>
         </div>
      </Modal>
   );
}
