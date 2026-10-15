/** Regras do envio de template: etapa, opt-in e variáveis vazias (docs/08 §4). */
import { describe, expect, it } from "vitest";

import {
   explicarFaltando,
   motivoBloqueioEnvio,
   motivoTemplateForaDaEtapa,
   origemDoQueFalta,
   segmentarPrevia,
} from "@/features/comunicacao";

describe("variáveis faltando", () => {
   it("explica em português e sem vírgula antes do e", () => {
      expect(explicarFaltando(["documentos"])).toBe("Falta: documentos pendentes");
      expect(explicarFaltando(["disciplinas", "horas", "semestres"])).toBe(
         "Falta: disciplinas aproveitadas, horas aproveitadas e previsão de semestres",
      );
      expect(explicarFaltando([])).toBeNull();
   });
   it("diz de onde vem o que falta, sem repetir", () => {
      expect(origemDoQueFalta(["disciplinas", "horas"])).toHaveLength(1);
   });
   it("destaca só os marcadores apontados como faltando", () => {
      expect(segmentarPrevia("Só falta: [documentos].", ["documentos"])).toEqual([
         { texto: "Só falta: ", faltando: null },
         { texto: "[documentos]", faltando: "documentos" },
         { texto: ".", faltando: null },
      ]);
      expect(segmentarPrevia("Texto [livre]", [])).toEqual([{ texto: "Texto [livre]", faltando: null }]);
   });
});

describe("motivoBloqueioEnvio", () => {
   const lembrete = { etapas: ["AGUARDANDO_DOCUMENTOS" as const] };
   it("template fora da etapa vem primeiro", () => {
      expect(motivoTemplateForaDaEtapa(lembrete, "EM_ANALISE")).toBe("Serve à etapa Documentos");
      expect(
         motivoBloqueioEnvio({ template: lembrete, etapa: "EM_ANALISE", optInWhatsapp: false, variaveisFaltando: ["documentos"] }),
      ).toBe("Serve à etapa Documentos");
   });
   it("sem opt-in bloqueia antes da variável", () => {
      expect(
         motivoBloqueioEnvio({
            template: lembrete,
            etapa: "AGUARDANDO_DOCUMENTOS",
            optInWhatsapp: false,
            variaveisFaltando: ["documentos"],
         }),
      ).toMatch(/não autorizou/);
   });
   it("variável vazia bloqueia; tudo certo libera", () => {
      const base = { template: lembrete, etapa: "AGUARDANDO_DOCUMENTOS" as const, optInWhatsapp: true };
      expect(motivoBloqueioEnvio({ ...base, variaveisFaltando: ["documentos"] })).toBe("Falta: documentos pendentes");
      expect(motivoBloqueioEnvio({ ...base, variaveisFaltando: [] })).toBeNull();
   });
   it("várias etapas no plural", () => {
      expect(motivoTemplateForaDaEtapa({ etapas: ["PROPOSTA_ENVIADA", "EM_NEGOCIACAO"] }, "EM_ANALISE")).toBe(
         "Serve às etapas Proposta enviada ou Em conversa",
      );
   });
});
