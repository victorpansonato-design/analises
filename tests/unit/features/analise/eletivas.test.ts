import { describe, expect, it } from "vitest";
import { resumoEletivas } from "@/features/analise/domain/eletivas";
import { decidido, item } from "./fixtures";

describe("horas de eletivas no relatório", () => {
   it("soma apenas eletivas explícitas e dispensa confirmada, incluindo respostas da coordenação", () => {
      const itens = [
         decidido("a", "DISPENSA", { disciplina: "ELETIVA I", ch: 40 }),
         decidido("b", "DISPENSA", { disciplina: "Disciplina eletiva II", estado: "RESPONDIDO", ch: 60 }),
         item("c", { disciplina: "Eletivas", ch: 80 }),
         decidido("d", "REGULAR", { disciplina: "Eletiva III", ch: 40 }),
         decidido("e", "DISPENSA", { disciplina: "Fundamentos da administração", ch: 100 }),
      ];
      expect(resumoEletivas(itens)).toEqual({ identificadas: 4, exigidas: 220, aproveitadas: 100, pendentes: 80 });
   });
   it("não transforma sugestão nem matriz sem identificação em horas dispensadas", () => {
      expect(resumoEletivas([item("a", { disciplina: "Eletiva", ch: 40 })]).aproveitadas).toBe(0);
      expect(resumoEletivas([item("b", { disciplina: "Eletividade dos processos", ch: 60 })]).identificadas).toBe(0);
      expect(resumoEletivas([])).toEqual({ identificadas: 0, exigidas: 0, aproveitadas: 0, pendentes: 0 });
   });
});
