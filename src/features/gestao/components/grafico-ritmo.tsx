/**
 * Ritmo do mês (burn-up): matrículas acumuladas por dia contra a reta da meta, num eixo só.
 * - Realizado: linha de 2 px na cor da marca, com marcador no último dia lido.
 * - Ritmo da meta: reta neutra fina do zero à meta no último dia do mês (referência, não série).
 * - Hover/teclado num índice só (guia + tooltip), como o gráfico de linha dos indicadores.
 * A série também sai em texto (`sr-only`).
 */
import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { useLargura } from "@/hooks/use-largura";
import { int } from "@/lib/format";

interface GraficoRitmoProps {
   /** Acumulado por dia de calendário, até hoje. */
   acumulado: readonly number[];
   /** Dias de calendário do mês inteiro. */
   diasNoMes: number;
   meta: number;
   rotulo: string;
   altura?: number;
}

/** Matrícula é contagem: eixo em passos inteiros redondos (1, 2, 5, 10…), nunca 2,5. */
function escalaInteira(maior: number): { max: number; ticks: number[] } {
   const bruto = Math.max(1, maior / 4);
   const base = 10 ** Math.floor(Math.log10(bruto));
   const passo = [1, 2, 5, 10].map(m => m * base).find(p => p >= bruto) ?? 10 * base;
   const max = Math.ceil(maior / passo) * passo;
   return { max, ticks: Array.from({ length: max / passo + 1 }, (_, i) => i * passo) };
}

const M = { topo: 14, direita: 58, base: 22, esquerda: 34 };

export function GraficoRitmo({ acumulado, diasNoMes, meta, rotulo, altura = 196 }: GraficoRitmoProps) {
   const { ref, largura } = useLargura<HTMLDivElement>();
   const [ativo, setAtivo] = useState<number | null>(null);
   const maior = Math.max(meta, ...acumulado, 1);
   const escala = escalaInteira(maior);
   const util = Math.max(1, largura - M.esquerda - M.direita);
   const alturaUtil = altura - M.topo - M.base;
   const x = (dia: number) => M.esquerda + (diasNoMes <= 1 ? 0 : (dia / (diasNoMes - 1)) * util);
   const y = (v: number) => M.topo + alturaUtil - (v / (escala.max || 1)) * alturaUtil;
   const ultimo = acumulado.length - 1;
   const d = acumulado.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
   const area = ultimo >= 0 ? `${d} L${x(ultimo).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : "";
   const esperado = (dia: number) => (meta * (dia + 1)) / diasNoMes;
   const descricao =
      ultimo >= 0
         ? `${rotulo}: ${int(acumulado[ultimo])} matrículas até o dia ${ultimo + 1} de ${diasNoMes}, meta de ${int(meta)}. Use as setas para ler cada dia.`
         : `${rotulo}: sem matrículas no período.`;

   const doPonteiro = (e: PointerEvent<SVGSVGElement>) => {
      const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
      const i = Math.round(((px - M.esquerda) / util) * (diasNoMes - 1));
      return Math.max(0, Math.min(ultimo, i));
   };
   const teclado = (e: KeyboardEvent<SVGSVGElement>) => {
      if (ultimo < 0) return;
      const atual = ativo ?? ultimo;
      const mapa: Record<string, number | null> = {
         ArrowLeft: Math.max(0, atual - 1),
         ArrowRight: Math.min(ultimo, atual + 1),
         Home: 0,
         End: ultimo,
         Escape: null,
      };
      if (!(e.key in mapa)) return;
      e.preventDefault();
      setAtivo(mapa[e.key]);
   };
   const marcos = [0, Math.floor((diasNoMes - 1) / 2), diasNoMes - 1];
   const tooltipX = ativo !== null ? Math.max(4, Math.min(x(ativo) - 80, largura - 168)) : 0;

   return (
      <div ref={ref} className="relative w-full" style={{ height: altura }}>
         {largura > 0 ? (
            <svg
               width={largura}
               height={altura}
               role="img"
               aria-label={descricao}
               tabIndex={0}
               onKeyDown={teclado}
               onPointerMove={e => ultimo >= 0 && setAtivo(doPonteiro(e))}
               onPointerLeave={() => setAtivo(null)}
               onBlur={() => setAtivo(null)}
               className="block rounded-xs outline-none focus-visible:ring-2 focus-visible:ring-focus"
            >
               {escala.ticks.map((t, i) => (
                  <g key={t}>
                     <line
                        x1={M.esquerda}
                        x2={largura - M.direita}
                        y1={y(t)}
                        y2={y(t)}
                        strokeWidth={1}
                        className={i === 0 ? "stroke-hairline-strong" : "stroke-hairline"}
                     />
                     <text
                        x={M.esquerda - 8}
                        y={y(t)}
                        dy="0.32em"
                        textAnchor="end"
                        className="fill-ink-4 font-mono text-[10.5px] tabular-nums"
                     >
                        {int(t)}
                     </text>
                  </g>
               ))}
               {marcos.map((dia, i) => (
                  <text
                     key={dia}
                     x={x(dia)}
                     y={altura - 5}
                     textAnchor={i === 0 ? "start" : i === marcos.length - 1 ? "end" : "middle"}
                     className="fill-ink-4 font-mono text-[10.5px] tabular-nums"
                  >
                     dia {dia + 1}
                  </text>
               ))}
               <line x1={x(0)} y1={y(0)} x2={x(diasNoMes - 1)} y2={y(meta)} strokeWidth={1.25} className="stroke-ink-4" />
               <text x={x(diasNoMes - 1) + 6} y={y(meta)} dy="0.32em" className="fill-ink-3 text-[11px]">
                  meta {int(meta)}
               </text>
               {ativo !== null ? (
                  <line x1={x(ativo)} x2={x(ativo)} y1={M.topo} y2={M.topo + alturaUtil} strokeWidth={1} className="stroke-ink-4" />
               ) : null}
               {ultimo >= 0 ? (
                  <>
                     <path d={area} className="fill-brand/10" />
                     <path d={d} fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="stroke-brand" />
                     <circle cx={x(ultimo)} cy={y(acumulado[ultimo])} r={4} strokeWidth={2} className="fill-brand stroke-card" />
                     {ativo === null ? (
                        <text x={x(ultimo) + 8} y={y(acumulado[ultimo])} dy="-0.5em" className="fill-ink text-[11.5px] font-medium">
                           {int(acumulado[ultimo])}
                        </text>
                     ) : (
                        <circle cx={x(ativo)} cy={y(acumulado[ativo])} r={4} strokeWidth={2} className="fill-brand stroke-card" />
                     )}
                  </>
               ) : null}
            </svg>
         ) : null}
         {ativo !== null ? (
            <div
               aria-hidden
               className="pointer-events-none absolute top-0 z-10 w-[164px] rounded-xl bg-card px-3 py-2 shadow-overlay"
               style={{ left: tooltipX }}
            >
               <p className="text-[11px] text-ink-3">Até o dia {ativo + 1}</p>
               <p className="font-mono text-[13px] font-medium text-ink tabular-nums">{int(acumulado[ativo])} matrículas</p>
               <p className="text-[11px] text-ink-3">Ritmo da meta: {int(Math.round(esperado(ativo)))}</p>
            </div>
         ) : null}
         <div aria-live="polite" className="sr-only">
            {ativo !== null ? `Dia ${ativo + 1}: ${int(acumulado[ativo])} matrículas` : ""}
         </div>
         <ol className="sr-only">
            {acumulado.map((v, i) => (
               <li key={i}>
                  Dia {i + 1}: {int(v)}
               </li>
            ))}
         </ol>
      </div>
   );
}
