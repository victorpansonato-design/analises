/**
 * Link público do aluno no backend simulado.
 *
 * - O token nasce com o protocolo (`gerarToken`); os casos da semente ganham um token estável,
 *   derivado do id, para o mesmo link abrir o mesmo caso em qualquer aba.
 * - Cada aba tem o próprio banco em memória. Para a aba do aluno enxergar o que a equipe fez em
 *   outra aba, a resposta pública é espelhada no `localStorage` e vence a versão mais recente.
 *   Só a resposta pública (já sem dado sensível) é espelhada.
 */
import { AcompanhamentoPublicoSchema, montarAcompanhamento, type AcompanhamentoPublico } from "@/features/acompanhamento";

import { db } from "@/mocks/db/estado";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { hash } from "@/mocks/lib/prng";

const CHAVE = "analises:acompanhamento:";

function base36(n: number, tamanho: number): string {
   return n.toString(36).padStart(tamanho, "0").slice(-tamanho);
}

/** Token não adivinhável a partir de uma semente única (id + momento + documento). */
export function gerarToken(semente: string): string {
   return base36(hash(`acomp:${semente}`), 6) + base36(hash(`${semente}:link`), 6);
}

export function tokenDoCaso(c: CasoRegistro): string {
   c.tokenAcompanhamento ??= gerarToken(`${c.id}|${c.semente}|${c.protocolo}`);
   return c.tokenAcompanhamento;
}

export function acompanhamentoDoCaso(c: CasoRegistro): AcompanhamentoPublico {
   return montarAcompanhamento({
      protocolo: c.protocolo,
      nome: c.candidato.nome,
      tipo: c.tipo,
      etapa: c.etapa,
      etapaAnterior: c.etapaAnterior,
      estudouForaNoPeriodo: c.origem.estudouForaNoPeriodo,
      criadoEm: c.criadoEm,
      atualizadoEm: c.atualizadoEm,
      jornada: c.jornada,
      destino: { nome: c.destino.cursoNome, modalidade: c.destino.modalidade, turno: c.destino.turno, ciclo: c.destino.ciclo },
      ra: c.candidato.ra,
   });
}

function lerEspelho(token: string): AcompanhamentoPublico | null {
   try {
      const bruto = localStorage.getItem(CHAVE + token);
      if (!bruto) return null;
      const r = AcompanhamentoPublicoSchema.safeParse(JSON.parse(bruto));
      return r.success ? r.data : null;
   } catch {
      return null;
   }
}

const maisRecente = (a: AcompanhamentoPublico, b: AcompanhamentoPublico | null) =>
   !b || new Date(a.atualizadoEm).getTime() >= new Date(b.atualizadoEm).getTime() ? a : b;

/** Espelha a visão pública do caso, se for a mais recente que existe. */
export function espelharAcompanhamento(c: CasoRegistro): void {
   const token = tokenDoCaso(c);
   const atual = acompanhamentoDoCaso(c);
   const espelho = lerEspelho(token);
   if (maisRecente(atual, espelho) !== atual) return;
   try {
      localStorage.setItem(CHAVE + token, JSON.stringify(atual));
   } catch {
      // Sem armazenamento (aba anônima, bloqueio): cada aba segue com a própria versão.
   }
}

/** Visão pública pelo token: a do banco desta aba ou a espelhada, a que for mais recente. */
export function acompanhamentoPorToken(token: string): AcompanhamentoPublico | null {
   const caso = [...db.casos.values()].find(c => tokenDoCaso(c) === token);
   const espelho = lerEspelho(token);
   if (!caso) return espelho;
   return maisRecente(acompanhamentoDoCaso(caso), espelho);
}
