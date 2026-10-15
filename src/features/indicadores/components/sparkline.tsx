/**
 * Sparkline (DS §11): tendência dentro do cartão, sem eixo. Decorativa para leitor de tela (o número
 * está ao lado e a série em texto mora no MetricSheet). O último ponto É o número do cartão; por
 * isso ele ganha o marcador.
 */
import type { Indicador } from "@/features/indicadores/types/indicadores.schema";
import { useLargura } from "@/hooks/use-largura";
import { cn } from "@/lib/utils";

interface SparklineProps {
   serie: Indicador["serie"];
   destaque?: boolean;
   altura?: number;
   className?: string;
}

export function Sparkline({ serie, destaque = false, altura = 28, className }: SparklineProps) {
   const { ref, largura } = useLargura<HTMLDivElement>();
   const pad = 3.5;
   const valores = serie.map(p => p.valor);
   const min = Math.min(...valores);
   const max = Math.max(...valores);
   const faixa = max - min || 1;
   const x = (i: number) => pad + (i / Math.max(1, serie.length - 1)) * (largura - pad * 2);
   const y = (v: number) => altura - pad - ((v - min) / faixa) * (altura - pad * 2);
   const d = serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
   const ultimo = serie[serie.length - 1];

   return (
      <div ref={ref} aria-hidden className={cn("w-full", className)} style={{ height: altura }}>
         {largura > 0 && serie.length > 1 ? (
            <svg width={largura} height={altura} className="block overflow-visible">
               <path
                  d={d}
                  fill="none"
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={destaque ? "stroke-brand" : "stroke-ink-3"}
               />
               {ultimo ? (
                  <circle
                     cx={x(serie.length - 1)}
                     cy={y(ultimo.valor)}
                     r={2.6}
                     strokeWidth={1.6}
                     className={cn("fill-card", destaque ? "stroke-brand" : "stroke-ink-3")}
                  />
               ) : null}
            </svg>
         ) : null}
      </div>
   );
}
