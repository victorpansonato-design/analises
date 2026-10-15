/**
 * Como cada unidade de indicador vira texto (sempre por `@/lib/format`, pt-BR) e o que é taxa.
 * Taxa e índice não "contam do zero" na tela (`countUp={false}`): nos primeiros quadros o cartão
 * diria "0%", e é a frase que alguém fotografa. Só contagem inteira conta.
 */
import type { Indicador, Unidade } from "@/features/indicadores/types/indicadores.schema";
import { decimal, duration, int, percent } from "@/lib/format";

export function formatarValor(unidade: Unidade, v: number): string {
   switch (unidade) {
      case "PERCENTUAL":
         return percent(v, 1);
      case "HORAS":
         return duration(v * 60);
      case "DIAS":
         return `${decimal(v, 1)} d`;
      case "MINUTOS":
         return v < 10 ? `${decimal(v, 1)} min` : duration(v);
      case "CONTAGEM":
         return Number.isInteger(v) ? int(v) : decimal(v, Math.abs(v) < 1 ? 2 : 1);
   }
}

/** Rótulo curto para eixo de gráfico. */
export function formatarEixo(unidade: Unidade, v: number): string {
   if (unidade === "PERCENTUAL") return percent(v, 0);
   if (unidade === "CONTAGEM") return Number.isInteger(v) ? int(v) : decimal(v, 1);
   return formatarValor(unidade, v);
}

export function ehTaxa(i: Pick<Indicador, "unidade" | "numerador" | "denominador">): boolean {
   return i.unidade === "PERCENTUAL" && i.numerador !== null && i.denominador !== null;
}

/** Só volume inteiro conta do zero; taxa, mediana e média por caso aparecem direto. */
export function contaDoZero(i: Pick<Indicador, "unidade" | "valor">): boolean {
   return i.unidade === "CONTAGEM" && i.valor !== null && Number.isInteger(i.valor);
}

/** Uma linha da composição, já em texto: "12 ÷ 18" | "66,7%" ou "6 h" | "34 saídas". */
export function lerLinha(
   ind: Pick<Indicador, "unidade" | "denominadorRotulo">,
   linha: Indicador["composicao"][number],
): { valor: string; lado: string } {
   const temDen = linha.denominador !== null && linha.denominador !== undefined;
   if (linha.percentual === null) {
      return {
         valor: formatarValor(ind.unidade, linha.valor),
         lado: temDen ? `${int(linha.denominador as number)} ${linha.denominador === 1 ? "caso" : "casos"}` : "",
      };
   }
   const contagem = Number.isInteger(linha.valor) ? int(linha.valor) : decimal(linha.valor, 1);
   return { valor: temDen ? `${contagem} ÷ ${int(linha.denominador as number)}` : contagem, lado: percent(linha.percentual, 1) };
}

/** Escala da MeterBar de uma linha: a taxa/participação, ou a fração do maior valor quando não soma. */
export function fracaoDaLinha(linhas: Indicador["composicao"], linha: Indicador["composicao"][number]): number {
   if (linha.percentual !== null) return linha.percentual;
   const maior = Math.max(...linhas.map(l => l.valor), 0);
   return maior > 0 ? linha.valor / maior : 0;
}

/** "312 matriculados de 845 com análise concluída" ou "Calculado sobre 845 casos com análise concluída". */
export function denominadorPorExtenso(i: Indicador): string {
   if (ehTaxa(i))
      return `${int(i.numerador as number)} ${i.numeradorRotulo ?? ""} de ${int(i.denominador as number)} ${i.denominadorRotulo ?? ""}`
         .replace(/\s+/g, " ")
         .trim();
   if (i.denominador === null) return "Sem denominador publicado.";
   const base = `${int(i.denominador)} ${i.denominadorRotulo ?? ""}`.trim();
   if (i.numerador !== null) return `${int(i.numerador)} ${i.numeradorRotulo ?? ""} em ${base}`.replace(/\s+/g, " ");
   return `Calculado sobre ${base}`;
}
