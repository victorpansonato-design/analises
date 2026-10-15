import { describe, expect, it } from "vitest";

import {
   aceitavelEmLote,
   agruparPorPeriodo,
   alternarSelecao,
   compararCh,
   contarFiltros,
   decidirOtimista,
   decisaoExibida,
   divergente,
   extracaoBaixa,
   filtrarItens,
   intervalo,
   origensNaoAproveitadas,
   pendente,
   proximoPendente,
   reverterOtimista,
   vizinho,
} from "@/features/analise/domain/analise.domain";
import { REGRAS_ANALISE } from "@/features/casos";

import { decidido, EM, item, origem, POR, sugestao } from "./fixtures";

describe("filtros da análise", () => {
   const itens = [
      item("a"), // sugerido, alta
      item("b", { sugestao: sugestao({ confianca: "MEDIA" }) }),
      item("c", { sugestao: sugestao({ alertas: ["CH 70% da exigida"] }) }),
      decidido("d", "REGULAR"), // decisão diferente da sugestão (DISPENSA)
      decidido("e", "DISPENSA"),
      item("f", { estado: "PERGUNTA_ABERTA", pergunta: { texto: "Dispensa?", decisaoSugerida: "ADAP", por: POR, em: EM, resposta: null } }),
      decidido("g", "DISPENSA", { estado: "RESPONDIDO" }),
   ];

   it("pendente = sem decisão confirmada (RESPONDIDO conta como decidido)", () => {
      expect(itens.filter(pendente).map(i => i.id)).toEqual(["a", "b", "c", "f"]);
   });

   it("divergente = confiança média/baixa, alertas ou decisão diferente da sugestão", () => {
      expect(itens.filter(divergente).map(i => i.id)).toEqual(["b", "c", "d"]);
   });

   it("conta cada filtro", () => {
      expect(contarFiltros(itens)).toEqual({ todas: 7, pendentes: 4, divergentes: 3, contestadas: 0, coordenacao: 2, decididas: 3 });
   });

   it("busca sem acento, pelo código e também pelo nome da origem", () => {
      const lista = [
         item("x", { codigo: "26_GPESS_60", disciplina: "Gestão de pessoas", sugestao: sugestao({ origemIds: ["o9"] }) }),
         item("y", { disciplina: "Contabilidade" }),
      ];
      const porId = new Map([["o9", origem("o9", { nome: "Recursos humanos" })]]);
      expect(filtrarItens(lista, "todas", "gestao").map(i => i.id)).toEqual(["x"]);
      expect(filtrarItens(lista, "todas", "26_gpess_60").map(i => i.id)).toEqual(["x"]);
      expect(filtrarItens(lista, "todas", "humanos", porId).map(i => i.id)).toEqual(["x"]);
      expect(filtrarItens(lista, "pendentes", "conta").map(i => i.id)).toEqual(["y"]);
   });
});

describe("agrupamento por período", () => {
   it("ordena por período, mantém a ordem da matriz e põe 'sem período' por último", () => {
      const grupos = agruparPorPeriodo([
         item("e1", { periodo: null }),
         item("p2a", { periodo: 2 }),
         decidido("p1a", "DISPENSA"),
         item("p1b", { periodo: 1 }),
         item("p2b", { periodo: 2 }),
      ]);
      expect(grupos.map(g => g.chave)).toEqual(["p1", "p2", "sem-periodo"]);
      expect(grupos[0].itens.map(i => i.id)).toEqual(["p1a", "p1b"]);
      expect(grupos[0]).toMatchObject({ decididas: 1, dispensadas: 1 });
      expect(grupos[1]).toMatchObject({ decididas: 0, dispensadas: 0 });
   });
});

describe("comparação de CH", () => {
   it("usa REGRAS_ANALISE.chMinimaPercentual como limite", () => {
      const min = REGRAS_ANALISE.chMinimaPercentual;
      expect(compararCh(60 * min, 60).abaixoDoMinimo).toBe(false);
      expect(compararCh(60 * min - 1, 60).abaixoDoMinimo).toBe(true);
      expect(compararCh(48, 60)).toMatchObject({ chOrigem: 48, chDestino: 60, razao: 0.8 });
   });

   it("destino sem CH não divide por zero", () => {
      expect(compararCh(40, 0).razao).toBe(0);
   });

   it("destaca extração com baixa confiança e ignora quando não informada", () => {
      expect(extracaoBaixa({ confiancaExtracao: 0.6 })).toBe(true);
      expect(extracaoBaixa({ confiancaExtracao: 0.97 })).toBe(false);
      expect(extracaoBaixa({ confiancaExtracao: null })).toBe(false);
   });
});

describe("seleção e navegação", () => {
   const ordem = ["a", "b", "c", "d", "e"];

   it("intervalo funciona nos dois sentidos", () => {
      expect(intervalo(ordem, "b", "d")).toEqual(["b", "c", "d"]);
      expect(intervalo(ordem, "d", "b")).toEqual(["b", "c", "d"]);
      expect(intervalo(ordem, "a", "z")).toEqual([]);
   });

   it("Shift marca o intervalo a partir da âncora; sem Shift alterna", () => {
      const s1 = alternarSelecao(new Set(), ordem, "b", null, false);
      expect([...s1]).toEqual(["b"]);
      const s2 = alternarSelecao(s1, ordem, "e", "b", true);
      expect([...s2].sort()).toEqual(["b", "c", "d", "e"]);
      const s3 = alternarSelecao(s2, ordem, "c", "e", false);
      expect(s3.has("c")).toBe(false);
   });

   it("setas param nas pontas", () => {
      expect(vizinho(ordem, "e", 1)).toBe("e");
      expect(vizinho(ordem, "a", -1)).toBe("a");
      expect(vizinho(ordem, null, 1)).toBe("a");
   });

   it("] e [ pulam para o próximo pendente, com volta", () => {
      const porId = new Map([
         ["a", item("a")],
         ["b", decidido("b", "DISPENSA")],
         ["c", decidido("c", "REGULAR")],
         ["d", item("d")],
         ["e", decidido("e", "DP")],
      ]);
      expect(proximoPendente(ordem, porId, "a", 1)).toBe("d");
      expect(proximoPendente(ordem, porId, "d", 1)).toBe("a");
      expect(proximoPendente(ordem, porId, "a", -1)).toBe("d");
   });
});

describe("sugestão x decisão", () => {
   it("sugestão aparece como fantasma; decisão confirmada é sólida", () => {
      expect(decisaoExibida(item("a"))).toEqual({ valor: "DISPENSA", fantasma: true });
      expect(decisaoExibida(decidido("b", "REGULAR"))).toEqual({ valor: "REGULAR", fantasma: false });
      expect(decisaoExibida(item("c", { sugestao: null }))).toEqual({ valor: null, fantasma: true });
   });

   it("lote só aceita SUGERIDO de alta confiança ou regra", () => {
      expect(aceitavelEmLote(item("a"))).toBe(true);
      expect(aceitavelEmLote(item("b", { sugestao: sugestao({ confianca: "REGRA", fonte: "REGRA" }) }))).toBe(true);
      expect(aceitavelEmLote(item("c", { sugestao: sugestao({ confianca: "MEDIA" }) }))).toBe(false);
      expect(aceitavelEmLote(decidido("d", "DISPENSA"))).toBe(false);
   });

   it("decisão otimista: igual à sugestão herda a fonte; diferente vira ANALISTA com motivo", () => {
      const igual = decidirOtimista(
         item("a", { sugestao: sugestao({ fonte: "REGRA", confianca: "REGRA" }) }),
         { valor: "DISPENSA" },
         POR,
         EM,
         false,
      );
      expect(igual.decisao).toMatchObject({ valor: "DISPENSA", origem: "REGRA", motivoAlteracao: null });
      const diferente = decidirOtimista(item("b"), { valor: "ADAP", motivoAlteracao: "CH_INSUFICIENTE" }, POR, EM, false);
      expect(diferente).toMatchObject({ estado: "DECIDIDO", decisao: { origem: "ANALISTA", motivoAlteracao: "CH_INSUFICIENTE" } });
      expect(decidirOtimista(item("c"), { valor: "DISPENSA" }, POR, EM, true).decisao?.origem).toBe("COORDENACAO");
   });

   it("reverter devolve só o DECIDIDO para sugestão", () => {
      expect(reverterOtimista(decidido("a", "DISPENSA"))).toMatchObject({ estado: "SUGERIDO", decisao: null });
      const respondido = decidido("b", "DISPENSA", { estado: "RESPONDIDO" });
      expect(reverterOtimista(respondido)).toBe(respondido);
   });

   it("origens não aproveitadas: fora de toda dispensa decidida ou sugerida", () => {
      const itens = [
         item("a", { sugestao: sugestao({ origemIds: ["o1"] }) }),
         decidido("b", "REGULAR", { decisao: null, estado: "SUGERIDO", sugestao: sugestao({ decisao: "REGULAR", origemIds: ["o2"] }) }),
      ];
      expect(origensNaoAproveitadas(itens, [origem("o1"), origem("o2"), origem("o3")]).map(o => o.id)).toEqual(["o2", "o3"]);
   });
});
