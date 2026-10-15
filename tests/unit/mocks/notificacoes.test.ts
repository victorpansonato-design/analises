/** Avisos de prazo do sino: nascem na leitura, um por caso, tipo e passagem pela etapa. */
import { describe, expect, it } from "vitest";

import type { Notificacao } from "@/features/notificacoes";

import { idNotificacaoSla, notificacoesDeSla } from "@/mocks/handlers/notificacoes";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { semearCasos } from "@/mocks/seed/casos";

const AGORA = new Date("2026-10-09T15:00:00Z");
const BASE = semearCasos(AGORA).find(c => c.etapa === "EM_ANALISE") as CasoRegistro;
const EU = "u-ana-1";
const H = 3_600_000;

function caso(id: string, venceEmH: number, alertaEmH: number, analistaId = EU): CasoRegistro {
   return {
      ...BASE,
      id,
      etapa: "EM_ANALISE",
      teste: false,
      pendencia: null,
      responsaveis: { ...BASE.responsaveis, analistaId },
      sla: {
         venceEm: new Date(AGORA.getTime() + venceEmH * H).toISOString(),
         alertaEm: new Date(AGORA.getTime() + alertaEmH * H).toISOString(),
      },
   };
}

describe("notificacoesDeSla", () => {
   const casos = [
      caso("c-estourado", -2, -4),
      caso("c-atencao", 1, -1),
      caso("c-no-prazo", 6, 4),
      caso("c-outra-pessoa", -2, -4, "u-ana-2"),
   ];

   it("avisa só os casos do usuário que cruzaram o limiar", () => {
      const novas = notificacoesDeSla(casos, EU, [], AGORA);
      expect(novas.map(n => [n.casoId, n.tipo])).toEqual([
         ["c-estourado", "SLA_ESTOURADO"],
         ["c-atencao", "SLA_ATENCAO"],
      ]);
      expect(novas.every(n => !n.lida)).toBe(true);
      expect(novas[0].em).toBe(casos[0].sla.venceEm);
   });

   it("é idempotente: ler de novo não duplica", () => {
      const primeira = notificacoesDeSla(casos, EU, [], AGORA);
      const lidas: Notificacao[] = primeira.map(n => ({ ...n, lida: true }));
      expect(notificacoesDeSla(casos, EU, lidas, AGORA)).toEqual([]);
      expect(notificacoesDeSla([casos[0], casos[0]], EU, [], AGORA)).toHaveLength(1);
   });

   it("o caso que passa de atenção para estourado ganha o segundo tipo", () => {
      const antes = notificacoesDeSla([casos[1]], EU, [], AGORA);
      const depois = notificacoesDeSla([casos[1]], EU, antes, new Date(AGORA.getTime() + 2 * H));
      expect(depois.map(n => n.tipo)).toEqual(["SLA_ESTOURADO"]);
   });

   it("uma nova passagem pela etapa tem outro id", () => {
      const a = idNotificacaoSla(casos[0], "SLA_ESTOURADO");
      const b = idNotificacaoSla({ ...casos[0], etapaDesde: new Date(AGORA.getTime() - H).toISOString() }, "SLA_ESTOURADO");
      expect(a).not.toBe(b);
      expect(idNotificacaoSla(casos[0], "SLA_ATENCAO")).not.toBe(a);
   });
});
