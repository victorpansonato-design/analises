/** Filtro, ordem e paginação da linha do tempo (o mock usa as mesmas funções). */
import { describe, expect, it } from "vitest";

import {
   botoesDoEvento,
   direcaoMensagem,
   ehMensagemWhatsapp,
   filtrarEventos,
   lerFiltro,
   ordenarRecentesPrimeiro,
   paginarEventos,
   rotuloAutor,
   type EventoTimeline,
} from "@/features/timeline";

function ev(id: string, categoria: EventoTimeline["categoria"], em: string, p: Partial<EventoTimeline> = {}): EventoTimeline {
   return {
      id,
      tipo: "x",
      categoria,
      em,
      autor: { tipo: "SISTEMA", id: null, nome: null },
      titulo: id,
      detalhe: null,
      visivelAoCandidato: false,
      statusEntrega: null,
      ...p,
   };
}

const EVENTOS = [
   ev("a", "SISTEMA", "2026-10-01T10:00:00Z"),
   ev("b", "NOTA", "2026-10-02T10:00:00Z"),
   ev("c", "MENSAGEM", "2026-10-03T10:00:00Z"),
   ev("d", "DECISAO", "2026-10-03T10:00:00Z"),
];

describe("filtros", () => {
   it("cada filtro mostra só a sua categoria; Tudo mostra todas", () => {
      expect(filtrarEventos(EVENTOS, "TUDO")).toHaveLength(4);
      expect(filtrarEventos(EVENTOS, "NOTAS").map(e => e.id)).toEqual(["b"]);
      expect(filtrarEventos(EVENTOS, "MENSAGENS").map(e => e.id)).toEqual(["c"]);
      expect(filtrarEventos(EVENTOS, "SISTEMA").map(e => e.id)).toEqual(["a"]);
      expect(filtrarEventos(EVENTOS, "DECISOES").map(e => e.id)).toEqual(["d"]);
   });
   it("valor desconhecido na URL vira Tudo", () => {
      expect(lerFiltro("NOTAS")).toBe("NOTAS");
      expect(lerFiltro("qualquer")).toBe("TUDO");
      expect(lerFiltro(null)).toBe("TUDO");
   });
});

describe("ordem e paginação", () => {
   it("mais recente primeiro; empate fica com o registrado por último", () => {
      expect(ordenarRecentesPrimeiro(EVENTOS).map(e => e.id)).toEqual(["d", "c", "b", "a"]);
   });
   it("cursor percorre tudo sem repetir nem pular", () => {
      const lista = Array.from({ length: 65 }, (_, i) => i);
      const p1 = paginarEventos(lista, null);
      const p2 = paginarEventos(lista, p1.proximoCursor);
      const p3 = paginarEventos(lista, p2.proximoCursor);
      expect([p1.itens.length, p2.itens.length, p3.itens.length]).toEqual([30, 30, 5]);
      expect(p3.proximoCursor).toBeNull();
      expect([...p1.itens, ...p2.itens, ...p3.itens]).toEqual(lista);
   });
});

describe("mensagens", () => {
   it("bolha só para mensagem visível ao candidato; direção pelo autor", () => {
      const entrada = ev("m", "MENSAGEM", "2026-10-03T10:00:00Z", {
         visivelAoCandidato: true,
         detalhe: "Quero saber",
         autor: { tipo: "CANDIDATO", id: null, nome: "Ana" },
      });
      expect(ehMensagemWhatsapp(entrada)).toBe(true);
      expect(direcaoMensagem(entrada)).toBe("ENTRADA");
      expect(rotuloAutor(entrada.autor)).toBe("Ana (candidato)");
      expect(ehMensagemWhatsapp(ev("s", "SISTEMA", "2026-10-03T10:00:00Z", { detalhe: "x" }))).toBe(false);
   });
   it("lê botões de resposta rápida gravados no evento", () => {
      expect(botoesDoEvento(ev("x", "MENSAGEM", "2026-10-03T10:00:00Z", { dados: { botoes: ["Enviar agora", 3] } }))).toEqual([
         "Enviar agora",
      ]);
      expect(botoesDoEvento(ev("y", "MENSAGEM", "2026-10-03T10:00:00Z"))).toEqual([]);
   });
});
