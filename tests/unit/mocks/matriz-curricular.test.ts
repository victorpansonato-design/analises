import { describe, expect, it } from "vitest";

import { CurriculoSchema, codigoDoCurso } from "@/features/matriz-curricular";
import { curriculoPorId, OFERTAS_MATRIZ } from "@/mocks/seed/matrizes";

const curriculos = OFERTAS_MATRIZ.flatMap(o => o.curriculos);

describe("seed das matrizes curriculares", () => {
   it("todo currículo respeita o contrato e tem id e código únicos", () => {
      for (const c of curriculos) CurriculoSchema.parse(c);
      expect(new Set(curriculos.map(c => c.id)).size).toBe(curriculos.length);
      expect(new Set(curriculos.map(c => c.codigo)).size).toBe(curriculos.length);
      expect(curriculoPorId(curriculos[0].id)).toBe(curriculos[0]);
      expect(curriculoPorId("inexistente")).toBeNull();
   });

   it("códigos de Administração seguem a regra 8, 2008 e 7008", () => {
      const adm = OFERTAS_MATRIZ.filter(o => o.curso === "Administração").map(o => o.codigo);
      expect(adm).toEqual([codigoDoCurso(8, "PRESENCIAL"), codigoDoCurso(8, "HIBRIDO"), codigoDoCurso(8, "EAD")]);
      expect(adm).toEqual([8, 2008, 7008]);
   });

   it("turno só no presencial; códigos de disciplina únicos dentro do currículo", () => {
      for (const c of curriculos) {
         expect(c.turno === null).toBe(c.oferta.modalidade !== "PRESENCIAL");
         const codigos = [...c.disciplinas, ...c.grupos.flatMap(g => g.disciplinas)].map(d => d.codigo);
         expect(new Set(codigos).size).toBe(codigos.length);
         expect(c.totalDisciplinas).toBe(codigos.length);
      }
   });

   it("há variação: currículo sem grupos, sem TCC em grupo, sem eletivas e inativo", () => {
      expect(curriculos.some(c => c.grupos.length === 0)).toBe(true);
      expect(curriculos.some(c => c.grupos.length > 0 && !c.grupos.some(g => g.tipo === "TCC"))).toBe(true);
      expect(curriculos.some(c => c.grupos.length > 0 && !c.grupos.some(g => g.tipo === "ELETIVAS"))).toBe(true);
      expect(curriculos.some(c => !c.ativo)).toBe(true);
   });
});
