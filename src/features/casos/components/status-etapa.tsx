/**
 * Etapa como Status (ponto + palavra). A etapa é o veredito "onde o caso está"; a urgência fica com o
 * prazo, então as etapas ativas são neutras e só o desfecho ganha tom (matriculado em silêncio,
 * perdido e cancelado apagados).
 */
import { Status, type StatusTone } from "@/components/core/status";

import { ROTULO_ETAPA, type Etapa } from "@/features/casos/types/caso.schema";

const TOM: Record<Etapa, StatusTone> = {
   RASCUNHO: "muted",
   AGUARDANDO_DOCUMENTOS: "neutral",
   PRE_ANALISE: "info",
   EM_ANALISE: "neutral",
   AGUARDANDO_COORDENACAO: "neutral",
   AJUSTE_POS_COORDENACAO: "neutral",
   PRONTO_PARA_MATRICULA: "neutral",
   PROPOSTA_ENVIADA: "neutral",
   EM_NEGOCIACAO: "neutral",
   ADIADO: "muted",
   MATRICULADO: "ok",
   CONCLUIDO: "ok",
   PERDIDO: "muted",
   CANCELADO: "muted",
};

export function StatusEtapa({ etapa, className }: { etapa: Etapa; className?: string }) {
   return (
      <Status tone={TOM[etapa]} className={className}>
         {ROTULO_ETAPA[etapa]}
      </Status>
   );
}
