/**
 * Card "Próximo passo" (docs/05 §3.3), o elemento mais importante da tela: uma frase no formato
 * [o que falta] · [com quem] · [prazo] e NO MÁXIMO uma ação primária, a do papel logado. Ação
 * desabilitada sempre diz por quê, em texto abaixo do botão (não só tooltip). Atalho E dispara a
 * primária (sempre por confirmação quando a ação é irreversível).
 */
import { ArrowRight, PauseCircle } from "lucide-react";

import { Kbd } from "@/components/core/kbd";
import { Button } from "@/components/ui/button";
import { useAtalho } from "@/hooks/use-atalho";
import { cn } from "@/lib/utils";
import { registrarUi } from "@/services/telemetria";

import type { NomeAcao } from "@/features/casos/domain/acoes";
import { calcularProximoPasso, rotuloPendencia, type AcaoPasso, type Destino } from "@/features/casos/domain/proximo-passo";
import { tomDaAcao, tomDaEtapa } from "@/features/casos/domain/filas";
import { MaisAcoes } from "@/features/casos/components/painel/mais-acoes";
import { registrarDesabilitada } from "@/features/casos/components/painel/use-acoes-do-caso";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import type { CasoDetalhe } from "@/features/casos/types/caso.schema";

const TOM_PRAZO = {
   NO_PRAZO: "text-ink-3",
   ATENCAO: "font-medium text-warn-ink",
   ESTOURADO: "font-semibold text-crit-ink",
   PAUSADO: "text-ink-4",
   SEM_SLA: "text-ink-4",
} as const;

const SOBRE_DISCIPLINAS = /disciplina|pergunta|período|atividade|origem/i;

interface ProximoPassoCardProps {
   caso: CasoDetalhe;
   meuId: string;
   agora: Date;
   ocupado: boolean;
   onExecutar: (acao: NomeAcao, ir?: Destino) => void;
}

export function ProximoPassoCard({ caso, meuId, agora, ocupado, onExecutar }: ProximoPassoCardProps) {
   const { irPara } = useCasosUrlState();
   const passo = calcularProximoPasso(caso, { id: meuId }, agora);
   const pendencia = rotuloPendencia(caso, agora);

   function disparar(a: AcaoPasso) {
      if (!a.habilitada) {
         registrarDesabilitada(a.acao, a.motivos[0]);
         return;
      }
      onExecutar(a.acao, a.ir);
   }

   useAtalho(
      "e",
      () => {
         if (!passo.primaria) return;
         registrarUi("ui.atalho_usado", { tecla: "E" });
         disparar(passo.primaria);
      },
      { enabled: !!passo.primaria },
   );

   const excluir = [passo.primaria?.acao, passo.secundaria?.acao].filter(Boolean) as NomeAcao[];
   const bloqueada = passo.primaria && !passo.primaria.habilitada ? passo.primaria : null;

   return (
      <section
         aria-labelledby="proximo-passo-titulo"
         data-tom={tomDaEtapa(caso.etapa)}
         className="caso-proximo-passo rounded-xl bg-brand-soft p-4 print:hidden"
      >
         <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0">
               <h2 id="proximo-passo-titulo" className="text-[12px] font-semibold text-brand-text">
                  Próximo passo
               </h2>
               <p className="mt-1 text-[15px] leading-snug font-semibold text-ink">{passo.oQue}</p>
               <p className="mt-1 flex flex-wrap items-baseline gap-x-1.5 text-[12.5px] text-ink-2">
                  <span>{passo.comQuem}</span>
                  {passo.prazo ? (
                     <>
                        <span aria-hidden className="text-ink-4">
                           ·
                        </span>
                        <span className={cn("font-mono text-[12px]", TOM_PRAZO[passo.prazo.estado])}>{passo.prazo.texto}</span>
                     </>
                  ) : null}
               </p>
               {pendencia ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-3">
                     <PauseCircle aria-hidden className="size-3.5" />
                     Pausado: {pendencia}
                  </p>
               ) : null}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
               {passo.secundaria ? (
                  <Button
                     size="sm"
                     variant="secondary"
                     aria-disabled={!passo.secundaria.habilitada}
                     className="acao-destaque"
                     data-tom={tomDaAcao(passo.secundaria.acao)}
                     onClick={() => passo.secundaria && disparar(passo.secundaria)}
                     disabled={ocupado}
                  >
                     {passo.secundaria.rotulo}
                  </Button>
               ) : null}
               {passo.primaria ? (
                  <Button
                     size="md"
                     variant="primary"
                     aria-disabled={!passo.primaria.habilitada}
                     aria-describedby={bloqueada ? "proximo-passo-bloqueio" : undefined}
                     className="acao-destaque"
                     data-tom={tomDaAcao(passo.primaria.acao)}
                     onClick={() => passo.primaria && disparar(passo.primaria)}
                     disabled={ocupado}
                     iconRight={passo.primaria.ir ? <ArrowRight aria-hidden /> : undefined}
                  >
                     {passo.primaria.rotulo}
                     <Kbd className="ml-1 hidden bg-white/15 text-on-brand lg:inline-flex">E</Kbd>
                  </Button>
               ) : null}
               <MaisAcoes caso={caso} excluir={excluir} onExecutar={a => onExecutar(a)} />
            </div>
         </div>
         {bloqueada ? (
            <div id="proximo-passo-bloqueio" className="mt-3 border-t border-hairline pt-3">
               <p className="text-[12px] font-medium text-ink-2">Para {bloqueada.rotulo.toLowerCase()}:</p>
               <ul className="mt-1 space-y-0.5">
                  {bloqueada.motivos.map(m => (
                     <li key={m} className="text-[12px] text-ink-3">
                        {SOBRE_DISCIPLINAS.test(m) ? (
                           <button
                              type="button"
                              onClick={() =>
                                 irPara({ aba: "analise", extras: { filtro: /pergunta/i.test(m) ? "coordenacao" : "pendentes" } })
                              }
                              className="text-left underline decoration-hairline-strong underline-offset-2 transition-colors hover:text-ink"
                           >
                              {m}
                           </button>
                        ) : (
                           m
                        )}
                     </li>
                  ))}
               </ul>
            </div>
         ) : passo.secundaria && !passo.secundaria.habilitada && passo.secundaria.motivos[0] ? (
            <p className="mt-2 text-[12px] text-ink-3">
               {passo.secundaria.rotulo} indisponível. {passo.secundaria.motivos[0]}.
            </p>
         ) : null}
      </section>
   );
}
