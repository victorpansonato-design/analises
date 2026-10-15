/** Fábrica de itens fictícios para os testes da análise (nenhum dado real). */
import type { ItemAnalise, ItemOrigem, Sugestao } from "@/features/analise";
import type { DecisaoItem } from "@/features/casos";

export const POR = { id: "u-ana-1", nome: "Analista Fictícia" };
export const EM = "2026-10-09T17:00:00.000Z";

export function sugestao(parcial: Partial<Sugestao> = {}): Sugestao {
   return { decisao: "DISPENSA", origemIds: ["o1"], confianca: "ALTA", fonte: "IA", justificativa: "Compatível", alertas: [], ...parcial };
}

export function item(id: string, parcial: Partial<ItemAnalise> = {}): ItemAnalise {
   return {
      id,
      periodo: 1,
      disciplina: `Disciplina ${id}`,
      ch: 60,
      estado: "SUGERIDO",
      sugestao: sugestao(),
      decisao: null,
      pergunta: null,
      ementa: "Ementa fictícia.",
      ...parcial,
   };
}

export function origem(id: string, parcial: Partial<ItemOrigem> = {}): ItemOrigem {
   return {
      id,
      nome: `Origem ${id}`,
      ies: "Faculdade Fictícia",
      ch: 60,
      nota: 8,
      ano: 2024,
      semestre: 1,
      situacao: "APROVADO",
      confiancaExtracao: 0.95,
      usadaEm: [],
      ...parcial,
   };
}

export function decidido(id: string, valor: DecisaoItem, parcial: Partial<ItemAnalise> = {}): ItemAnalise {
   return item(id, {
      estado: "DECIDIDO",
      decisao: { valor, origemIds: ["o1"], origem: "IA", motivoAlteracao: null, por: POR, em: EM },
      ...parcial,
   });
}
