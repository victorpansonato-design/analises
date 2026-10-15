/**
 * Topo do painel da gestão: o que importa numa leitura, cada número na forma que o trabalho dele
 * pede (DS §11), em vez de uma grade de cartões iguais.
 *
 * - Conversão em matrícula é o número-herói (um por tela, sans, sem contar do zero) com o gráfico
 *   de índice das últimas semanas ao lado.
 * - Onde estão os protocolos: parte e todo numa rosca, no canto superior direito.
 * - Quatro leituras rápidas, cada uma com a sua figura: anel (prazo), barra de status (atrasados),
 *   barra de proporção (primeiro contato) e distribuição de notas (satisfação).
 * - Funil por etapa e motivos de perda fecham a primeira dobra.
 * Tudo sai da mesma resposta de `/indicadores` e todo clique abre o MetricSheet do indicador.
 */
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

import { AnimatedNumber } from "@/components/core/animated-number";
import { Denominator } from "@/components/core/denominator";
import { Hint } from "@/components/core/hint";
import { MeterBar } from "@/components/core/meter-bar";
import { ProgressRing } from "@/components/core/progress-ring";
import { Button } from "@/components/ui/button";
import { decimal, int, percent, plural } from "@/lib/format";
import { press, staggerContainer, staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { FunilDetalhado } from "@/features/indicadores/components/funil-detalhado";
import { GraficoLinha } from "@/features/indicadores/components/grafico-linha";
import { GraficoRosca, type FatiaRosca } from "@/features/indicadores/components/grafico-rosca";
import { definicaoDe } from "@/features/indicadores/domain/definicoes";
import {
   distribuicaoProtocolos,
   indicadorPorId,
   ROTULO_GRUPO_PROTOCOLO,
   variacaoDaSerie,
   type GrupoProtocolo,
} from "@/features/indicadores/domain/destaques";
import { formatarValor } from "@/features/indicadores/domain/formato";
import type { Indicador, Indicadores } from "@/features/indicadores/types/indicadores.schema";

const COR_GRUPO: Record<GrupoProtocolo, Pick<FatiaRosca, "fill" | "ponto">> = {
   analise: { fill: "fill-viz-1", ponto: "bg-viz-1" },
   matricula: { fill: "fill-viz-2", ponto: "bg-viz-2" },
   matriculados: { fill: "fill-viz-3", ponto: "bg-viz-3" },
   encerrados: { fill: "fill-ink-4", ponto: "bg-ink-4" },
};

type Abrir = (id: string) => void;

export function Destaques({ dados, onAbrir }: { dados: Indicadores; onAbrir: Abrir }) {
   const ind = (id: string) => indicadorPorId(dados, id);
   const conversao = ind("conversao");
   const sla = ind("sla-cumprido");
   const atrasados = ind("atrasados-agora");
   const contato = ind("primeiro-contato");
   const csat = ind("csat");
   const perdas = ind("perdas");

   return (
      <div className="space-y-3">
         <div className="grid gap-3 xl:grid-cols-12">
            {conversao ? <HeroiConversao indicador={conversao} onAbrir={onAbrir} /> : null}
            <Protocolos dados={dados} className={conversao ? "xl:col-span-4" : "xl:col-span-12"} />
         </div>

         <motion.div variants={staggerContainer} initial="initial" animate="animate" className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {sla ? (
               <Leitura indicador={sla} onAbrir={onAbrir}>
                  <div className="flex items-center gap-3.5">
                     <ProgressRing value={sla.valor ?? 0} size={58} thickness={7} label={`${rotuloValor(sla)} no prazo`} />
                     <div className="min-w-0">
                        <Valor indicador={sla} />
                        <BaseCurta numerador={sla.numerador} denominador={sla.denominador} rotulo="saídas no prazo" />
                     </div>
                  </div>
               </Leitura>
            ) : null}
            {atrasados ? (
               <Leitura indicador={atrasados} onAbrir={onAbrir}>
                  <p className="flex items-baseline gap-2">
                     <span className="text-[28px] leading-none font-semibold tracking-tight text-crit-ink">
                        {int(atrasados.numerador ?? 0)}
                     </span>
                     <span className="text-[12px] text-ink-3">
                        de {int(atrasados.denominador ?? 0)} ativos · {rotuloValor(atrasados)}
                     </span>
                  </p>
                  <MeterBar
                     value={atrasados.valor ?? 0}
                     tone="crit"
                     height={6}
                     label={`${rotuloValor(atrasados)} atrasados`}
                     className="mt-3"
                  />
                  <MaiorParte indicador={atrasados} />
               </Leitura>
            ) : null}
            {contato ? (
               <Leitura indicador={contato} rotulo="Tempo até o primeiro contato" onAbrir={onAbrir}>
                  <Valor indicador={contato} sufixo="mediana" />
                  <DentroDoPrazo indicador={contato} />
               </Leitura>
            ) : null}
            {csat ? (
               <Leitura indicador={csat} rotulo="Satisfação até a matrícula" onAbrir={onAbrir}>
                  <div className="flex items-end justify-between gap-3">
                     <div className="min-w-0">
                        <Valor indicador={csat} />
                        <BaseCurta numerador={csat.numerador} denominador={csat.denominador} rotulo="notas 4 ou 5" />
                     </div>
                     <Notas indicador={csat} />
                  </div>
               </Leitura>
            ) : null}
         </motion.div>

         <div className="grid gap-3 xl:grid-cols-12">
            <section aria-labelledby="ind-funil" className="space-y-2 xl:col-span-7">
               <h3 id="ind-funil" className="px-1 text-[12px] font-semibold text-ink-3">
                  Funil por etapa
               </h3>
               <FunilDetalhado funil={dados.funil} />
            </section>
            {perdas ? <MotivosPerda indicador={perdas} onAbrir={onAbrir} /> : null}
         </div>
      </div>
   );
}

// ── Conversão (herói) ─────────────────────────────────────────────────────────────────────────

function HeroiConversao({ indicador: i, onAbrir }: { indicador: Indicador; onAbrir: Abrir }) {
   const variacao = variacaoDaSerie(i);
   return (
      <section aria-labelledby="ind-heroi" className="flex flex-col rounded-xl bg-card p-5 xl:col-span-8">
         <header className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-1.5">
               <h3 id="ind-heroi" className="text-[13px] font-semibold text-ink">
                  Conversão em matrícula
               </h3>
               <Hint label="conversão em matrícula">{definicaoDe(i)}</Hint>
            </div>
            <Button variant="ghost" size="xs" iconRight={<ArrowUpRight aria-hidden />} onClick={() => onAbrir(i.id)}>
               Ver detalhe
            </Button>
         </header>
         <div className="mt-3 grid flex-1 items-center gap-6 lg:grid-cols-[210px_minmax(0,1fr)]">
            <div className="space-y-2.5 pb-1">
               {i.valor === null ? (
                  <p className="text-[15px] font-medium text-ink-4">Sem dados no recorte</p>
               ) : (
                  <AnimatedNumber
                     value={i.valor}
                     format={v => percent(v, 1)}
                     countUp={false}
                     className="block text-[52px] leading-none font-semibold tracking-[-0.03em] text-brand-text"
                  />
               )}
               {i.numerador !== null && i.denominador !== null ? (
                  <Denominator
                     numerator={i.numerador}
                     numeratorLabel={i.numeradorRotulo ?? undefined}
                     denominator={i.denominador}
                     denominatorLabel={i.denominadorRotulo ?? undefined}
                  />
               ) : null}
               {variacao !== null ? (
                  <p className="text-[12px] text-ink-3">
                     <span className={cn("font-mono font-medium", variacao >= 0 ? "text-ink" : "text-crit-ink")}>
                        {variacao >= 0 ? "+" : "−"}
                        {decimal(Math.abs(variacao) * 100, 1)} p.p.
                     </span>{" "}
                     em {plural(i.serie.length, "semana", "semanas")}
                  </p>
               ) : null}
               {i.meta ? <p className="text-[11.5px] text-ink-3">Meta: {i.meta}</p> : null}
            </div>
            <div className="min-w-0">
               <p className="mb-1 text-[11px] text-ink-4">Índice semanal de conversão</p>
               <GraficoLinha serie={i.serie} unidade={i.unidade} rotulo="Conversão em matrícula por semana" altura={170} />
            </div>
         </div>
      </section>
   );
}

// ── Onde estão os protocolos (rosca) ──────────────────────────────────────────────────────────

function Protocolos({ dados, className }: { dados: Indicadores; className?: string }) {
   const d = distribuicaoProtocolos(dados.funil);
   const fatias: FatiaRosca[] = d.grupos.map(g => ({
      id: g.grupo,
      rotulo: ROTULO_GRUPO_PROTOCOLO[g.grupo],
      valor: g.total,
      ...COR_GRUPO[g.grupo],
   }));
   const descricao = `Onde estão os ${plural(d.total, "protocolo", "protocolos")}: ${d.grupos
      .map(g => `${ROTULO_GRUPO_PROTOCOLO[g.grupo]} ${int(g.total)} (${percent(g.fracao, 0)})`)
      .join(", ")}.`;
   return (
      <section aria-labelledby="ind-protocolos" className={cn("flex flex-col rounded-xl bg-card p-5", className)}>
         <h3 id="ind-protocolos" className="text-[13px] font-semibold text-ink">
            Onde estão os protocolos
         </h3>
         <p className="mt-0.5 text-[11.5px] text-ink-3">Em análise vai do rascunho ao ajuste; encerrados são perdidos e cancelados</p>
         <div className="mt-4 flex flex-1 items-center">
            <GraficoRosca fatias={fatias} rotuloTotal="protocolos" descricao={descricao} tamanho={150} />
         </div>
         {d.adiados > 0 ? (
            <p className="mt-3 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
               {plural(d.adiados, "protocolo adiado fica", "protocolos adiados ficam")} fora da conta
            </p>
         ) : null}
      </section>
   );
}

// ── Leituras rápidas ──────────────────────────────────────────────────────────────────────────

function Leitura({
   indicador: i,
   rotulo,
   onAbrir,
   children,
}: {
   indicador: Indicador;
   rotulo?: string;
   onAbrir: Abrir;
   children: ReactNode;
}) {
   const titulo = rotulo ?? i.rotulo;
   return (
      <motion.article
         variants={staggerItem}
         className="group relative flex flex-col rounded-xl bg-card p-4 transition-colors hover:bg-surface-hover"
      >
         <div className="mb-3 flex items-start justify-between gap-2">
            <h3 className="text-[12px] font-medium text-ink-3">{titulo}</h3>
            <Hint label={titulo.toLowerCase()} align="right" className="relative z-10">
               {definicaoDe(i)}
            </Hint>
         </div>
         {children}
         <motion.button
            type="button"
            whileTap={press}
            onClick={() => onAbrir(i.id)}
            aria-label={`${titulo}: ${rotuloValor(i)}. Abrir detalhe`}
            className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-focus"
         />
      </motion.article>
   );
}

function rotuloValor(i: Indicador): string {
   return i.valor === null ? "sem dados" : formatarValor(i.unidade, i.valor);
}

function Valor({ indicador: i, sufixo }: { indicador: Indicador; sufixo?: string }) {
   return (
      <p className="flex items-baseline gap-1.5">
         <span className="text-[24px] leading-none font-semibold tracking-tight text-ink">{rotuloValor(i)}</span>
         {sufixo ? <span className="text-[11.5px] text-ink-3">{sufixo}</span> : null}
      </p>
   );
}

function BaseCurta({ numerador, denominador, rotulo }: { numerador: number | null; denominador: number | null; rotulo: string }) {
   if (numerador === null || denominador === null) return null;
   return <Denominator numerator={numerador} numeratorLabel={rotulo} denominator={denominador} className="mt-1.5 text-[11.5px]" />;
}

/** A etapa que mais concentra a medida (ex.: onde estão os atrasados). */
function MaiorParte({ indicador: i }: { indicador: Indicador }) {
   const maior = [...i.composicao].sort((a, b) => b.valor - a.valor)[0];
   if (!maior || maior.valor === 0) return <p className="mt-2 text-[11.5px] text-ink-3">Nenhum caso atrasado agora</p>;
   return (
      <p className="mt-2 text-[11.5px] text-ink-3">
         Mais atrasados em <span className="font-medium text-ink-2">{maior.rotulo.toLowerCase()}</span> ({int(maior.valor)})
      </p>
   );
}

/** Primeiro contato: quantos saíram dentro do prazo, como proporção. */
function DentroDoPrazo({ indicador: i }: { indicador: Indicador }) {
   const [dentro, fora] = i.composicao;
   if (!dentro) return null;
   const total = dentro.valor + (fora?.valor ?? 0);
   const fracao = total > 0 ? dentro.valor / total : 0;
   return (
      <div className="mt-3 space-y-1.5">
         <MeterBar value={fracao} tone="ink" height={6} label={`${int(dentro.valor)} de ${int(total)} dentro do prazo`} />
         <Denominator
            numerator={dentro.valor}
            numeratorLabel="no prazo"
            denominator={total}
            denominatorLabel="propostas"
            className="text-[11.5px]"
         />
      </div>
   );
}

/** Distribuição das notas (1 a 5) em colunas pequenas; a nota 4 e 5 ganham a cor. */
function Notas({ indicador: i }: { indicador: Indicador }) {
   const notas = [...i.composicao].reverse(); // vem de 5 a 1; o gráfico lê de 1 a 5
   const maior = Math.max(1, ...notas.map(n => n.valor));
   return (
      <div aria-hidden className="flex h-11 shrink-0 items-end gap-1">
         {notas.map((n, idx) => (
            <div key={n.rotulo} className="flex flex-col items-center gap-1">
               <span
                  className={cn("w-2.5 rounded-t-[3px]", idx >= notas.length - 2 ? "bg-brand" : "bg-ink-4/50")}
                  style={{ height: Math.max(2, (n.valor / maior) * 30) }}
               />
               <span className="font-mono text-[9.5px] leading-none text-ink-4">{idx + 1}</span>
            </div>
         ))}
      </div>
   );
}

// ── Motivos de perda ──────────────────────────────────────────────────────────────────────────

function MotivosPerda({ indicador: i, onAbrir }: { indicador: Indicador; onAbrir: Abrir }) {
   const linhas = [...i.composicao].sort((a, b) => b.valor - a.valor).slice(0, 6);
   const maior = Math.max(1, ...linhas.map(l => l.valor));
   return (
      <section aria-labelledby="ind-perdas" className="space-y-2 xl:col-span-5">
         <div className="flex items-baseline justify-between gap-3 px-1">
            <h3 id="ind-perdas" className="text-[12px] font-semibold text-ink-3">
               Por que perdemos
            </h3>
            <Button variant="ghost" size="xs" onClick={() => onAbrir(i.id)}>
               Ver detalhe
            </Button>
         </div>
         <div className="rounded-xl bg-card p-4">
            <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
               <span className="text-[20px] leading-none font-semibold tracking-tight text-ink">{rotuloValor(i)}</span>
               {i.numerador !== null && i.denominador !== null ? (
                  <Denominator
                     numerator={i.numerador}
                     numeratorLabel={i.numeradorRotulo ?? undefined}
                     denominator={i.denominador}
                     denominatorLabel={i.denominadorRotulo ?? undefined}
                  />
               ) : null}
            </p>
            {linhas.length === 0 ? (
               <p className="mt-3 text-[12.5px] text-ink-3">Nenhuma perda registrada no recorte.</p>
            ) : (
               <ul className="mt-3.5 space-y-2.5">
                  {linhas.map(l => (
                     <li key={l.rotulo} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
                        <span className="truncate text-[12.5px] text-ink-2">{l.rotulo}</span>
                        <span className="font-mono text-[12px] font-medium text-ink tabular-nums">{int(l.valor)}</span>
                        <MeterBar
                           value={l.valor / maior}
                           tone="ink"
                           height={5}
                           label={`${l.rotulo}: ${int(l.valor)}`}
                           className="col-span-2"
                        />
                     </li>
                  ))}
               </ul>
            )}
         </div>
      </section>
   );
}
