/**
 * Gráfico de linha da série de um indicador (DS §11, SVG próprio, ADR-009).
 *
 * Os invariantes do DS, um por um:
 * 1. Mede o contêiner (`ResizeObserver`, sem o zero transitório) antes de desenhar.
 * 2. Um único índice de hover controla guia, marcador e tooltip; a faixa vertical mais próxima
 *    ganha o foco, o ponteiro não precisa acertar um alvo de 3 px.
 * 3. Teclado: o SVG é focável, ←/→ caminham, Home/End vão às pontas, Escape limpa.
 * 4. Escala com ticks redondos (`niceScale`), base no zero para valores não negativos; grade só
 *    horizontal, tracejada, base cheia; rótulos ralos ancorados no último ponto (`thin`).
 * A série também é publicada em texto (`sr-only`) para quem não vê o traço.
 */
import { useState, type KeyboardEvent, type PointerEvent } from "react";

import { niceScale, thin } from "@/features/indicadores/domain/escala";
import { formatarEixo, formatarValor } from "@/features/indicadores/domain/formato";
import { useLargura } from "@/hooks/use-largura";
import type { Indicador, Unidade } from "@/features/indicadores/types/indicadores.schema";
import { shortDate } from "@/lib/format";

interface GraficoLinhaProps {
   serie: Indicador["serie"];
   unidade: Unidade;
   rotulo: string;
   altura?: number;
}

const M = { topo: 12, direita: 14, base: 24, esquerda: 48 };

export function GraficoLinha({ serie, unidade, rotulo, altura = 188 }: GraficoLinhaProps) {
   const { ref, largura } = useLargura<HTMLDivElement>();
   const [ativo, setAtivo] = useState<number | null>(null);

   const valores = serie.map(p => p.valor);
   const minDado = Math.min(...valores, 0);
   const maxDado = Math.max(...valores, 0);
   const escala = niceScale(minDado >= 0 ? 0 : minDado, maxDado, 4);
   const larguraUtil = Math.max(1, largura - M.esquerda - M.direita);
   const alturaUtil = altura - M.topo - M.base;
   const x = (i: number) => M.esquerda + (serie.length <= 1 ? larguraUtil / 2 : (i / (serie.length - 1)) * larguraUtil);
   const y = (v: number) => M.topo + alturaUtil - ((v - escala.min) / (escala.max - escala.min || 1)) * alturaUtil;
   const d = serie.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.valor).toFixed(1)}`).join(" ");
   const rotulosX = new Set(thin(serie.length, Math.max(2, Math.floor(larguraUtil / 64))));
   const ultimo = serie.length - 1;
   const ultimoPonto = serie[ultimo];
   const descricao = ultimoPonto
      ? `${rotulo}: ${serie.length} semanas, de ${formatarValor(unidade, serie[0].valor)} em ${shortDate(serie[0].em)} a ${formatarValor(unidade, ultimoPonto.valor)} em ${shortDate(ultimoPonto.em)}. Use as setas para ler cada ponto.`
      : `${rotulo}: sem série.`;

   const indiceDoPonteiro = (e: PointerEvent<SVGSVGElement>) => {
      const caixa = e.currentTarget.getBoundingClientRect();
      const px = e.clientX - caixa.left;
      if (serie.length <= 1) return 0;
      const i = Math.round(((px - M.esquerda) / larguraUtil) * (serie.length - 1));
      return Math.max(0, Math.min(ultimo, i));
   };

   const teclado = (e: KeyboardEvent<SVGSVGElement>) => {
      if (serie.length === 0) return;
      const atual = ativo ?? ultimo;
      const proximo: Record<string, number | null> = {
         ArrowLeft: Math.max(0, atual - 1),
         ArrowRight: Math.min(ultimo, atual + 1),
         Home: 0,
         End: ultimo,
         Escape: null,
      };
      if (!(e.key in proximo)) return;
      e.preventDefault();
      if (e.key === "Escape" && ativo !== null) e.stopPropagation();
      setAtivo(proximo[e.key]);
   };

   const foco = ativo !== null ? serie[ativo] : null;
   const tooltipX = ativo !== null ? Math.max(4, Math.min(x(ativo) - 98, largura - 200)) : 0;

   return (
      <div ref={ref} className="relative w-full" style={{ height: altura }}>
         {largura > 0 && serie.length > 0 ? (
            <svg
               width={largura}
               height={altura}
               role="img"
               aria-label={descricao}
               tabIndex={0}
               onKeyDown={teclado}
               onPointerMove={e => setAtivo(indiceDoPonteiro(e))}
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
                        strokeDasharray={i === 0 ? undefined : "3 4"}
                        className={i === 0 ? "stroke-hairline-strong" : "stroke-hairline"}
                     />
                     <text
                        x={M.esquerda - 8}
                        y={y(t)}
                        dy="0.32em"
                        textAnchor="end"
                        className="fill-ink-4 font-mono text-[10.5px] tabular-nums"
                     >
                        {formatarEixo(unidade, t)}
                     </text>
                  </g>
               ))}
               {serie.map((p, i) =>
                  rotulosX.has(i) ? (
                     <text
                        key={p.em}
                        x={x(i)}
                        y={altura - 6}
                        textAnchor={i === 0 && serie.length > 1 ? "start" : i === ultimo && serie.length > 1 ? "end" : "middle"}
                        className="fill-ink-4 font-mono text-[10.5px] tabular-nums"
                     >
                        {shortDate(p.em)}
                     </text>
                  ) : null,
               )}
               {ativo !== null ? (
                  <line x1={x(ativo)} x2={x(ativo)} y1={M.topo} y2={M.topo + alturaUtil} strokeWidth={1} className="stroke-ink-4" />
               ) : null}
               <path d={d} fill="none" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" className="stroke-brand" />
               {ultimoPonto ? (
                  <circle cx={x(ultimo)} cy={y(ultimoPonto.valor)} r={3.4} strokeWidth={1.9} className="fill-card stroke-brand" />
               ) : null}
               {foco && ativo !== null && ativo !== ultimo ? (
                  <circle cx={x(ativo)} cy={y(foco.valor)} r={3.4} strokeWidth={1.9} className="fill-card stroke-brand" />
               ) : null}
            </svg>
         ) : null}
         {foco && ativo !== null ? (
            <div
               aria-hidden
               className="pointer-events-none absolute top-0 z-10 w-[196px] rounded-xl bg-card px-3 py-2 shadow-overlay"
               style={{ left: tooltipX }}
            >
               <p className="text-[11px] text-ink-3">Semana até {shortDate(foco.em)}</p>
               <p className="font-mono text-[13px] font-medium text-ink tabular-nums">{formatarValor(unidade, foco.valor)}</p>
            </div>
         ) : null}
         <div aria-live="polite" className="sr-only">
            {foco ? `${shortDate(foco.em)}: ${formatarValor(unidade, foco.valor)}` : ""}
         </div>
         <ol className="sr-only">
            {serie.map(p => (
               <li key={p.em}>
                  {shortDate(p.em)}: {formatarValor(unidade, p.valor)}
               </li>
            ))}
         </ol>
      </div>
   );
}
