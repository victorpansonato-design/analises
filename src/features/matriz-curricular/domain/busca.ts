/**
 * Busca de cursos na matriz curricular. Usada pela tela (validar a consulta antes de pedir) e pelo
 * backend simulado (filtrar o catálogo). O nome casa por trecho, sem acento e sem caixa; o código
 * casa pelo começo (digitar "70" já mostra os EAD que começam assim, "7008" acha só Administração
 * EAD). Só currículos ativos aparecem; os inativos viram contagem.
 */
import { searchKey } from "@/lib/format";

import {
   MODALIDADES_MATRIZ,
   type CurriculoResumo,
   type FiltroMatriz,
   type OfertaBase,
   type OfertaMatriz,
} from "@/features/matriz-curricular/types/matriz.schema";

/** Mínimo de letras para buscar por nome [parâmetro de interface]. Código busca com um dígito. */
export const MINIMO_LETRAS_BUSCA = 2;

export function ehBuscaPorCodigo(q: string): boolean {
   return /^\d+$/.test(q.trim());
}

export function consultaValida(q: string): boolean {
   const t = q.trim();
   if (!t) return false;
   return ehBuscaPorCodigo(t) || searchKey(t).length >= MINIMO_LETRAS_BUSCA;
}

export function resumoDoCurriculo(c: CurriculoResumo): CurriculoResumo {
   return {
      id: c.id,
      codigo: c.codigo,
      rotulo: c.rotulo,
      turno: c.turno,
      vigenciaInicio: c.vigenciaInicio,
      ativo: c.ativo,
      chTotal: c.chTotal,
      totalDisciplinas: c.totalDisciplinas,
   };
}

function casaConsulta(oferta: OfertaBase, curriculos: readonly CurriculoResumo[], q: string): boolean {
   const t = q.trim();
   if (ehBuscaPorCodigo(t)) return String(oferta.codigo).startsWith(t);
   const chave = searchKey(t);
   return searchKey(oferta.curso).includes(chave) || curriculos.some(c => searchKey(c.codigo).includes(chave));
}

/**
 * Filtra o catálogo. O turno só vale com a modalidade presencial: com ele, a oferta só entra se
 * tiver currículo ativo naquele turno e mostra apenas esses currículos.
 */
export function buscarOfertas<C extends CurriculoResumo>(
   catalogo: readonly (OfertaBase & { curriculos: readonly C[] })[],
   filtro: FiltroMatriz,
): OfertaMatriz[] {
   if (!consultaValida(filtro.q)) return [];
   const turno = filtro.modalidade === "PRESENCIAL" ? filtro.turno : null;
   const q = filtro.q.trim();
   const resultado: OfertaMatriz[] = [];
   for (const oferta of catalogo) {
      if (filtro.modalidade && oferta.modalidade !== filtro.modalidade) continue;
      if (!casaConsulta(oferta, oferta.curriculos, q)) continue;
      const doTurno = turno ? oferta.curriculos.filter(c => c.turno === turno) : oferta.curriculos;
      const ativos = doTurno.filter(c => c.ativo);
      if (turno && !ativos.length) continue;
      resultado.push({
         id: oferta.id,
         curso: oferta.curso,
         modalidade: oferta.modalidade,
         codigo: oferta.codigo,
         curriculos: ativos.map(resumoDoCurriculo).sort(ordemCurriculo),
         inativos: doTurno.length - ativos.length,
      });
   }
   const exato = ehBuscaPorCodigo(q) ? Number(q) : null;
   return resultado.sort(
      (a, b) =>
         Number(b.codigo === exato) - Number(a.codigo === exato) ||
         a.curso.localeCompare(b.curso, "pt-BR") ||
         MODALIDADES_MATRIZ.indexOf(a.modalidade) - MODALIDADES_MATRIZ.indexOf(b.modalidade),
   );
}

/** Mais recente primeiro; no mesmo período, diurno antes de noturno. */
function ordemCurriculo(a: CurriculoResumo, b: CurriculoResumo): number {
   return b.vigenciaInicio.localeCompare(a.vigenciaInicio) || (a.turno ?? "").localeCompare(b.turno ?? "");
}
