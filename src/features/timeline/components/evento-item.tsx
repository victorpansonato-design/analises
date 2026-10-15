/**
 * Um evento da linha do tempo (DS §10.20). O ícone carrega a fonte; a linha de autor diz se foi uma
 * pessoa, o sistema, a IA ou o próprio candidato.
 *
 * - Mensagem do WhatsApp (entrada e saída) vira bolha, com o selo "Visível ao candidato" e o status
 *   de entrega: a equipe nunca confunde o que o candidato leu com o que é interno.
 * - Nota interna destaca as @menções. Anel `brand` para decisão, `crit` para falha.
 */
import { Cog, Eye, Gavel, MessageCircle, Send, Sparkles, StickyNote, UserRound, type LucideIcon } from "lucide-react";

import { Status } from "@/components/core/status";
import { Tag } from "@/components/core/tag";
import { TimelineItem } from "@/components/core/timeline";
import { stamp } from "@/lib/format";

import { BolhaWhatsapp } from "@/features/comunicacao";

import { botoesDoEvento, direcaoMensagem, ehMensagemWhatsapp, rotuloAutor, TOM_STATUS_ENTREGA } from "@/features/timeline/domain/eventos";
import { segmentarMencoes, type PessoaMencionavel } from "@/features/timeline/domain/mencoes";
import { ROTULO_STATUS_ENTREGA, type EventoTimeline } from "@/features/timeline/types/timeline.schema";

function iconeDoEvento(e: EventoTimeline): LucideIcon {
   if (e.autor.tipo === "IA") return Sparkles;
   if (e.autor.tipo === "CANDIDATO") return MessageCircle;
   if (e.categoria === "MENSAGEM") return Send;
   if (e.categoria === "NOTA") return StickyNote;
   if (e.categoria === "DECISAO") return Gavel;
   if (e.tipo === "documento.visualizado" || e.tipo === "dado.revelado") return Eye;
   return e.autor.tipo === "SISTEMA" ? Cog : UserRound;
}

function tomDoEvento(e: EventoTimeline): "plain" | "crit" | "brand" {
   if (e.statusEntrega === "FALHOU" || e.tipo.endsWith("falhou")) return "crit";
   if (e.categoria === "DECISAO") return "brand";
   return "plain";
}

function SeloCandidato() {
   return (
      <Tag className="gap-1">
         <Eye className="size-3" aria-hidden />
         Visível ao candidato
      </Tag>
   );
}

interface EventoItemProps {
   evento: EventoTimeline;
   agora: Date;
   pessoas: readonly PessoaMencionavel[];
}

export function EventoItem({ evento: e, agora, pessoas }: EventoItemProps) {
   const bolha = ehMensagemWhatsapp(e);
   return (
      <TimelineItem
         icon={iconeDoEvento(e)}
         tone={tomDoEvento(e)}
         title={e.titulo}
         stamp={<time dateTime={e.em}>{stamp(e.em, agora)}</time>}
      >
         <p className="mt-0.5 text-[11.5px] text-ink-4">{rotuloAutor(e.autor)}</p>
         {bolha && e.detalhe ? (
            <BolhaWhatsapp
               className="mt-2"
               texto={e.detalhe}
               botoes={botoesDoEvento(e)}
               direcao={direcaoMensagem(e)}
               rodape={
                  <>
                     <SeloCandidato />
                     {e.statusEntrega ? (
                        <Status tone={TOM_STATUS_ENTREGA[e.statusEntrega]} solid={e.statusEntrega === "FALHOU"}>
                           {ROTULO_STATUS_ENTREGA[e.statusEntrega]}
                        </Status>
                     ) : null}
                  </>
               }
            />
         ) : e.categoria === "NOTA" && e.detalhe ? (
            <p className="mt-1.5 rounded-lg bg-surface-2 px-3 py-2 text-[12.5px] leading-relaxed whitespace-pre-line text-ink-2">
               {segmentarMencoes(e.detalhe, pessoas).map((t, i) =>
                  t.mencao ? (
                     <span key={i} className="font-medium text-brand-text">
                        {t.texto}
                     </span>
                  ) : (
                     <span key={i}>{t.texto}</span>
                  ),
               )}
            </p>
         ) : e.detalhe ? (
            <p className="mt-1 text-[12px] leading-relaxed whitespace-pre-line text-ink-3">{e.detalhe}</p>
         ) : null}
         {!bolha && e.visivelAoCandidato ? (
            <div className="mt-1.5">
               <SeloCandidato />
            </div>
         ) : null}
      </TimelineItem>
   );
}
