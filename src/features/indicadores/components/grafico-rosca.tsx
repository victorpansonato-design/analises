/**
 * Gráfico de rosca (parte e todo) do topo do painel. Até quatro fatias em ordem fixa de cor
 * (`viz-1..3` + neutro), separadas por 2 px da cor da superfície, nunca por contorno.
 *
 * - A legenda ao lado é o canal de identidade: ponto + rótulo + número + percentual em texto (a cor
 *   nunca está sozinha; o aqua do tema claro tem contraste baixo e depende dela).
 * - Hover na fatia ou na linha da legenda destaca as duas e troca o centro pelo valor da fatia.
 * - A figura é `role="img"` com descrição; a lista da legenda é a versão em tabela.
 */
import { motion } from "motion/react";
import { useState } from "react";

import { int, percent } from "@/lib/format";
import { emphasis } from "@/lib/motion";
import { cn } from "@/lib/utils";

export interface FatiaRosca {
   id: string;
   rotulo: string;
   valor: number;
   /** Classe de preenchimento do SVG (ex.: `fill-viz-1`). */
   fill: string;
   /** Classe de fundo do ponto da legenda (ex.: `bg-viz-1`). */
   ponto: string;
}

interface GraficoRoscaProps {
   fatias: readonly FatiaRosca[];
   rotuloTotal: string;
   descricao: string;
   tamanho?: number;
}

function arco(cx: number, cy: number, raio: number, interno: number, de: number, ate: number): string {
   const ponto = (r: number, a: number) => [cx + r * Math.cos(a - Math.PI / 2), cy + r * Math.sin(a - Math.PI / 2)];
   const grande = ate - de > Math.PI ? 1 : 0;
   const [x0, y0] = ponto(raio, de);
   const [x1, y1] = ponto(raio, ate);
   const [x2, y2] = ponto(interno, ate);
   const [x3, y3] = ponto(interno, de);
   return `M${x0},${y0} A${raio},${raio} 0 ${grande} 1 ${x1},${y1} L${x2},${y2} A${interno},${interno} 0 ${grande} 0 ${x3},${y3} Z`;
}

export function GraficoRosca({ fatias, rotuloTotal, descricao, tamanho = 168 }: GraficoRoscaProps) {
   const [ativa, setAtiva] = useState<string | null>(null);
   const total = fatias.reduce((s, f) => s + f.valor, 0);
   const raio = tamanho / 2;
   const interno = raio * 0.66;
   const foco = fatias.find(f => f.id === ativa) ?? null;

   let angulo = 0;
   const arcos = fatias
      .filter(f => f.valor > 0)
      .map(f => {
         const de = angulo;
         // Uma fatia única de 100% vira dois arcos de 180° (um arco SVG não fecha o círculo).
         const varredura = Math.min((f.valor / total) * Math.PI * 2, Math.PI * 2 - 0.0001);
         angulo += varredura;
         return { ...f, d: arco(raio, raio, raio - 1, interno, de, de + varredura) };
      });

   return (
      <div className="flex items-center gap-5">
         <div className="relative shrink-0" style={{ width: tamanho, height: tamanho }}>
            <svg width={tamanho} height={tamanho} role="img" aria-label={descricao} className="block">
               {total === 0 ? (
                  <circle cx={raio} cy={raio} r={(raio + interno) / 2} fill="none" strokeWidth={raio - interno} className="stroke-track" />
               ) : (
                  arcos.map((f, i) => (
                     <motion.path
                        key={f.id}
                        d={f.d}
                        strokeWidth={2}
                        className={cn("stroke-card", f.fill)}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: ativa && ativa !== f.id ? 0.35 : 1 }}
                        transition={{ duration: ativa === null ? 0.4 : 0.15, delay: ativa === null ? i * 0.06 : 0, ease: emphasis }}
                        onPointerEnter={() => setAtiva(f.id)}
                        onPointerLeave={() => setAtiva(null)}
                     />
                  ))
               )}
            </svg>
            <div aria-hidden className="pointer-events-none absolute inset-0 grid place-items-center text-center">
               <div>
                  <p className="text-[26px] leading-none font-semibold tracking-tight text-ink">{int(foco ? foco.valor : total)}</p>
                  <p className="mt-1 max-w-[96px] text-[11px] leading-tight text-ink-3">
                     {foco ? (total > 0 ? percent(foco.valor / total, 0) : "sem casos") : rotuloTotal}
                  </p>
               </div>
            </div>
         </div>
         <ul className="min-w-0 flex-1 space-y-1">
            {fatias.map(f => (
               <li
                  key={f.id}
                  onPointerEnter={() => setAtiva(f.id)}
                  onPointerLeave={() => setAtiva(null)}
                  className={cn(
                     "grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-baseline gap-x-2 rounded-md px-1.5 py-1 transition-colors",
                     ativa === f.id && "bg-surface-2",
                  )}
               >
                  <span aria-hidden className={cn("size-2 translate-y-[-1px] self-center rounded-full", f.ponto)} />
                  <span className="truncate text-[12.5px] text-ink-2">{f.rotulo}</span>
                  <span className="font-mono text-[12.5px] font-medium text-ink tabular-nums">{int(f.valor)}</span>
                  <span className="w-10 text-right font-mono text-[11.5px] text-ink-3 tabular-nums">
                     {total > 0 ? percent(f.valor / total, 0) : "—"}
                  </span>
               </li>
            ))}
         </ul>
      </div>
   );
}
