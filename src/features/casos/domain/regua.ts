/**
 * Régua de lembretes automáticos (docs/08 §2 e docs/15 §3). Puro: calcula quando sai o próximo
 * lembrete a partir da entrada na etapa, para a tela dizer "Próximo lembrete automático: amanhã 9h"
 * sem campo manual de "próximo contato".
 */
import { CALENDARIO_PADRAO, REGUA } from "@/features/casos/domain/parametros";

const MIN = 60_000;
const DIA = 24 * 60 * MIN;

function hhmm(s: string): number {
   const [h, m] = s.split(":").map(Number);
   return h * 60 + m;
}

/** Instante (UTC) do dia `entrou + dias` às `hora` no fuso do calendário. */
function diaAsHora(entrouEm: Date, dias: number, hora: string, offsetMinutos: number): Date {
   const local = new Date(entrouEm.getTime() + offsetMinutos * MIN);
   const inicioDia = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
   return new Date(inicioDia + dias * DIA + hhmm(hora) * MIN - offsetMinutos * MIN);
}

/** Domingo não recebe mensagem automática (docs/15 §3): o lembrete passa para segunda. */
function pularDomingo(d: Date, offsetMinutos: number): Date {
   const local = new Date(d.getTime() + offsetMinutos * MIN);
   return local.getUTCDay() === 0 && !REGUA.janela.domingos ? new Date(d.getTime() + DIA) : d;
}

export function proximoLembrete(
   entrouEm: string,
   lembretesDias: readonly number[],
   hora: string,
   agora: Date,
   offsetMinutos = CALENDARIO_PADRAO.offsetMinutos,
): Date | null {
   const base = new Date(entrouEm);
   for (const dias of lembretesDias) {
      const quando = pularDomingo(diaAsHora(base, dias, hora, offsetMinutos), offsetMinutos);
      if (quando.getTime() > agora.getTime()) return quando;
   }
   return null;
}

export function proximoLembreteDocumentos(entrouEm: string, agora: Date): Date | null {
   return proximoLembrete(entrouEm, REGUA.documentos.lembretesDias, REGUA.documentos.hora, agora);
}

export function proximoLembreteProposta(entrouEm: string, agora: Date): Date | null {
   return proximoLembrete(entrouEm, REGUA.proposta.lembretesDias, REGUA.proposta.hora, agora);
}

/** Dia em que a proposta sem resposta vira "sem retorno" (D+7). */
export function semRetornoEm(entrouEm: string): Date {
   return new Date(new Date(entrouEm).getTime() + REGUA.proposta.semRetornoDias * DIA);
}
