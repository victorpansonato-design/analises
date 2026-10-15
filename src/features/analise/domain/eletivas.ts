import { searchKey } from "@/lib/format";
import { itemDecidido, type ItemAnalise } from "@/features/analise/types/analise.schema";

/** O contrato ainda não classifica componentes: só nomes explícitos de eletivas entram no total. */
export function resumoEletivas(itens: readonly ItemAnalise[]) {
   const eletivas = itens.filter(i => /\beletivas?\b/.test(searchKey(i.disciplina)));
   return {
      identificadas: eletivas.length,
      exigidas: eletivas.reduce((s, i) => s + i.ch, 0),
      aproveitadas: eletivas.filter(i => itemDecidido(i) && i.decisao?.valor === "DISPENSA").reduce((s, i) => s + i.ch, 0),
      pendentes: eletivas.filter(i => !itemDecidido(i)).reduce((s, i) => s + i.ch, 0),
   };
}
