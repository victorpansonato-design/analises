import { describe, expect, it } from "vitest";
import { calcularDispensa, conferirMensalidades, DESCONTOS_VAZIOS, valoresDisciplinas } from "@/features/calculo-dispensa/domain";
import type { GradeDispensa } from "@/features/calculo-dispensa";

const grade: GradeDispensa = {
   id: "grade",
   ano: 2026,
   periodo: "2026/2",
   curso: "Administração",
   curriculo: "2026",
   turno: "Noturno",
   serie: 2,
   contrato: 200000,
   disciplinas: [
      { id: "a", nome: "A", creditos: 60 },
      { id: "b", nome: "B", creditos: 40 },
   ],
};

describe("regras informadas para o cálculo de dispensa", () => {
   it("normal: contrato menos dispensa, depois bolsa sobre o saldo", () => {
      const resultado = calcularDispensa(grade, ["a"], { ...DESCONTOS_VAZIOS, bolsa: 50 });
      expect(resultado.dispensado).toBe(80000);
      expect(resultado.bolsa).toBe(60000);
      expect(resultado.regular).toBe(60000);
   });

   it("CEU: saldo de 600 + 10%, dividido por 2, resulta em 330", () => {
      expect(calcularDispensa(grade, ["a"], { ...DESCONTOS_VAZIOS, perfil: "ceu", bolsa: 50 }).regular).toBe(33000);
   });

   it("ProUni 50%: a bolsa comercial incide no contrato integral e as dispensas não mudam o resultado", () => {
      const descontos = { ...DESCONTOS_VAZIOS, perfil: "prouni50" as const, bolsa: 50 };
      expect(calcularDispensa(grade, ["a"], descontos).regular).toBe(50000);
      expect(calcularDispensa(grade, [], descontos).regular).toBe(50000);
   });

   it("conserva os centavos do contrato mesmo quando a distribuição não é exata", () => {
      const valores = valoresDisciplinas(
         { ...grade, disciplinas: Array.from({ length: 3 }, (_, i) => ({ id: String(i), nome: String(i), creditos: 1 })) },
         10000,
      );
      expect(valores).toEqual([3333, 3333, 3334]);
      expect(valores.reduce((s, v) => s + v, 0)).toBe(10000);
   });

   it("aplica desconto fixo após a regra e antecipação depois, sem valor negativo", () => {
      const resultado = calcularDispensa(grade, ["a"], { ...DESCONTOS_VAZIOS, bolsa: 50, fixo: 10000, antecipado1: 10 });
      expect(resultado.regular).toBe(50000);
      expect(resultado.antecipado1).toBe(45000);
      expect(calcularDispensa(grade, [], { ...DESCONTOS_VAZIOS, fixo: 10000 }).regular).toBe(0);
   });

   it("identifica valores a maior e a menor sem compensar diferenças entre meses", () => {
      const resultado = calcularDispensa(grade, ["a"], { ...DESCONTOS_VAZIOS, bolsa: 50, antecipado1: 10 });
      const linhas = conferirMensalidades(
         [
            { id: "out", competencia: "2026-10", vencimento: "2026-10-12", valor: 75000, pagamento: "Em aberto", condicao: "regular" },
            { id: "nov", competencia: "2026-11", vencimento: "2026-11-12", valor: 55000, pagamento: "Em aberto", condicao: "regular" },
            { id: "dez", competencia: "2026-12", vencimento: "2026-12-07", valor: 54000, pagamento: "Pago", condicao: "antecipado1" },
         ],
         resultado,
      );
      expect(linhas.map(l => l.diferenca)).toEqual([15000, -5000, 0]);
   });
});
