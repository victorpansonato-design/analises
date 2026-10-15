/**
 * Linha da fila (docs/05 §2.2, padrão "Tabela operacional" do DS §10.14). Duas linhas: nome e prazo
 * na primeira; RA ou protocolo, tipo, curso e responsável na segunda. Trilho de 2 px marca a linha
 * ativa (azul) e a estourada (vermelho): nunca fundo tingido na linha inteira. Dono e prazo sempre
 * visíveis.
 */
import { ShieldAlert, TriangleAlert } from "lucide-react";
import { memo } from "react";

import { Initials } from "@/components/core/initials";
import { Tag } from "@/components/core/tag";
import { cn } from "@/lib/utils";

import { PAPEL_DONO_DA_ETAPA } from "@/features/casos/domain/acoes";
import { lerSla } from "@/features/casos/domain/sla";
import { Prazo } from "@/features/casos/components/prazo";
import { StatusEtapa } from "@/features/casos/components/status-etapa";
import { ROTULO_TIPO, SIGLA_TURNO, type CasoResumo } from "@/features/casos/types/caso.schema";

interface LinhaFilaProps {
   caso: CasoResumo;
   ativa: boolean;
   mostrarEtapa: boolean;
   agora: Date;
   onAbrir: (id: string) => void;
}

function LinhaFilaBase({ caso, ativa, mostrarEtapa, agora, onAbrir }: LinhaFilaProps) {
   const estourado = lerSla(caso.sla, agora).estado === "ESTOURADO";
   const temDono = PAPEL_DONO_DA_ETAPA[caso.etapa] !== null;
   return (
      <button
         type="button"
         onClick={() => onAbrir(caso.id)}
         aria-current={ativa ? "true" : undefined}
         data-caso-id={caso.id}
         className={cn(
            "relative block w-full px-4 py-2.5 text-left transition-colors duration-150 focus-visible:-outline-offset-2",
            ativa ? "bg-surface-2" : "hover:bg-surface-hover",
         )}
      >
         {ativa || estourado ? (
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.5", ativa ? "bg-brand" : "bg-crit")} />
         ) : null}
         <span className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-semibold text-ink">{caso.candidato.nome}</span>
            {mostrarEtapa ? <StatusEtapa etapa={caso.etapa} className="hidden xl:inline-flex" /> : null}
            <Prazo sla={caso.sla} agora={agora} />
         </span>
         <span className="mt-1 flex items-center gap-1.5 text-[12px] text-ink-3">
            <span className="font-mono text-[11.5px] text-ink-2">{caso.candidato.ra ? `RA ${caso.candidato.ra}` : caso.protocolo}</span>
            <span aria-hidden>·</span>
            <Tag>{ROTULO_TIPO[caso.tipo]}</Tag>
            <span className="min-w-0 truncate">
               {caso.destino.cursoNome} ({SIGLA_TURNO[caso.destino.turno]})
            </span>
            <span className="ml-auto flex shrink-0 items-center gap-1.5">
               {caso.flags.ouvidoria || caso.flags.escalado ? (
                  <ShieldAlert className="size-3.5 text-crit-ink" aria-label={caso.flags.ouvidoria ? "Ouvidoria" : "Escalado"} />
               ) : null}
               {caso.flags.preAnaliseFalhou ? (
                  <TriangleAlert className="size-3.5 text-warn-ink" aria-label="Pré-análise não concluiu" />
               ) : null}
               {caso.reanalises > 0 ? <span className="text-[11px] font-medium text-ink-3">{caso.reanalises + 1}ª análise</span> : null}
               {caso.responsavel ? (
                  <span title={caso.responsavel.nome} className="flex items-center">
                     <Initials nome={caso.responsavel.nome} />
                     <span className="sr-only">Responsável: {caso.responsavel.nome}</span>
                  </span>
               ) : temDono ? (
                  <span className="text-[11px] text-ink-3">Sem responsável</span>
               ) : null}
            </span>
         </span>
      </button>
   );
}

export const LinhaFila = memo(LinhaFilaBase);
