import { describe, expect, it } from "vitest";

import { gerarCsv } from "@/lib/csv";
import {
   cpf,
   decimal,
   duration,
   fileStamp,
   fullDate,
   horas,
   int,
   lista,
   money,
   percent,
   phone,
   plural,
   relative,
   searchKey,
   shortDate,
   signed,
   stamp,
   toDate,
} from "@/lib/format";

const AGORA = new Date("2026-10-09T15:00:00Z"); // 12:00 em São Paulo

describe("números", () => {
   it("formata em pt-BR", () => {
      expect(int(18426)).toBe("18.426");
      expect(decimal(8.24)).toBe("8,2");
      expect(percent(0.31875)).toBe("31,9%");
      expect(money(1234.5)).toBe("R$ 1.234,50");
      expect(signed(8)).toBe("+8");
      expect(signed(-12)).toBe("−12");
      expect(signed(0)).toBe("0");
      expect(horas(1020)).toBe("1.020 h");
      expect(plural(1, "caso", "casos")).toBe("1 caso");
      expect(plural(3, "caso", "casos")).toBe("3 casos");
   });
});

describe("datas no fuso de São Paulo", () => {
   it("data de calendário é ancorada ao meio-dia", () => {
      expect(fullDate("2026-01-01")).toBe("01/01/2026");
      expect(toDate("2026-01-01").toISOString()).toBe("2026-01-01T15:00:00.000Z");
   });
   it("stamp relativo ao dia", () => {
      expect(stamp("2026-10-09T17:32:00Z", AGORA)).toBe("Hoje, 14:32");
      expect(stamp("2026-10-08T12:10:00Z", AGORA)).toBe("Ontem, 09:10");
      expect(stamp("2026-10-10T12:00:00Z", AGORA)).toBe("Amanhã, 09:00");
      expect(stamp("2026-08-14T19:45:00Z", AGORA)).toBe("14/08, 16:45");
      expect(stamp("2025-08-14T19:45:00Z", AGORA)).toBe("14/08/2025, 16:45");
      expect(shortDate("2026-09-27T15:00:00Z")).toBe("27/09");
   });
   it("relativo e duração", () => {
      expect(relative("2026-10-09T14:48:00Z", AGORA)).toBe("há 12 min");
      expect(relative("2026-10-09T18:00:00Z", AGORA)).toBe("em 3 h");
      expect(relative("2026-10-07T15:00:00Z", AGORA)).toBe("há 2 dias");
      expect(relative(AGORA, AGORA)).toBe("agora");
      expect(duration(40)).toBe("40 min");
      expect(duration(135)).toBe("2 h 15 min");
      expect(duration(180)).toBe("3 h");
      expect(duration(3 * 24 * 60)).toBe("3 d");
      expect(fileStamp(AGORA)).toBe("20261009-1200");
   });
});

describe("texto", () => {
   it("lista sem vírgula antes do e", () => {
      expect(lista(["a"])).toBe("a");
      expect(lista(["a", "b"])).toBe("a e b");
      expect(lista(["histórico", "planos", "declaração"])).toBe("histórico, planos e declaração");
   });
   it("busca sem acento, CPF e telefone", () => {
      expect(searchKey("  João Antônio ")).toBe("joao antonio");
      expect(cpf("12345678909")).toBe("123.456.789-09");
      expect(phone("11987654321")).toBe("(11) 98765-4321");
      expect(phone("1134567890")).toBe("(11) 3456-7890");
   });
});

describe("CSV", () => {
   it("tem BOM, separador ; e escapa aspas", () => {
      const csv = gerarCsv(
         ["a", "b"],
         [
            ["x;y", 'diz "oi"'],
            [1, null],
         ],
      );
      expect(csv.startsWith("﻿")).toBe(true);
      expect(csv).toContain('"x;y";"diz ""oi"""');
      expect(csv).toContain("1;\r\n");
   });
});
