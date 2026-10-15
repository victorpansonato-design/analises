/**
 * Enviar proposta (docs/03 ENVIAR_PROPOSTA, docs/08 `proposta_pronta`). Antes de confirmar, quem
 * envia vê a PRÉVIA FIEL do que o candidato vai receber e as guardas do envio (opt-in, celular,
 * condição financeira e variáveis da mensagem), cada uma com o porquê. Qualquer guarda falhando
 * bloqueia o botão com o motivo à vista; o backend confere de novo.
 */
import { useQueryClient } from "@tanstack/react-query";
import { CircleCheck, CircleX, RotateCcw, Send } from "lucide-react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Modal } from "@/components/core/overlay";
import { SectionLabel } from "@/components/core/section-label";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgora } from "@/hooks/use-agora";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { useTransicao, type CasoDetalhe } from "@/features/casos";

import { PreviaWhatsapp } from "@/features/proposta/components/previa-whatsapp";
import { guardasDoEnvio, podeEnviar, type BotaoProposta } from "@/features/proposta/domain/proposta";
import { propostaKeys, usePreviaProposta } from "@/features/proposta/api/proposta.queries";
import type { Proposta } from "@/features/proposta/types/proposta.schema";

interface EnviarPropostaModalProps {
   caso: CasoDetalhe;
   proposta: Proposta | undefined;
   botao: BotaoProposta | null;
   open: boolean;
   onClose: () => void;
}

export function EnviarPropostaModal({ caso, proposta, botao, open, onClose }: EnviarPropostaModalProps) {
   const queryClient = useQueryClient();
   const agora = useAgora();
   const previa = usePreviaProposta(caso.id, open);
   const transicao = useTransicao(caso);

   const guardas = guardasDoEnvio({
      optInWhatsapp: caso.candidato.optInWhatsapp,
      celular: caso.candidato.celular,
      financeiroCarregado: !!proposta?.financeiro,
      variaveisFaltando: previa.data?.variaveisFaltando ?? null,
   });
   const semPrevia = !previa.data;
   const liberado = !!botao?.habilitada && podeEnviar(guardas) && !semPrevia;
   const motivo = !botao?.habilitada
      ? (botao?.motivo ?? null)
      : (guardas.find(g => !g.ok)?.texto ?? (previa.isError ? "Sem a prévia não dá para conferir o que o candidato vai receber" : null));

   function confirmar() {
      transicao.mutate(
         { acao: "ENVIAR_PROPOSTA" },
         {
            onSuccess: () => {
               void queryClient.invalidateQueries({ queryKey: propostaKeys.detalhe(caso.id) });
               notificar({ titulo: "Proposta enviada pelo WhatsApp", detalhe: `${caso.candidato.nome} · lembretes automáticos ligados` });
               onClose();
            },
         },
      );
   }

   return (
      <Modal
         open={open}
         onOpenChange={v => (v ? null : onClose())}
         title="Enviar proposta"
         description="O candidato recebe o resultado da análise pelo WhatsApp. Confira a mensagem antes de enviar."
         icon={Send}
         size="md"
         footer={
            <>
               {motivo ? <p className="mr-auto max-w-[60%] text-[11.5px] leading-relaxed text-ink-3">{motivo}</p> : null}
               <Button variant="ghost" onClick={onClose}>
                  Cancelar
               </Button>
               <Button variant="primary" icon={<Send />} disabled={!liberado || transicao.isPending} onClick={confirmar}>
                  {transicao.isPending ? "Enviando…" : "Enviar pelo WhatsApp"}
               </Button>
            </>
         }
      >
         <div className="space-y-5 p-5">
            <AsyncState
               isLoading={previa.isLoading}
               isError={previa.isError}
               loading={<Skeleton className="h-40 w-full rounded-xl" />}
               error={
                  <EmptyPanel
                     compact
                     tone="crit"
                     title="Não foi possível montar a prévia"
                     message="Sem a prévia não dá para conferir o que o candidato vai receber. Tente de novo em instantes."
                     action={
                        <Button size="xs" icon={<RotateCcw />} onClick={() => void previa.refetch()}>
                           Tentar de novo
                        </Button>
                     }
                  />
               }
            >
               {previa.data ? <PreviaWhatsapp texto={previa.data.texto} botoes={previa.data.botoes} agora={agora} /> : null}
            </AsyncState>

            <section aria-label="Condições para enviar">
               <SectionLabel>Antes de enviar</SectionLabel>
               <ul className="mt-2 space-y-1.5">
                  {guardas.map(g => (
                     <li key={g.id} className="flex items-start gap-2 text-[12.5px] leading-relaxed">
                        {g.ok ? (
                           <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden />
                        ) : (
                           <CircleX className="mt-0.5 size-3.5 shrink-0 text-crit-ink" aria-hidden />
                        )}
                        <span className={cn(g.ok ? "text-ink-2" : "font-medium text-crit-ink")}>
                           <span className="sr-only">{g.ok ? "Ok: " : "Pendente: "}</span>
                           {g.texto}
                        </span>
                     </li>
                  ))}
               </ul>
               <p className="mt-3 text-[11.5px] leading-relaxed text-ink-4">
                  Depois do envio, o candidato recebe lembretes automáticos se não responder. O PDF do resumo vai junto quando o backend o
                  gerar.
               </p>
            </section>
         </div>
      </Modal>
   );
}
