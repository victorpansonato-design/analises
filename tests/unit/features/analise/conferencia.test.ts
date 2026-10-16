/** Conferência lado a lado: documentos por instituição, grifo da IA e navegação pelas dúvidas. */
import { describe, expect, it } from "vitest";

import {
   documentoDoGrifo,
   documentosDoHistorico,
   grifoDoItem,
   iaEmDuvida,
   perguntaAberta,
   proximaDuvida,
   proximaQue,
   semestresDoDocumento,
} from "@/features/analise/domain/conferencia";

import { decidido, item, origem, sugestao } from "./fixtures";

const ORIGEM = [
   origem("o1", { ies: "Faculdade A", ano: 2025, semestre: 2 }),
   origem("o2", { ies: "Faculdade A", ano: 2025, semestre: 1 }),
   origem("o3", { ies: "Faculdade B", ano: 2024, semestre: 1 }),
];

describe("documentos do histórico", () => {
   it("um documento por instituição, o maior primeiro, disciplinas na ordem cursada", () => {
      const docs = documentosDoHistorico(ORIGEM);
      expect(docs.map(d => d.instituicao)).toEqual(["Faculdade A", "Faculdade B"]);
      expect(docs[0].itens.map(o => o.id)).toEqual(["o2", "o1"]);
      expect(docs[0].periodo).toEqual({ de: "2025/1", ate: "2025/2" });
      expect(semestresDoDocumento(docs[0]).map(s => s.titulo)).toEqual(["1º semestre de 2025", "2º semestre de 2025"]);
   });
});

describe("grifo da IA", () => {
   it("dúvida quando a confiança é média ou baixa, ou há alerta", () => {
      const duvidosa = item("a", { sugestao: sugestao({ confianca: "MEDIA", origemIds: ["o3"], justificativa: "CH abaixo" }) });
      expect(iaEmDuvida(duvidosa)).toBe(true);
      expect(grifoDoItem(duvidosa)).toEqual({ origemIds: ["o3"], tom: "duvida", nota: "CH abaixo" });
      expect(documentoDoGrifo(documentosDoHistorico(ORIGEM), grifoDoItem(duvidosa))).toBe("doc-2");
   });

   it("confiante é correspondência; sem origem não grifa e explica", () => {
      expect(grifoDoItem(item("b", { sugestao: sugestao({ confianca: "ALTA", origemIds: ["o1"] }) })).tom).toBe("correspondencia");
      const semOrigem = grifoDoItem(
         item("c", { sugestao: sugestao({ confianca: "ALTA", origemIds: [], justificativa: "Sem correspondente" }) }),
      );
      expect(semOrigem).toMatchObject({ origemIds: [], tom: "sem-origem", nota: "Sem correspondente" });
   });

   it("decisão da pessoa encerra a dúvida e manda no grifo", () => {
      const d = decidido("d", "DISPENSA", { sugestao: sugestao({ confianca: "BAIXA", origemIds: ["o1"] }) });
      expect(iaEmDuvida(d)).toBe(false);
      expect(grifoDoItem(d).tom).toBe("correspondencia");
   });

   it("próxima dúvida dá a volta e volta pela lista", () => {
      const itens = [
         item("a", { sugestao: sugestao({ confianca: "MEDIA" }) }),
         item("b", { sugestao: sugestao({ confianca: "ALTA" }) }),
         item("c", { sugestao: sugestao({ confianca: "BAIXA" }) }),
      ];
      expect(proximaDuvida(itens, "a")).toBe("c");
      expect(proximaDuvida(itens, "c")).toBe("a");
      expect(proximaDuvida(itens, "a", -1)).toBe("c");
      expect(proximaDuvida([item("x", { sugestao: sugestao({ confianca: "ALTA" }) })], null)).toBeNull();
   });
});

describe("navegação pelas perguntas da coordenação", () => {
   const itens = [
      item("a", { estado: "PERGUNTA_ABERTA" }),
      item("b"),
      item("c", { estado: "RESPONDIDO" }),
      item("d", { estado: "PERGUNTA_ABERTA" }),
   ];

   it("anda só pelas perguntas abertas e dá a volta", () => {
      expect(proximaQue(itens, "a", perguntaAberta)).toBe("d");
      expect(proximaQue(itens, "d", perguntaAberta)).toBe("a");
      expect(proximaQue(itens, "a", perguntaAberta, -1)).toBe("d");
      expect(proximaQue(itens, null, perguntaAberta)).toBe("a");
   });

   it("sem nenhuma aberta, devolve nulo", () => {
      expect(proximaQue([item("x"), item("y", { estado: "RESPONDIDO" })], "x", perguntaAberta)).toBeNull();
   });
});
