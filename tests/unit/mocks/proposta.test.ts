import { beforeAll, describe, expect, it } from "vitest";

import { PropostaSchema } from "@/features/proposta";

import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { montarProposta } from "@/mocks/handlers/proposta";

beforeAll(() => {
   iniciarDb(new Date("2026-10-09T12:00:00-03:00"));
});

function achar(f: (c: CasoRegistro) => boolean): CasoRegistro {
   const c = [...db.casos.values()].find(f);
   if (!c) throw new Error("Semente sem o caso esperado");
   return c;
}

describe("GET /casos/:id/proposta (mock)", () => {
   it("antes de concluir a análise não devolve número nenhum", () => {
      const p = montarProposta(
         achar(c => !c.resumoCongeladoEm && c.etapa === "EM_ANALISE"),
         { papeis: ["MATRICULA"] },
      );
      expect(p.resumo).toBeNull();
      expect(p.financeiro).toBeNull();
      expect(PropostaSchema.safeParse(p).success).toBe(true);
   });

   it("com resumo congelado calcula o resumo sob demanda e respeita o contrato", () => {
      const c = achar(x => !!x.resumoCongeladoEm && x.etapa === "PRONTO_PARA_MATRICULA");
      const p = montarProposta(c, { papeis: ["MATRICULA"] });
      expect(p.resumo).not.toBeNull();
      expect(p.congeladoEm).toBe(c.resumoCongeladoEm);
      expect(p.pdfUrl).toBeNull();
      expect(PropostaSchema.safeParse(p).success).toBe(true);
   });

   it("condição financeira só para quem tem VER_FINANCEIRO", () => {
      const c = achar(x => !!x.resumoCongeladoEm && !!x.proposta.financeiro);
      expect(montarProposta(c, { papeis: ["MATRICULA"] }).financeiro).not.toBeNull();
      expect(montarProposta(c, { papeis: ["CONSULTOR"] }).financeiro).not.toBeNull();
      expect(montarProposta(c, { papeis: ["ANALISTA"] }).financeiro).not.toBeNull();
      expect(montarProposta(c, { papeis: ["COORDENADOR"] }).financeiro).not.toBeNull();
   });

   it("aceite sai com quem registrou resumido", () => {
      const c = achar(x => !!x.proposta.aceite);
      const p = montarProposta(c, { papeis: ["MATRICULA"] });
      expect(p.aceite?.por.nome).toBeTruthy();
      expect(PropostaSchema.safeParse(p).success).toBe(true);
   });
});
