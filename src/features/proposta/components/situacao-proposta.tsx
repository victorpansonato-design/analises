/**
 * Situação da proposta: quando foi enviada, o que o candidato respondeu e o aceite. Em "Proposta
 * enviada" mostra a régua automática (próximo lembrete e o dia em que, sem retorno, o caso encerra
 * como perdido) para ninguém precisar de campo manual de "próximo contato" (docs/05 §10).
 *
 * As ações aqui são SECUNDÁRIAS: a primária do caso mora no card "Próximo passo". Cada botão só
 * aparece se a API devolveu a ação; desabilitado, o motivo fica escrito embaixo.
 */
import { CalendarClock, GraduationCap, MessageSquareReply, Send } from "lucide-react";
import type { ReactNode } from "react";

import { DataList } from "@/components/core/data-list";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { Button } from "@/components/ui/button";
import { shortDate, stamp } from "@/lib/format";

import {
   ROTULO_CANAL_ACEITE,
   proximoLembreteProposta,
   semRetornoEm,
   tomDaAcao,
   type CanalAceite,
   type CasoDetalhe,
} from "@/features/casos";

import { rotuloCanalResposta, type BotaoProposta } from "@/features/proposta/domain/proposta";
import { ROTULO_TIPO_RESPOSTA, type AcaoProposta, type Proposta } from "@/features/proposta/types/proposta.schema";

interface SituacaoPropostaProps {
   caso: CasoDetalhe;
   proposta: Proposta;
   botoes: readonly BotaoProposta[];
   onAcao: (acao: AcaoProposta) => void;
   agora: Date;
}

const ICONE: Record<AcaoProposta, ReactNode> = {
   ENVIAR_PROPOSTA: <Send />,
   REGISTRAR_RESPOSTA: <MessageSquareReply />,
   EFETIVAR_MATRICULA: <GraduationCap />,
};

function rotuloCanalAceite(canal: string): string {
   return ROTULO_CANAL_ACEITE[canal as CanalAceite] ?? canal;
}

export function SituacaoProposta({ caso, proposta, botoes, onAcao, agora }: SituacaoPropostaProps) {
   const { resposta, aceite } = proposta;
   const aguardando = caso.etapa === "PROPOSTA_ENVIADA";
   const lembrete = aguardando ? proximoLembreteProposta(caso.etapaDesde, agora) : null;
   const encerraEm = aguardando ? semRetornoEm(caso.etapaDesde) : null;

   return (
      <Surface aria-label="Situação da proposta">
         <SurfaceHeader title="Situação" />
         <DataList
            className="mt-4"
            columns={3}
            items={[
               { label: "Enviada", value: proposta.enviadaEm ? stamp(proposta.enviadaEm, agora) : "Ainda não enviada" },
               {
                  label: "Resposta do candidato",
                  value: resposta
                     ? `${ROTULO_TIPO_RESPOSTA[resposta.tipo]} · ${stamp(resposta.em, agora).toLowerCase()} · ${rotuloCanalResposta(resposta.canal)}`
                     : "Sem resposta",
               },
               {
                  label: "Aceite",
                  value: aceite
                     ? `${rotuloCanalAceite(aceite.canal)} · ${stamp(aceite.em, agora).toLowerCase()} · registrado por ${aceite.por.nome}`
                     : "Não registrado",
               },
            ]}
         />

         {aguardando ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface-2 p-3.5 text-[12px] leading-relaxed text-ink-2">
               <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden />
               <div>
                  <p>
                     {lembrete
                        ? `Lembrete automático ${stamp(lembrete, agora).toLowerCase()}`
                        : "Os lembretes automáticos já foram enviados"}
                  </p>
                  {encerraEm ? <p className="text-ink-3">Sem retorno até {shortDate(encerraEm)} encerra como perdido</p> : null}
               </div>
            </div>
         ) : null}

         {botoes.length > 0 ? (
            <div className="mt-5 flex flex-wrap items-start gap-x-5 gap-y-3 border-t border-hairline pt-4">
               {botoes.map(b => (
                  <div key={b.acao} className="max-w-[240px]">
                     <Button
                        variant="secondary"
                        className="acao-destaque"
                        data-tom={tomDaAcao(b.acao)}
                        icon={ICONE[b.acao]}
                        disabled={!b.habilitada}
                        onClick={() => onAcao(b.acao)}
                     >
                        {b.rotulo}
                     </Button>
                     {b.motivo ? <p className="mt-1.5 text-[11.5px] leading-snug text-ink-3">{b.motivo}</p> : null}
                  </div>
               ))}
            </div>
         ) : null}
      </Surface>
   );
}
