import { describe, expect, it } from "vitest";

import { chDoGrupo, disciplinasPorPeriodo, regraDoGrupo, rotuloPeriodo } from "@/features/matriz-curricular";

const d = (codigo: string, periodo: number, ch: number) => ({ codigo, nome: codigo, periodo, ch });

describe("disciplinas por período", () => {
   it("agrupa em ordem crescente com subtotal de CH", () => {
      const r = disciplinasPorPeriodo([d("X0201", 2, 60), d("X0101", 1, 80), d("X0202", 2, 40)]);
      expect(r.map(p => [p.periodo, p.ch, p.disciplinas.map(x => x.codigo)])).toEqual([
         [1, 80, ["X0101"]],
         [2, 100, ["X0201", "X0202"]],
      ]);
      expect(rotuloPeriodo(1)).toBe("1º período");
   });
});

describe("regra do grupo", () => {
   const opcoes = [40, 40, 40, 40, 40].map((ch, i) => ({ codigo: `E${i}`, nome: `E${i}`, ch }));

   it("série mínima", () => {
      expect(regraDoGrupo({ aPartirDoPeriodo: 5, chExigida: null, disciplinas: opcoes.slice(0, 2) })).toBe("A partir do 5º semestre");
   });

   it("série mínima e CH a escolher, sem vírgula antes do e", () => {
      expect(regraDoGrupo({ aPartirDoPeriodo: 3, chExigida: 120, disciplinas: opcoes })).toBe(
         "A partir do 3º semestre e cursar 120 h entre as opções",
      );
   });

   it("sem restrição", () => {
      expect(regraDoGrupo({ aPartirDoPeriodo: null, chExigida: null, disciplinas: opcoes })).toBe("Pode ser cursado em qualquer semestre");
   });

   it("CH do grupo: a exigida nas eletivas, a soma nos demais", () => {
      expect(chDoGrupo({ chExigida: 120, disciplinas: opcoes })).toBe(120);
      expect(chDoGrupo({ chExigida: null, disciplinas: opcoes })).toBe(200);
   });
});
