/**
 * Resumo congelado (docs/03 CONCLUIR_ANALISE): é a versão da análise que vai para o candidato. Não
 * muda quando alguém mexe na análise depois; só uma reanálise gera outro. Aproveitamento sempre com
 * denominador (CH dispensada ÷ CH do curso) e previsão sempre rotulada como estimativa.
 */
import { Snowflake } from "lucide-react";

import { Denominator } from "@/components/core/denominator";
import { Hint } from "@/components/core/hint";
import { NAO_INFORMADO } from "@/components/core/data-list";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { int, stamp } from "@/lib/format";

import type { ResumoAnalise } from "@/features/analise";
import { ROTULO_DECISAO, type DecisaoItem } from "@/features/casos";

import { textoAproveitamento, textoPeriodoIngresso, textoPrevisao } from "@/features/proposta/domain/proposta";

interface ResumoCongeladoProps {
   resumo: ResumoAnalise | null;
   congeladoEm: string | null;
   agora: Date;
}

const ORDEM: readonly { chave: keyof ResumoAnalise["contagem"]; decisao: DecisaoItem }[] = [
   { chave: "dispensa", decisao: "DISPENSA" },
   { chave: "regular", decisao: "REGULAR" },
   { chave: "dp", decisao: "DP" },
   { chave: "adap", decisao: "ADAP" },
];

export function ResumoCongelado({ resumo, congeladoEm, agora }: ResumoCongeladoProps) {
   const aproveitamento = resumo ? textoAproveitamento(resumo) : null;
   const periodo = resumo ? textoPeriodoIngresso(resumo) : null;
   return (
      <Surface aria-label="Resumo para o candidato">
         <SurfaceHeader
            title="Resumo para o candidato"
            subtitle={
               <span className="inline-flex items-center gap-1.5">
                  <Snowflake className="size-3.5 text-ink-4" aria-hidden />
                  {congeladoEm
                     ? `Congelado em ${stamp(congeladoEm, agora).toLowerCase()}, na conclusão da análise`
                     : "Congelado na conclusão da análise"}
               </span>
            }
         />
         {resumo ? (
            <div className="mt-5 grid gap-6 sm:grid-cols-[1.1fr_1fr]">
               <div>
                  <p className="text-[12px] font-medium text-ink-3">Aproveitamento</p>
                  <p className="mt-1 text-[24px] leading-none font-semibold tracking-[-0.02em] text-ink tabular-nums">
                     {aproveitamento ?? NAO_INFORMADO}
                  </p>
                  <Denominator
                     className="mt-2"
                     numerator={resumo.chDispensada}
                     numeratorLabel="h dispensadas"
                     denominator={resumo.chTotalMatriz}
                     denominatorLabel="h do curso"
                  />
               </div>
               <dl className="grid grid-cols-4 gap-3">
                  {ORDEM.map(o => (
                     <div key={o.chave} className="min-w-0">
                        <dt className="text-[11px] font-medium text-ink-4">{ROTULO_DECISAO[o.decisao]}</dt>
                        <dd className="mt-0.5 font-mono text-[15px] font-semibold text-ink">{int(resumo.contagem[o.chave])}</dd>
                     </div>
                  ))}
               </dl>
               <div className="grid gap-4 border-t border-hairline pt-4 sm:col-span-2 sm:grid-cols-2">
                  <div>
                     <p className="text-[11px] font-medium text-ink-4">Período de ingresso</p>
                     <p className="mt-0.5 text-[13px] font-medium text-ink">{periodo ?? NAO_INFORMADO}</p>
                  </div>
                  <div>
                     <p className="flex items-center gap-1 text-[11px] font-medium text-ink-4">
                        Conclusão do curso
                        <Hint label="Como a previsão é calculada">
                           Considera as disciplinas regulares, DP e ADAP que faltam e a oferta usual por semestre. Não é promessa: depende
                           da oferta de disciplinas.
                        </Hint>
                     </p>
                     <p className="mt-0.5 text-[13px] font-medium text-ink">{textoPrevisao(resumo.previsaoSemestres)}</p>
                     <p className="mt-0.5 text-[11.5px] text-ink-4">Depende da oferta de disciplinas.</p>
                  </div>
               </div>
            </div>
         ) : (
            <p className="mt-4 text-[12.5px] text-ink-3">
               O resumo congelado não veio com a proposta. Recarregue o caso; se continuar, avise o suporte.
            </p>
         )}
      </Surface>
   );
}
