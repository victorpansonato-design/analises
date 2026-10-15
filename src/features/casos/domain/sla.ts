/**
 * Cálculo de prazos com horas úteis, feriados e pausa. Puro e determinístico: não depende do fuso
 * da máquina (trabalha com deslocamento fixo do calendário) e recebe `agora` por parâmetro.
 */
import type { Calendario, DiaSemana, RegraSla } from "@/features/casos/domain/parametros";

const MIN = 60_000;

function hhmm(s: string): number {
   const [h, m] = s.split(":").map(Number);
   return h * 60 + m;
}

/** Converte um instante UTC em "relógio local" do calendário (usando getters UTC). */
function local(d: Date, cal: Calendario): Date {
   return new Date(d.getTime() + cal.offsetMinutos * MIN);
}
function utc(dLocal: Date, cal: Calendario): Date {
   return new Date(dLocal.getTime() - cal.offsetMinutos * MIN);
}
function dataLocal(dLocal: Date): string {
   return dLocal.toISOString().slice(0, 10);
}
function inicioDoDiaLocal(dLocal: Date): Date {
   return new Date(Date.UTC(dLocal.getUTCFullYear(), dLocal.getUTCMonth(), dLocal.getUTCDate()));
}

function expedienteDo(dLocal: Date, cal: Calendario): { ini: number; fim: number } | null {
   if (cal.feriados.includes(dataLocal(dLocal))) return null;
   const exp = cal.expediente[dLocal.getUTCDay() as DiaSemana];
   return exp ? { ini: hhmm(exp.inicio), fim: hhmm(exp.fim) } : null;
}

/** Soma minutos de expediente a partir de `inicio`. */
export function adicionarMinutosUteis(inicio: Date, minutos: number, cal: Calendario): Date {
   let cursor = local(inicio, cal);
   let restante = minutos;
   for (let guarda = 0; guarda < 3660; guarda++) {
      const exp = expedienteDo(cursor, cal);
      const dia = inicioDoDiaLocal(cursor);
      const proximoDia = new Date(dia.getTime() + 24 * 60 * MIN);
      if (!exp) {
         cursor = proximoDia;
         continue;
      }
      const agoraMin = cursor.getUTCHours() * 60 + cursor.getUTCMinutes() + cursor.getUTCSeconds() / 60;
      if (agoraMin >= exp.fim) {
         cursor = proximoDia;
         continue;
      }
      const desde = Math.max(agoraMin, exp.ini);
      const disponivel = exp.fim - desde;
      if (restante <= disponivel) {
         return utc(new Date(dia.getTime() + (desde + restante) * MIN), cal);
      }
      restante -= disponivel;
      cursor = proximoDia;
   }
   throw new Error("Calendário sem expediente suficiente para calcular o prazo");
}

export interface Prazo {
   venceEm: Date;
   alertaEm: Date;
}

export function calcularPrazo(entrouEm: Date, regra: RegraSla, cal: Calendario): Prazo {
   const somar = (min: number) =>
      regra.calendario === "UTEIS" ? adicionarMinutosUteis(entrouEm, min, cal) : new Date(entrouEm.getTime() + min * MIN);
   return { venceEm: somar(regra.minutos), alertaEm: somar(Math.round(regra.minutos * regra.alertaEm)) };
}

export type EstadoSla = "NO_PRAZO" | "ATENCAO" | "ESTOURADO" | "PAUSADO" | "SEM_SLA";

export interface LeituraSla {
   estado: EstadoSla;
   /** Positivo = falta; negativo = atrasado. Null quando não se aplica. */
   minutosRestantes: number | null;
}

export function lerSla(sla: { venceEm: string | null; alertaEm: string | null; pausadoAte: string | null }, agora: Date): LeituraSla {
   if (sla.pausadoAte && new Date(sla.pausadoAte).getTime() > agora.getTime()) return { estado: "PAUSADO", minutosRestantes: null };
   if (!sla.venceEm) return { estado: "SEM_SLA", minutosRestantes: null };
   const vence = new Date(sla.venceEm).getTime();
   const restantes = Math.round((vence - agora.getTime()) / MIN);
   if (restantes < 0) return { estado: "ESTOURADO", minutosRestantes: restantes };
   if (sla.alertaEm && agora.getTime() >= new Date(sla.alertaEm).getTime()) return { estado: "ATENCAO", minutosRestantes: restantes };
   return { estado: "NO_PRAZO", minutosRestantes: restantes };
}

/** Texto curto para a fila: "faltam 6 h", "atrasado 2 h", "faltam 35 min". */
export function rotuloSla(l: LeituraSla, pausadoAte?: string | null): string {
   if (l.estado === "PAUSADO" && pausadoAte) {
      const d = new Date(pausadoAte);
      const dd = String(d.getUTCDate()).padStart(2, "0");
      const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
      return `pausado até ${dd}/${mm}`;
   }
   if (l.minutosRestantes === null) return "";
   const abs = Math.abs(l.minutosRestantes);
   const txt = abs < 60 ? `${abs} min` : abs < 48 * 60 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / (24 * 60))} d`;
   return l.minutosRestantes < 0 ? `atrasado ${txt}` : `faltam ${txt}`;
}
