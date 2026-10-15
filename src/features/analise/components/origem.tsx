/**
 * Peças de leitura da origem, usadas pela linha da grade, pelo modo coordenação e pelos modais:
 *
 * - Origem em uma linha: nome · IES · ano/semestre · CH · nota (docs/06 §2). Leitura do histórico
 *   com `confiancaExtracao` baixa destaca CH e nota para conferência no documento (docs/07 §3.5).
 * - Comparação de CH SEMPRE com denominador ("48 h ÷ 60 h"); abaixo do mínimo de
 *   `REGRAS_ANALISE.chMinimaPercentual` vira `text-crit-ink` e diz por quê.
 * - Ementas lado a lado: a do destino vem da matriz; a da origem não é extraída pela pré-análise,
 *   então o texto manda conferir o plano de ensino (nunca um campo vazio sem explicação).
 */
import { CornerDownRight } from "lucide-react";
import type { ReactNode } from "react";

import { Denominator } from "@/components/core/denominator";
import { MeterBar } from "@/components/core/meter-bar";
import { REGRAS_ANALISE } from "@/features/casos";
import { decimal, horas, percent } from "@/lib/format";
import { cn } from "@/lib/utils";

import { anoSemestre, compararCh, extracaoBaixa, somarCh } from "@/features/analise/domain/analise.domain";
import { ROTULO_SITUACAO_ORIGEM, type ItemAnalise, type ItemOrigem } from "@/features/analise/types/analise.schema";

function Conferir({ baixa, children }: { baixa: boolean; children: ReactNode }) {
   if (!baixa) return <>{children}</>;
   return (
      <mark className="rounded-xs bg-warn-soft px-1 text-warn-ink">
         {children}
         <span className="sr-only"> (leitura com baixa confiança: conferir no histórico)</span>
      </mark>
   );
}

/** "Teoria geral da administração · IES X · 2024/1 · 60 h · nota 8,5" */
export function OrigemLinha({ origem: o, className }: { origem: ItemOrigem; className?: string }) {
   const baixa = extracaoBaixa(o);
   return (
      <span className={cn("text-[12px] text-ink-3", className)}>
         <span className="text-ink-2">{o.nome}</span>
         {" · "}
         {o.ies ?? "IES não informada"}
         {" · "}
         <span className="font-mono">{anoSemestre(o)}</span>
         {" · "}
         <Conferir baixa={baixa}>
            <span className="font-mono">{horas(o.ch)}</span>
         </Conferir>
         {" · "}
         <Conferir baixa={baixa}>{o.nota === null ? "sem nota" : <span className="font-mono">nota {decimal(o.nota)}</span>}</Conferir>
         {o.situacao !== "APROVADO" ? <span className="text-crit-ink"> · {ROTULO_SITUACAO_ORIGEM[o.situacao].toLowerCase()}</span> : null}
         {baixa ? <span className="text-warn-ink"> · conferir no histórico</span> : null}
      </span>
   );
}

export function ComparacaoCh({ origens, chDestino, className }: { origens: readonly ItemOrigem[]; chDestino: number; className?: string }) {
   const c = compararCh(somarCh(origens), chDestino);
   const rotulo = `${horas(c.chOrigem)} de ${horas(c.chDestino)}`;
   return (
      <span className={cn("inline-flex items-center gap-2", className)}>
         <MeterBar value={c.razao} tone={c.abaixoDoMinimo ? "crit" : "ink"} height={3} label={rotulo} className="w-14 shrink-0" />
         <Denominator
            numerator={c.chOrigem}
            denominator={c.chDestino}
            format={horas}
            className={cn(c.abaixoDoMinimo && "font-semibold [&_span]:text-crit-ink")}
         />
         {c.abaixoDoMinimo ? (
            <span className="text-[11.5px] font-medium text-crit-ink">
               abaixo do mínimo de {percent(REGRAS_ANALISE.chMinimaPercentual, 0)}
            </span>
         ) : null}
      </span>
   );
}

/** Lista de origens com seta de "vem de". Uma origem: inline; várias: o chamador decide expandir. */
export function OrigensDoItem({ origens }: { origens: readonly ItemOrigem[] }) {
   return (
      <ul className="space-y-0.5">
         {origens.map(o => (
            <li key={o.id} className="flex items-start gap-1.5">
               <CornerDownRight aria-hidden className="mt-0.5 size-3 shrink-0 text-ink-4" />
               <OrigemLinha origem={o} />
            </li>
         ))}
      </ul>
   );
}

export function EmentasLadoALado({ item, origens, className }: { item: ItemAnalise; origens: readonly ItemOrigem[]; className?: string }) {
   return (
      <div className={cn("grid gap-3 rounded-lg bg-surface-2 p-3 sm:grid-cols-2", className)}>
         <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-ink-3">Destino</p>
            <p className="mt-1 text-[12.5px] font-medium text-ink">
               {item.disciplina} <span className="font-mono text-[12px] font-normal text-ink-3">{horas(item.ch)}</span>
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-ink-2">
               {item.ementa ?? "Ementa não cadastrada na matriz. Consulte o plano de ensino do curso."}
            </p>
         </div>
         <div className="min-w-0">
            <p className="text-[11.5px] font-semibold text-ink-3">Origem</p>
            {origens.length === 0 ? (
               <p className="mt-1 text-[12px] text-ink-3">Nenhuma disciplina de origem associada a este item.</p>
            ) : (
               <>
                  <div className="mt-1">
                     <OrigensDoItem origens={origens} />
                  </div>
                  <p className="mt-1 text-[12px] leading-relaxed text-ink-3">
                     A pré-análise não extrai a ementa da origem: confira o plano de ensino na aba Documentos.
                  </p>
               </>
            )}
            {item.sugestao?.justificativa ? (
               <p className="mt-2 text-[12px] leading-relaxed text-ink-2">
                  <span className="font-medium text-ink">Por que a sugestão: </span>
                  {item.sugestao.justificativa}
               </p>
            ) : null}
         </div>
      </div>
   );
}
