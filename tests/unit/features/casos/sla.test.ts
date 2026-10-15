/**
 */
import { describe, expect, it } from "vitest";

import { CALENDARIO_PADRAO, type Calendario } from "@/features/casos/domain/parametros";
import { adicionarMinutosUteis, calcularPrazo, lerSla, rotuloSla } from "@/features/casos/domain/sla";

// 09/10/2026 é sexta-feira. 15:00Z = 12:00 em São Paulo.
const SEXTA_MEIO_DIA = new Date("2026-10-09T15:00:00Z");

describe("adicionarMinutosUteis", () => {
   it("soma dentro do mesmo dia", () => {
      expect(adicionarMinutosUteis(SEXTA_MEIO_DIA, 120, CALENDARIO_PADRAO).toISOString()).toBe("2026-10-09T17:00:00.000Z");
   });
   it("atravessa para o sábado (meio expediente)", () => {
      // sexta 12:00 + 8 h úteis: 6 h na sexta (até 18:00) + 2 h no sábado (08:00–10:00)
      expect(adicionarMinutosUteis(SEXTA_MEIO_DIA, 480, CALENDARIO_PADRAO).toISOString()).toBe("2026-10-10T13:00:00.000Z");
   });
   it("pula domingo e feriado", () => {
      const cal: Calendario = { ...CALENDARIO_PADRAO, feriados: ["2026-10-12"] }; // segunda, feriado
      // sexta 12:00 + 6 h (sexta) + 4 h (sábado) + 1 h → terça 09:00
      expect(adicionarMinutosUteis(SEXTA_MEIO_DIA, 660, cal).toISOString()).toBe("2026-10-13T12:00:00.000Z");
   });
   it("começa no início do expediente quando entra de madrugada", () => {
      const madrugada = new Date("2026-10-08T05:00:00Z"); // quinta 02:00 local
      expect(adicionarMinutosUteis(madrugada, 60, CALENDARIO_PADRAO).toISOString()).toBe("2026-10-08T12:00:00.000Z");
   });
});

describe("calcularPrazo e lerSla", () => {
   it("coordenação 24 h corridas com alerta em 80%", () => {
      const p = calcularPrazo(SEXTA_MEIO_DIA, { minutos: 1440, calendario: "CORRIDAS", alertaEm: 0.8 }, CALENDARIO_PADRAO);
      expect(p.venceEm.toISOString()).toBe("2026-10-10T15:00:00.000Z");
      expect(p.alertaEm.toISOString()).toBe("2026-10-10T10:12:00.000Z");
   });
   it("estados do relógio", () => {
      const sla = { venceEm: "2026-10-09T18:00:00Z", alertaEm: "2026-10-09T17:00:00Z", pausadoAte: null };
      expect(lerSla(sla, new Date("2026-10-09T16:00:00Z")).estado).toBe("NO_PRAZO");
      expect(lerSla(sla, new Date("2026-10-09T17:30:00Z")).estado).toBe("ATENCAO");
      const atrasado = lerSla(sla, new Date("2026-10-09T20:00:00Z"));
      expect(atrasado.estado).toBe("ESTOURADO");
      expect(rotuloSla(atrasado)).toBe("atrasado 2 h");
      expect(lerSla({ ...sla, pausadoAte: "2026-10-20T12:00:00Z" }, SEXTA_MEIO_DIA).estado).toBe("PAUSADO");
   });
});
