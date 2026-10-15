/**
 * Jornada (docs/05 §3.2): stepper horizontal com as etapas do TIPO do caso (interna não mostra
 * Documentos; coordenação só aparece quando aconteceu). Concluída: ponto preenchido + data curta.
 * Atual: anel azul + prazo. Futura: ponto vazio. Quem fez e quando aparece no Hint (hover e foco).
 */
import { Hint } from "@/components/core/hint";
import { shortDate, stamp } from "@/lib/format";
import { cn } from "@/lib/utils";

import { etapasDaJornada } from "@/features/casos/domain/caso.machine";
import { Prazo } from "@/features/casos/components/prazo";
import { ROTULO_ETAPA, type CasoDetalhe, type Etapa } from "@/features/casos/types/caso.schema";

interface Passo {
   chave: string;
   rotulo: string;
   etapas: readonly Etapa[];
}

const FINAIS: readonly Etapa[] = ["PERDIDO", "CANCELADO", "ADIADO"];

function passosDoCaso(caso: CasoDetalhe): Passo[] {
   const visitadas = new Set(caso.jornada.map(p => p.etapa));
   const base = etapasDaJornada({ tipo: caso.tipo, estudouForaNoPeriodo: caso.origem.estudouForaNoPeriodo ?? null });
   const passos: Passo[] = [{ chave: "protocolo", rotulo: "Protocolo", etapas: ["RASCUNHO"] }];
   for (const etapa of base) {
      if (etapa === "AGUARDANDO_COORDENACAO") {
         if (visitadas.has("AGUARDANDO_COORDENACAO")) passos.push({ chave: etapa, rotulo: "Coordenação", etapas: [etapa] });
         if (visitadas.has("AJUSTE_POS_COORDENACAO"))
            passos.push({ chave: "AJUSTE_POS_COORDENACAO", rotulo: "Ajuste", etapas: ["AJUSTE_POS_COORDENACAO"] });
         continue;
      }
      if (etapa === "PROPOSTA_ENVIADA") {
         passos.push({
            chave: etapa,
            rotulo: caso.etapa === "EM_NEGOCIACAO" ? "Em conversa" : "Proposta",
            etapas: ["PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
         });
         continue;
      }
      passos.push({ chave: etapa, rotulo: etapa === "PRONTO_PARA_MATRICULA" ? "Matrícula" : ROTULO_ETAPA[etapa], etapas: [etapa] });
   }
   if (FINAIS.includes(caso.etapa)) passos.push({ chave: caso.etapa, rotulo: ROTULO_ETAPA[caso.etapa], etapas: [caso.etapa] });
   return passos;
}

export function JornadaCaso({ caso, agora }: { caso: CasoDetalhe; agora: Date }) {
   const passos = passosDoCaso(caso);
   const atual = passos.findIndex(p => p.etapas.includes(caso.etapa));
   const indiceAtual = atual < 0 ? 0 : atual;
   const registro = (p: Passo) =>
      [...caso.jornada].reverse().find(j => p.etapas.includes(j.etapa)) ??
      (p.chave === "protocolo" ? { entrouEm: caso.criadoEm, por: caso.responsaveis.consultor } : null);

   return (
      <ol aria-label="Jornada do caso" className="scroll-slim flex items-start overflow-x-auto pb-1">
         {passos.map((p, i) => {
            const desfecho = caso.etapa === "MATRICULADO" || caso.etapa === "CONCLUIDO";
            const feito = i < indiceAtual || (i === indiceAtual && desfecho);
            const corrente = i === indiceAtual && !desfecho;
            const final = FINAIS.includes(caso.etapa) && i === passos.length - 1;
            const reg = registro(p);
            const rotulo = p.chave === "EM_ANALISE" && caso.reanalises > 0 ? `${p.rotulo} · ${caso.reanalises + 1}ª análise` : p.rotulo;
            return (
               <li key={p.chave} aria-current={corrente ? "step" : undefined} className="flex min-w-[92px] flex-1 flex-col">
                  <div className="flex items-center">
                     <span
                        aria-hidden
                        className={cn(
                           "size-2.5 shrink-0 rounded-full",
                           feito
                              ? "bg-ink-3"
                              : corrente
                                ? final
                                   ? "bg-ink-4"
                                   : "bg-brand ring-4 ring-brand-soft"
                                : "border-[1.5px] border-hairline-strong",
                        )}
                     />
                     {i < passos.length - 1 ? (
                        <span aria-hidden className={cn("mx-1 h-px flex-1", i < indiceAtual ? "bg-ink-4" : "bg-hairline")} />
                     ) : null}
                  </div>
                  <div className="mt-1.5 pr-2">
                     {reg ? (
                        <Hint
                           label={p.rotulo}
                           triggerLabel={`${p.rotulo}: detalhes`}
                           trigger={
                              <span
                                 className={cn(
                                    "text-[12px] whitespace-nowrap",
                                    corrente ? "font-semibold text-ink" : feito ? "font-medium text-ink-2" : "text-ink-4",
                                 )}
                              >
                                 {rotulo}
                              </span>
                           }
                        >
                           Entrou {stamp(reg.entrouEm, agora).toLowerCase()}
                           {reg.por ? ` · ${reg.por.nome}` : " · sistema"}
                        </Hint>
                     ) : (
                        <span className="text-[12px] whitespace-nowrap text-ink-4">{rotulo}</span>
                     )}
                     <div className="mt-0.5 h-4">
                        {corrente && !final ? (
                           <Prazo sla={caso.sla} agora={agora} />
                        ) : feito && reg ? (
                           <span className="font-mono text-[10.5px] text-ink-4">{shortDate(reg.entrouEm)}</span>
                        ) : null}
                     </div>
                  </div>
               </li>
            );
         })}
      </ol>
   );
}
