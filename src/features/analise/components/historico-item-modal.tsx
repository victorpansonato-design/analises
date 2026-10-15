/**
 * Histórico da decisão de um item: sugestão (fonte, confiança, justificativa), pergunta à
 * coordenação, resposta e a decisão atual, com quem e quando. É a trilha de auditoria que mede a IA
 * (docs/07 §3.4 e §4). O histórico de outros casos com a mesma equivalência depende de endpoint
 * próprio [VALIDAR com o TI].
 */
import { CircleCheck, CircleDashed, History, MessageCircleQuestion, Sparkles, UserCheck } from "lucide-react";

import { Modal } from "@/components/core/overlay";
import { Timeline, TimelineItem } from "@/components/core/timeline";
import { ROTULO_DECISAO } from "@/features/casos";
import { useAgora } from "@/hooks/use-agora";
import { stamp } from "@/lib/format";

import {
   ROTULO_CONFIANCA,
   ROTULO_MOTIVO_ALTERACAO,
   ROTULO_ORIGEM_DECISAO,
   type ItemAnalise,
} from "@/features/analise/types/analise.schema";

export function HistoricoItemModal({ item, onFechar }: { item: ItemAnalise | null; onFechar: () => void }) {
   const agora = useAgora();
   const s = item?.sugestao;
   const p = item?.pergunta;
   const d = item?.decisao;
   return (
      <Modal open={!!item} onOpenChange={a => !a && onFechar()} icon={History} title="Histórico da decisão" description={item?.disciplina}>
         <div className="px-5 py-4">
            <Timeline>
               {s ? (
                  <TimelineItem
                     icon={Sparkles}
                     stamp={null}
                     title={`Sugestão: ${ROTULO_DECISAO[s.decisao]} · ${s.fonte === "REGRA" ? "regra de equivalência" : "IA"}`}
                     detail={`Confiança ${ROTULO_CONFIANCA[s.confianca].toLowerCase()}`}
                  >
                     {s.justificativa ? <p className="text-[12px] text-ink-2">{s.justificativa}</p> : null}
                  </TimelineItem>
               ) : (
                  <TimelineItem icon={Sparkles} stamp={null} title="Sem sugestão da pré-análise" detail="A decisão é toda da analista" />
               )}
               {p ? (
                  <TimelineItem
                     icon={MessageCircleQuestion}
                     title={`Pergunta à coordenação · sugere ${ROTULO_DECISAO[p.decisaoSugerida]}`}
                     stamp={stamp(p.em, agora)}
                     detail={p.por.nome}
                  >
                     <p className="text-[12px] text-ink-2">{p.texto}</p>
                  </TimelineItem>
               ) : null}
               {p?.resposta ? (
                  <TimelineItem
                     icon={UserCheck}
                     tone="brand"
                     title={`Coordenação: ${ROTULO_DECISAO[p.resposta.decisao]}`}
                     stamp={stamp(p.resposta.em, agora)}
                     detail={`${p.resposta.por.nome}${p.resposta.usarComoRegra ? " · virou regra para os próximos casos" : ""}`}
                  >
                     {p.resposta.comentario ? <p className="text-[12px] text-ink-2">{p.resposta.comentario}</p> : null}
                  </TimelineItem>
               ) : null}
               {d ? (
                  <TimelineItem
                     icon={CircleCheck}
                     tone="brand"
                     title={`Decisão: ${ROTULO_DECISAO[d.valor]}`}
                     stamp={stamp(d.em, agora)}
                     detail={`${d.por.nome} · ${ROTULO_ORIGEM_DECISAO[d.origem]}${d.motivoAlteracao ? ` · ${ROTULO_MOTIVO_ALTERACAO[d.motivoAlteracao]}` : ""}`}
                  />
               ) : (
                  <TimelineItem icon={CircleDashed} stamp={null} title="Ainda sem decisão confirmada" />
               )}
            </Timeline>
         </div>
      </Modal>
   );
}
