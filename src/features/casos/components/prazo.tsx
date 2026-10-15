/**
 * Prazo (SLA) de uma etapa, como texto mono que alinha em coluna. Sem cor no prazo; âmbar só em
 * atenção; vermelho só quando estourou (o atraso se destaca sem tornar a tela vermelha). O SLA não
 * anima dígitos.
 */
import { PauseCircle } from "lucide-react";

import { cn } from "@/lib/utils";

import { lerSla, rotuloSla, type EstadoSla } from "@/features/casos/domain/sla";
import type { Sla } from "@/features/casos/types/caso.schema";

const TOM: Record<EstadoSla, string> = {
   NO_PRAZO: "text-ink-3",
   ATENCAO: "font-medium text-warn-ink",
   ESTOURADO: "font-semibold text-crit-ink",
   PAUSADO: "text-ink-4",
   SEM_SLA: "text-ink-4",
};

export function Prazo({ sla, agora, className }: { sla: Sla; agora: Date; className?: string }) {
   const leitura = lerSla(sla, agora);
   const texto = rotuloSla(leitura, sla.pausadoAte);
   if (!texto) return null;
   return (
      <span
         className={cn("inline-flex shrink-0 items-center gap-1 font-mono text-[11.5px] whitespace-nowrap", TOM[leitura.estado], className)}
      >
         {leitura.estado === "PAUSADO" ? <PauseCircle className="size-3" aria-hidden /> : null}
         {texto}
      </span>
   );
}
