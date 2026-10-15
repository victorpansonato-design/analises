/**
 * Ritmo das metas de vendas (puro, testado). Responde três perguntas da gestora:
 * 1. Quanto da meta já foi feito (realizado ÷ meta, sempre com os dois números à vista)?
 * 2. Estamos no ritmo? Compara o realizado com a parte da meta esperada até hoje, em dias úteis.
 * 3. Onde o mês deve fechar? Projeção = ritmo atual estendido até o fim do mês. É ESTIMATIVA.
 * Limiares e dias úteis vêm de `METAS` (docs/15), nunca soltos aqui.
 */
import { METAS } from "@/features/casos";
import { diaLocal } from "@/lib/format";

import type { ConsultorDesempenho, SituacaoMeta } from "@/features/gestao/types/gestao.schema";

export interface ProgressoMes {
   /** Dias úteis do mês. */
   total: number;
   /** Dias úteis até hoje, inclusive (no mês fechado, todos). */
   decorridos: number;
   restantes: number;
   fechado: boolean;
   /** Mês ainda não começou. */
   futuro: boolean;
}

export interface LeituraMeta {
   meta: number;
   realizado: number;
   /** realizado ÷ meta; `null` sem meta. */
   fracao: number | null;
   /** Parte da meta esperada até hoje. */
   esperado: number;
   /** Estimativa de fechamento do mês; `null` antes do primeiro dia útil. */
   projecao: number | null;
   faltam: number;
   /** Matrículas por dia útil restante para bater a meta; `null` se não há dia restante. */
   porDiaUtil: number | null;
   situacao: SituacaoMeta;
}

function diasDoMes(mes: string): string[] {
   const [ano, m] = mes.split("-").map(Number);
   const quantos = new Date(Date.UTC(ano, m, 0)).getUTCDate();
   return Array.from({ length: quantos }, (_, i) => `${mes}-${String(i + 1).padStart(2, "0")}`);
}

/** Dia da semana (0 = domingo) de uma data de calendário `AAAA-MM-DD`, sem depender do fuso da máquina. */
function diaDaSemana(dia: string): number {
   const [a, m, d] = dia.split("-").map(Number);
   return new Date(Date.UTC(a, m - 1, d)).getUTCDay();
}

export function ehDiaUtil(dia: string, feriados: readonly string[] = []): boolean {
   return METAS.diasUteis.includes(diaDaSemana(dia)) && !feriados.includes(dia);
}

/** Datas `AAAA-MM-DD` dos dias úteis do mês. */
export function diasUteisDoMes(mes: string, feriados: readonly string[] = []): string[] {
   return diasDoMes(mes).filter(d => ehDiaUtil(d, feriados));
}

/** Quantos dias de calendário o mês tem até hoje (mês corrente) ou ao todo (mês fechado). */
export function diasAteHoje(mes: string, agora: Date): number {
   const hoje = diaLocal(agora);
   const dias = diasDoMes(mes);
   return dias.filter(d => d <= hoje).length;
}

export function mesDe(agora: Date): string {
   return diaLocal(agora).slice(0, 7);
}

export function progressoDoMes(mes: string, agora: Date, feriados: readonly string[] = []): ProgressoMes {
   const hoje = diaLocal(agora);
   const uteis = diasUteisDoMes(mes, feriados);
   const atual = mesDe(agora);
   const fechado = mes < atual;
   const futuro = mes > atual;
   const decorridos = fechado ? uteis.length : futuro ? 0 : uteis.filter(d => d <= hoje).length;
   return { total: uteis.length, decorridos, restantes: uteis.length - decorridos, fechado, futuro };
}

export function avaliarMeta(meta: number, realizado: number, p: ProgressoMes): LeituraMeta {
   const esperado = p.total > 0 ? (meta * p.decorridos) / p.total : 0;
   const projecao = p.decorridos > 0 ? Math.round((realizado / p.decorridos) * p.total) : null;
   const faltam = Math.max(0, meta - realizado);
   const porDiaUtil = p.restantes > 0 ? faltam / p.restantes : null;
   const fracao = meta > 0 ? realizado / meta : null;
   return { meta, realizado, fracao, esperado, projecao, faltam, porDiaUtil, situacao: situacaoDa(meta, realizado, esperado, p) };
}

function situacaoDa(meta: number, realizado: number, esperado: number, p: ProgressoMes): SituacaoMeta {
   if (meta <= 0) return "SEM_META";
   if (realizado >= meta) return "ATINGIDA";
   if (p.fechado) return "NAO_ATINGIDA";
   if (esperado <= 0) return "NO_RITMO";
   const ritmo = realizado / esperado;
   if (ritmo >= METAS.noRitmoAPartirDe) return "NO_RITMO";
   if (ritmo >= METAS.atencaoAPartirDe) return "ATENCAO";
   return "ABAIXO";
}

/** Série acumulada (burn-up): o valor de cada dia é o total até ele. */
export function acumulado(porDia: readonly number[]): number[] {
   let soma = 0;
   return porDia.map(v => (soma += v));
}

export interface TotalEquipe {
   meta: number;
   matriculas: number;
   analisesConcluidas: number;
   propostasEnviadas: number;
   carteiraAtiva: number;
   porDia: number[];
}

export function totalDaEquipe(consultores: readonly ConsultorDesempenho[]): TotalEquipe {
   const dias = Math.max(0, ...consultores.map(c => c.matriculasPorDia.length));
   return {
      meta: consultores.reduce((s, c) => s + c.meta, 0),
      matriculas: consultores.reduce((s, c) => s + c.matriculas, 0),
      analisesConcluidas: consultores.reduce((s, c) => s + c.analisesConcluidas, 0),
      propostasEnviadas: consultores.reduce((s, c) => s + c.propostasEnviadas, 0),
      carteiraAtiva: consultores.reduce((s, c) => s + carteiraAtiva(c), 0),
      porDia: Array.from({ length: dias }, (_, i) => consultores.reduce((s, c) => s + (c.matriculasPorDia[i] ?? 0), 0)),
   };
}

export function carteiraAtiva(c: Pick<ConsultorDesempenho, "carteira">): number {
   return c.carteira.reduce((s, e) => s + e.total, 0);
}

/** Ranking: quem está mais perto da meta primeiro; empate decide pelo volume. */
export function ordenarPorRendimento<T extends Pick<ConsultorDesempenho, "meta" | "matriculas" | "nome">>(lista: readonly T[]): T[] {
   const fracao = (c: T) => (c.meta > 0 ? c.matriculas / c.meta : -1);
   return [...lista].sort((a, b) => fracao(b) - fracao(a) || b.matriculas - a.matriculas || a.nome.localeCompare(b.nome, "pt-BR"));
}
