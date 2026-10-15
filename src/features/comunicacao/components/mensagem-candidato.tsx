/**
 * Mensagem ao candidato (docs/05 §3.4 e docs/08 §4). Só templates aprovados; nada de texto livre ao
 * candidato fora da janela do WhatsApp.
 *
 * - Lista os templates do papel. Os que não servem à etapa atual aparecem desabilitados COM o motivo.
 * - A prévia vem do backend e é EXATAMENTE o que o candidato verá (quebras de linha e botões).
 * - Variável vazia ou falta de autorização de WhatsApp bloqueiam o envio com explicação visível.
 * - Envio pede confirmação (mensagem ao candidato não se desfaz). O front nunca fala com o Blip.
 */
import { ExternalLink, MessageSquareOff, Send } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { SectionLabel } from "@/components/core/section-label";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { pressSubtle } from "@/lib/motion";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { acaoDoCaso, type CasoDetalhe } from "@/features/casos";

import { useEnviarMensagem } from "@/features/comunicacao/api/comunicacao.mutations";
import { usePreviaMensagem, useTemplates } from "@/features/comunicacao/api/comunicacao.queries";
import { BolhaWhatsapp } from "@/features/comunicacao/components/bolha-whatsapp";
import { motivoBloqueioEnvio, motivoTemplateForaDaEtapa, origemDoQueFalta } from "@/features/comunicacao/domain/mensagem";
import type { TemplateMensagem } from "@/features/comunicacao/types/comunicacao.schema";

export interface MensagemCandidatoProps {
   caso: CasoDetalhe;
   /** Chamado depois do envio confirmado (ex.: voltar o compositor para "Nota interna"). */
   onEnviada?: () => void;
}

export function MensagemCandidato({ caso, onEnviada }: MensagemCandidatoProps) {
   const acao = acaoDoCaso(caso, "ENVIAR_MENSAGEM");
   const templates = useTemplates();
   const [escolhido, setEscolhido] = useState<string | null>(null);
   const [confirmando, setConfirmando] = useState(false);
   const enviar = useEnviarMensagem(caso.id);

   const lista = templates.data ?? [];
   const serve = (t: TemplateMensagem) => !motivoTemplateForaDaEtapa(t, caso.etapa);
   const template = lista.find(t => t.id === escolhido && serve(t)) ?? lista.find(serve) ?? null;
   const previa = usePreviaMensagem(caso.id, template?.id ?? null);
   const faltando = previa.data?.variaveisFaltando ?? [];

   if (!acao) {
      return (
         <EmptyPanel
            compact
            icon={MessageSquareOff}
            title="Seu perfil não envia mensagens ao candidato"
            message="Quem conversa com o candidato é o consultor ou a equipe de matrícula. Deixe uma nota interna com @menção para pedir o envio."
         />
      );
   }

   const bloqueio = !acao.habilitada
      ? (acao.motivos[0] ?? "Envio indisponível neste caso")
      : !template
        ? "Nenhum template serve à etapa atual"
        : motivoBloqueioEnvio({ template, etapa: caso.etapa, optInWhatsapp: caso.candidato.optInWhatsapp, variaveisFaltando: faltando });
   const origens = origemDoQueFalta(faltando);
   const podeEnviar = !bloqueio && !!previa.data && !previa.isFetching;

   function confirmar() {
      if (!template) return;
      enviar.mutate(template.id, {
         onSuccess: () => {
            setConfirmando(false);
            notificar({ titulo: "Mensagem enviada ao candidato", detalhe: `${template.nome}. Acompanhe a entrega na linha do tempo.` });
            onEnviada?.();
         },
      });
   }

   function abrirBlipDesk() {
      notificar({
         tom: "info",
         titulo: "Blip Desk",
         detalhe:
            "A conversa do candidato ainda não está disponível. Use o histórico deste protocolo para consultar os contatos registrados.",
      });
   }

   return (
      <div className="space-y-4">
         {!caso.candidato.optInWhatsapp ? (
            <Notice tone="warn" title="Sem autorização de WhatsApp">
               O candidato não autorizou contato pelo WhatsApp. Registre a autorização na aba Dados antes de enviar.
            </Notice>
         ) : null}

         <AsyncState
            isLoading={templates.isLoading}
            isError={templates.isError}
            isEmpty={lista.length === 0}
            loading={
               <div className="space-y-2" aria-busy>
                  {[0, 1, 2].map(i => (
                     <Skeleton key={i} className="h-12 w-full rounded-xl" />
                  ))}
               </div>
            }
            error={
               <EmptyPanel
                  compact
                  tone="crit"
                  title="Não carregamos os templates"
                  message="O servidor não respondeu. Tente de novo em instantes."
                  action={
                     <Button size="xs" onClick={() => void templates.refetch()}>
                        Tentar de novo
                     </Button>
                  }
               />
            }
            empty={
               <EmptyPanel
                  compact
                  title="Nenhum template aprovado para o seu papel"
                  message="Os templates de cada papel são aprovados com Marketing e TI. Peça a inclusão se sentir falta de algum."
               />
            }
         >
            <div className="grid gap-5 lg:grid-cols-2">
               <div>
                  <SectionLabel plain as="h3" className="mb-2">
                     Template aprovado
                  </SectionLabel>
                  <div role="radiogroup" aria-label="Template aprovado" className="space-y-1">
                     {lista.map(t => {
                        const fora = motivoTemplateForaDaEtapa(t, caso.etapa);
                        const ativo = t.id === template?.id;
                        return (
                           <motion.button
                              key={t.id}
                              type="button"
                              role="radio"
                              aria-checked={ativo}
                              disabled={!!fora}
                              whileTap={fora ? undefined : pressSubtle}
                              onClick={() => setEscolhido(t.id)}
                              className={cn(
                                 "flex w-full items-start gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors duration-150",
                                 ativo ? "bg-surface-2" : "hover:bg-surface-hover",
                                 fora && "cursor-not-allowed hover:bg-transparent",
                              )}
                           >
                              <span
                                 aria-hidden
                                 className={cn(
                                    "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-full",
                                    ativo ? "bg-brand" : "bg-surface-3",
                                 )}
                              >
                                 {ativo ? <span className="size-1.5 rounded-full bg-on-brand" /> : null}
                              </span>
                              <span className="min-w-0">
                                 <span className={cn("block text-[13px] font-medium", fora ? "text-ink-3" : "text-ink")}>{t.nome}</span>
                                 <span className="block text-[12px] leading-relaxed text-ink-3">{t.descricao}</span>
                                 {fora ? <span className="mt-0.5 block text-[11.5px] text-ink-4">Indisponível agora. {fora}.</span> : null}
                              </span>
                           </motion.button>
                        );
                     })}
                  </div>
               </div>

               <div>
                  <SectionLabel plain as="h3" className="mb-2">
                     Prévia: exatamente como o candidato verá
                  </SectionLabel>
                  <div className="rounded-xl bg-workspace p-4">
                     <AsyncState
                        isLoading={!!template && previa.isLoading}
                        isError={previa.isError}
                        isEmpty={!template}
                        loading={<Skeleton className="ml-auto h-24 w-3/4 rounded-xl" />}
                        error={
                           <p className="text-[12px] text-crit-ink">
                              Não conseguimos montar a prévia. Escolha o template de novo ou recarregue o caso.
                           </p>
                        }
                        empty={<p className="text-[12px] text-ink-3">Nenhum template serve à etapa atual do caso.</p>}
                     >
                        {previa.data ? <BolhaWhatsapp texto={previa.data.texto} botoes={previa.data.botoes} faltando={faltando} /> : null}
                     </AsyncState>
                  </div>
                  {faltando.length > 0 && origens.length > 0 ? (
                     <Notice tone="warn" className="mt-3">
                        {origens.join(" ")}
                     </Notice>
                  ) : null}
               </div>
            </div>
         </AsyncState>

         <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <Button
               className="acao-destaque"
               data-tom="liberadas"
               icon={<Send />}
               disabled={!podeEnviar}
               onClick={() => setConfirmando(true)}
            >
               Enviar mensagem
            </Button>
            <Button variant="ghost" icon={<ExternalLink />} onClick={abrirBlipDesk}>
               Abrir conversa no Blip Desk
            </Button>
            {bloqueio ? (
               <p className="basis-full text-[11.5px] font-medium text-ink-3">Envio bloqueado. {bloqueio.replace(/\.$/, "")}.</p>
            ) : null}
         </div>

         <Modal
            open={confirmando}
            onOpenChange={setConfirmando}
            icon={Send}
            title="Enviar esta mensagem?"
            description={`Pelo WhatsApp, para ${caso.candidato.nome}. Mensagem enviada não se desfaz; ela entra na linha do tempo com o status de entrega.`}
            footer={
               <>
                  <Button variant="ghost" onClick={() => setConfirmando(false)}>
                     Voltar
                  </Button>
                  <Button
                     variant="primary"
                     className="acao-destaque"
                     data-tom="liberadas"
                     icon={<Send />}
                     disabled={enviar.isPending}
                     onClick={confirmar}
                     data-autofocus
                  >
                     {enviar.isPending ? "Enviando…" : "Enviar agora"}
                  </Button>
               </>
            }
         >
            <div className="bg-workspace p-5">
               {previa.data ? <BolhaWhatsapp texto={previa.data.texto} botoes={previa.data.botoes} faltando={faltando} /> : null}
            </div>
         </Modal>
      </div>
   );
}
