/** Matemática dos gráficos do painel (DS §11): ticks redondos, rótulos ralos e formatação por unidade. */
import { describe, expect, it } from "vitest";

import { niceScale, passoRedondo, thin } from "@/features/indicadores/domain/escala";
import { contaDoZero, ehTaxa, formatarValor, lerLinha } from "@/features/indicadores/domain/formato";

describe("passoRedondo", () => {
   it("normaliza para 1, 2, 2,5, 5 ou 10 × 10ⁿ", () => {
      expect(passoRedondo(0.9)).toBe(1);
      expect(passoRedondo(1.3)).toBe(2);
      expect(passoRedondo(2.2)).toBe(2.5);
      expect(passoRedondo(3.678)).toBe(5);
      expect(passoRedondo(7)).toBe(10);
      expect(passoRedondo(920)).toBe(1000);
      expect(passoRedondo(0.037)).toBe(0.05);
   });
   it("passo inválido vira 1", () => {
      expect(passoRedondo(0)).toBe(1);
      expect(passoRedondo(Number.NaN)).toBe(1);
   });
});

describe("niceScale", () => {
   it("contém os dados e termina em número redondo", () => {
      const e = niceScale(0, 3678);
      expect(e.min).toBe(0);
      expect(e.max).toBe(4000);
      expect(e.ticks).toEqual([0, 1000, 2000, 3000, 4000]);
   });
   it("funciona com frações (taxas) sem erro de ponto flutuante", () => {
      const e = niceScale(0, 0.63);
      expect(e.ticks).toEqual([0, 0.2, 0.4, 0.6, 0.8]);
      for (const t of e.ticks) expect(String(t).length).toBeLessThan(6);
   });
   it("série constante ainda tem altura", () => {
      const e = niceScale(5, 5);
      expect(e.max).toBeGreaterThan(e.min);
      expect(niceScale(0, 0).ticks.length).toBeGreaterThan(1);
   });
});

describe("thin", () => {
   it("mostra todos quando cabem", () => {
      expect(thin(4, 8)).toEqual([0, 1, 2, 3]);
   });
   it("sempre mantém o último (hoje) e o primeiro", () => {
      for (const [n, max] of [
         [8, 3],
         [30, 5],
         [13, 4],
         [2, 1],
      ] as const) {
         const idx = thin(n, max);
         expect(idx[idx.length - 1]).toBe(n - 1);
         if (max > 1) expect(idx[0]).toBe(0);
         expect(idx.length).toBeLessThanOrEqual(Math.max(1, max));
         expect([...idx].sort((a, b) => a - b)).toEqual(idx);
      }
   });
   it("anda de trás para frente a partir do último", () => {
      expect(thin(8, 4)).toEqual([0, 4, 7]);
      expect(thin(10, 4)).toEqual([0, 3, 6, 9]);
   });
   it("vazio", () => {
      expect(thin(0, 4)).toEqual([]);
   });
});

describe("formato", () => {
   it("formata por unidade em pt-BR", () => {
      expect(formatarValor("PERCENTUAL", 0.319)).toBe("31,9%");
      expect(formatarValor("HORAS", 2.5)).toBe("2 h 30 min");
      expect(formatarValor("DIAS", 3.25)).toBe("3,3 d");
      expect(formatarValor("MINUTOS", 2.4)).toBe("2,4 min");
      expect(formatarValor("CONTAGEM", 1234)).toBe("1.234");
      expect(formatarValor("CONTAGEM", 0.456)).toBe("0,46");
   });
   it("taxa e índice não contam do zero; contagem inteira conta", () => {
      expect(ehTaxa({ unidade: "PERCENTUAL", numerador: 1, denominador: 2 })).toBe(true);
      expect(ehTaxa({ unidade: "DIAS", numerador: null, denominador: 2 })).toBe(false);
      expect(contaDoZero({ unidade: "PERCENTUAL", valor: 0.5 })).toBe(false);
      expect(contaDoZero({ unidade: "CONTAGEM", valor: 1.5 })).toBe(false);
      expect(contaDoZero({ unidade: "CONTAGEM", valor: 12 })).toBe(true);
   });
   it("linha com denominador mostra a conta e a taxa", () => {
      expect(
         lerLinha({ unidade: "PERCENTUAL", denominadorRotulo: null }, { rotulo: "x", valor: 12, denominador: 18, percentual: 12 / 18 }),
      ).toEqual({ valor: "12 ÷ 18", lado: "66,7%" });
      expect(lerLinha({ unidade: "HORAS", denominadorRotulo: null }, { rotulo: "x", valor: 6, denominador: 4, percentual: null })).toEqual({
         valor: "6 h",
         lado: "4 casos",
      });
   });
});
