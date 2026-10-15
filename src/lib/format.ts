/**
 * Formatação pt-BR (design system §12). Todo número, data e lista da interface passa por aqui.
 *
 * - Datas são exibidas no fuso de São Paulo, independente da máquina de quem usa (o processo é da
 *   UniAnchieta; um link aberto de outro fuso mostra o mesmo horário que a equipe vê).
 * - Data de calendário (`AAAA-MM-DD`) é ancorada ao meio-dia: `new Date("2026-01-01")` é meia-noite
 *   UTC e, em Brasília, formatava 31/12/2025.
 * - Listas não usam vírgula antes do "e" (padrão da casa).
 */

export const FUSO = "America/Sao_Paulo";

const nf = (opts: Intl.NumberFormatOptions) => new Intl.NumberFormat("pt-BR", opts);
const INT = nf({ maximumFractionDigits: 0 });
const MONEY = nf({ style: "currency", currency: "BRL" });

const MINUTO = 60_000;
const DIA_MS = 24 * 60 * MINUTO;

/** `18.426` */
export function int(n: number): string {
   return INT.format(Math.round(n));
}

/** `8,2` */
export function decimal(n: number, casas = 1): string {
   return nf({ minimumFractionDigits: casas, maximumFractionDigits: casas }).format(n);
}

/** Recebe fração (0,319) e devolve `31,9%`. */
export function percent(fracao: number, casas = 1): string {
   return `${decimal(fracao * 100, casas)}%`;
}

/** `R$ 1.234,50` */
export function money(n: number): string {
   return MONEY.format(n).replace(/\u00a0/g, " ");
}

/** `+8` · `−12` (sinal de menos de verdade, não hífen). */
export function signed(n: number): string {
   if (n > 0) return `+${int(n)}`;
   if (n < 0) return `−${int(Math.abs(n))}`;
   return "0";
}

/** `1.020 h` */
export function horas(n: number): string {
   return `${int(n)} h`;
}

/** Converte `AAAA-MM-DD` ou ISO em `Date`, ancorando datas de calendário ao meio-dia. */
export function toDate(valor: string | Date): Date {
   if (valor instanceof Date) return valor;
   if (/^\d{4}-\d{2}-\d{2}$/.test(valor)) return new Date(`${valor}T12:00:00-03:00`);
   return new Date(valor);
}

interface Partes {
   dia: string;
   mes: string;
   ano: string;
   hora: string;
   minuto: string;
}

const PARTES = new Intl.DateTimeFormat("pt-BR", {
   timeZone: FUSO,
   day: "2-digit",
   month: "2-digit",
   year: "numeric",
   hour: "2-digit",
   minute: "2-digit",
   hourCycle: "h23",
});

function partes(d: Date): Partes {
   const p = Object.fromEntries(PARTES.formatToParts(d).map(x => [x.type, x.value]));
   return { dia: p.day, mes: p.month, ano: p.year, hora: p.hour, minuto: p.minute };
}

/** Chave `AAAA-MM-DD` do dia no fuso de São Paulo. */
export function diaLocal(valor: string | Date): string {
   const p = partes(toDate(valor));
   return `${p.ano}-${p.mes}-${p.dia}`;
}

const MES_ANO = new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, month: "long", year: "numeric" });

/** `Outubro de 2026` a partir de `AAAA-MM`. */
export function monthLabel(mes: string): string {
   const texto = MES_ANO.format(toDate(`${mes}-15`));
   return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** `27/09` */
export function shortDate(valor: string | Date): string {
   const p = partes(toDate(valor));
   return `${p.dia}/${p.mes}`;
}

/** `27/09/2026` */
export function fullDate(valor: string | Date): string {
   const p = partes(toDate(valor));
   return `${p.dia}/${p.mes}/${p.ano}`;
}

/** `14:32` */
export function time(valor: string | Date): string {
   const p = partes(toDate(valor));
   return `${p.hora}:${p.minuto}`;
}

/** `Hoje, 14:32` · `Ontem, 09:10` · `Amanhã, 09:00` · `14/08, 16:45` · `14/08/2025, 16:45` */
export function stamp(valor: string | Date, agora: Date = new Date()): string {
   const d = toDate(valor);
   const dia = diaLocal(d);
   const hoje = diaLocal(agora);
   const ontem = diaLocal(new Date(agora.getTime() - DIA_MS));
   const amanha = diaLocal(new Date(agora.getTime() + DIA_MS));
   const hora = time(d);
   if (dia === hoje) return `Hoje, ${hora}`;
   if (dia === ontem) return `Ontem, ${hora}`;
   if (dia === amanha) return `Amanhã, ${hora}`;
   const p = partes(d);
   const mesmoAno = p.ano === partes(agora).ano;
   return mesmoAno ? `${p.dia}/${p.mes}, ${hora}` : `${p.dia}/${p.mes}/${p.ano}, ${hora}`;
}

/** Duração em minutos: `40 min` · `2 h 15 min` · `3 h` · `2 d` (acima de 48 h). */
export function duration(minutos: number): string {
   const m = Math.round(Math.abs(minutos));
   if (m < 60) return `${m} min`;
   if (m < 48 * 60) {
      const h = Math.floor(m / 60);
      const resto = m % 60;
      return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
   }
   return `${Math.round(m / (24 * 60))} d`;
}

/** `há 12 min` · `há 3 h` · `há 2 dias` · `em 40 min` · `agora` */
export function relative(valor: string | Date, agora: Date = new Date()): string {
   const diff = Math.round((toDate(valor).getTime() - agora.getTime()) / MINUTO);
   const abs = Math.abs(diff);
   if (abs < 1) return "agora";
   let txt: string;
   if (abs < 60) txt = `${abs} min`;
   else if (abs < 24 * 60) txt = `${Math.round(abs / 60)} h`;
   else {
      const dias = Math.round(abs / (24 * 60));
      txt = dias === 1 ? "1 dia" : `${dias} dias`;
   }
   return diff < 0 ? `há ${txt}` : `em ${txt}`;
}

/** Busca sem acento e sem caixa. */
export function searchKey(texto: string): string {
   return texto
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toLowerCase()
      .trim();
}

/** Só os dígitos. */
export function digits(texto: string): string {
   return texto.replace(/\D/g, "");
}

/** `(11) 98765-4321` */
export function phone(texto: string): string {
   const d = digits(texto);
   if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
   if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
   return texto;
}

/** `123.456.789-09` */
export function cpf(texto: string): string {
   const d = digits(texto);
   if (d.length !== 11) return texto;
   return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Lista em português sem vírgula antes do "e": `a, b e c`. */
export function lista(itens: readonly string[], conjuncao = "e"): string {
   const v = itens.filter(Boolean);
   if (v.length <= 1) return v[0] ?? "";
   return `${v.slice(0, -1).join(", ")} ${conjuncao} ${v[v.length - 1]}`;
}

/** `1 documento` · `3 documentos` */
export function plural(n: number, singular: string, pluralForma: string): string {
   return `${int(n)} ${n === 1 ? singular : pluralForma}`;
}

/** `3º` */
export function ordinal(n: number): string {
   return `${int(n)}º`;
}

/** Carimbo ordenável para nome de arquivo: `20260929-1432`. */
export function fileStamp(agora: Date = new Date()): string {
   const p = partes(agora);
   return `${p.ano}${p.mes}${p.dia}-${p.hora}${p.minuto}`;
}
