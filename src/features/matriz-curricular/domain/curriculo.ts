/** Leituras puras do currículo para a tela: períodos com subtotal e a regra de cada grupo. */
import { horas, lista, ordinal } from "@/lib/format";

import type { DisciplinaSeriada, GrupoDisciplinas } from "@/features/matriz-curricular/types/matriz.schema";

export interface PeriodoCurriculo {
   periodo: number;
   disciplinas: DisciplinaSeriada[];
   ch: number;
}

/** Agrupa por período em ordem crescente, mantendo a ordem das disciplinas dentro de cada um. */
export function disciplinasPorPeriodo(disciplinas: readonly DisciplinaSeriada[]): PeriodoCurriculo[] {
   const mapa = new Map<number, DisciplinaSeriada[]>();
   for (const d of disciplinas) {
      const itens = mapa.get(d.periodo) ?? [];
      itens.push(d);
      mapa.set(d.periodo, itens);
   }
   return [...mapa.entries()].sort(([a], [b]) => a - b).map(([periodo, itens]) => ({ periodo, disciplinas: itens, ch: somaCh(itens) }));
}

export function somaCh(disciplinas: readonly { ch: number }[]): number {
   return disciplinas.reduce((soma, d) => soma + d.ch, 0);
}

/** `1º período` */
export function rotuloPeriodo(periodo: number): string {
   return `${ordinal(periodo)} período`;
}

/**
 * Regra do grupo em uma frase: "A partir do 5º semestre e cursar 160 h entre as opções". Sem regra
 * de série nem CH a escolher, o grupo é livre e a frase diz isso.
 */
export function regraDoGrupo(grupo: Pick<GrupoDisciplinas, "aPartirDoPeriodo" | "chExigida" | "disciplinas">): string {
   const partes: string[] = [];
   if (grupo.aPartirDoPeriodo) partes.push(`a partir do ${ordinal(grupo.aPartirDoPeriodo)} semestre`);
   const total = somaCh(grupo.disciplinas);
   if (grupo.chExigida && grupo.chExigida < total) partes.push(`cursar ${horas(grupo.chExigida)} entre as opções`);
   if (!partes.length) return "Pode ser cursado em qualquer semestre";
   const frase = lista(partes);
   return frase.charAt(0).toUpperCase() + frase.slice(1);
}

/** CH que o grupo exige do aluno: a escolhida nas eletivas, a soma nos demais. */
export function chDoGrupo(grupo: Pick<GrupoDisciplinas, "chExigida" | "disciplinas">): number {
   return grupo.chExigida ?? somaCh(grupo.disciplinas);
}
