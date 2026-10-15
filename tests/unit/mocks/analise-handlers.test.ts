import { describe, expect, it } from "vitest";

import type { AnaliseRegistro } from "@/mocks/db/tipos";
import {
   aplicarLote,
   decidirItem,
   ErroAnalise,
   incorporarSugestoes,
   perguntarItem,
   previaMatriz,
   responderItem,
   retirarPergunta,
   validarAtividade,
   validarTextoPergunta,
} from "@/mocks/handlers/analise";
import { REGRAS_ANALISE } from "@/features/casos";

import { decidido, EM, item, POR, sugestao } from "../features/analise/fixtures";

function registro(
   itens = [
      item("a"),
      item("b", { sugestao: sugestao({ confianca: "MEDIA" }) }),
      item("c", { sugestao: sugestao({ confianca: "REGRA", fonte: "REGRA" }) }),
      decidido("d", "REGULAR"),
   ],
): AnaliseRegistro {
   return { matrizId: "adm-20262", itens, origem: [], atividades: [], pratica: [], personalizadas: [], periodoIngresso: null, versao: 1 };
}

describe("decidirItem", () => {
   it("igual à sugestão herda a fonte e ignora o motivo", () => {
      const i = item("a", { sugestao: sugestao({ fonte: "REGRA", confianca: "REGRA" }) });
      decidirItem(i, { valor: "DISPENSA", motivoAlteracao: "OUTRO" }, POR, EM, false);
      expect(i).toMatchObject({ estado: "DECIDIDO", decisao: { valor: "DISPENSA", origem: "REGRA", motivoAlteracao: null, por: POR } });
   });

   it("diferente da sugestão registra ANALISTA e o motivo", () => {
      const i = item("a");
      decidirItem(i, { valor: "ADAP", motivoAlteracao: "CH_INSUFICIENTE" }, POR, EM, false);
      expect(i.decisao).toMatchObject({ valor: "ADAP", origem: "ANALISTA", motivoAlteracao: "CH_INSUFICIENTE" });
   });

   it("coordenação decidindo grava COORDENACAO", () => {
      const i = item("a");
      decidirItem(i, { valor: "DISPENSA" }, POR, EM, true);
      expect(i.decisao?.origem).toBe("COORDENACAO");
   });

   it("analista não decide item com pergunta aberta", () => {
      const i = item("a");
      perguntarItem(i, { texto: "Dispensa ou adaptação?", decisaoSugerida: "ADAP" }, POR, EM);
      expect(() => decidirItem(i, { valor: "DISPENSA" }, POR, EM, false)).toThrow(ErroAnalise);
   });
});

describe("aplicarLote", () => {
   it("ACEITAR_SUGESTOES_ALTA pega só SUGERIDO de alta confiança ou regra", () => {
      const a = registro();
      const afetados = aplicarLote(a, { modo: "ACEITAR_SUGESTOES_ALTA" }, POR, EM, false);
      expect(afetados).toEqual(["a", "c"]);
      expect(a.itens.find(i => i.id === "c")?.decisao?.origem).toBe("REGRA");
      expect(a.itens.find(i => i.id === "b")?.estado).toBe("SUGERIDO");
   });

   it("ACEITAR respeita a lista de itens confirmada no modal", () => {
      const a = registro();
      expect(aplicarLote(a, { modo: "ACEITAR_SUGESTOES_ALTA", itemIds: ["c"] }, POR, EM, false)).toEqual(["c"]);
   });

   it("DEFINIR aplica a decisão e pula pergunta aberta", () => {
      const a = registro();
      perguntarItem(a.itens[1], { texto: "Confirmam a dispensa?", decisaoSugerida: "DISPENSA" }, POR, EM);
      const afetados = aplicarLote(a, { modo: "DEFINIR", itemIds: ["a", "b", "d"], decisao: "REGULAR" }, POR, EM, false);
      expect(afetados).toEqual(["a", "d"]);
      expect(a.itens[0].decisao).toMatchObject({ valor: "REGULAR", origem: "ANALISTA" });
      expect(a.itens[1].estado).toBe("PERGUNTA_ABERTA");
   });

   it("DEFINIR sem itens ou sem decisão é recusado", () => {
      expect(() => aplicarLote(registro(), { modo: "DEFINIR", itemIds: [] }, POR, EM, false)).toThrow(ErroAnalise);
   });

   it("REVERTER (Desfazer) devolve os DECIDIDO para sugestão e não mexe em respondidos", () => {
      const a = registro([decidido("a", "DISPENSA"), decidido("b", "DISPENSA", { estado: "RESPONDIDO" })]);
      expect(aplicarLote(a, { modo: "REVERTER", itemIds: ["a", "b"] }, POR, EM, false)).toEqual(["a"]);
      expect(a.itens[0]).toMatchObject({ estado: "SUGERIDO", decisao: null });
      expect(a.itens[1].estado).toBe("RESPONDIDO");
   });

   it("aceitar e depois reverter volta ao estado original", () => {
      const a = registro();
      const ids = aplicarLote(a, { modo: "ACEITAR_SUGESTOES_ALTA" }, POR, EM, false);
      aplicarLote(a, { modo: "REVERTER", itemIds: ids }, POR, EM, false);
      expect(a.itens.filter(i => i.estado === "DECIDIDO").map(i => i.id)).toEqual(["d"]);
   });
});

describe("pergunta e resposta da coordenação", () => {
   it("valida o texto entre 5 e 600 caracteres", () => {
      expect(validarTextoPergunta("oi")).not.toBeNull();
      expect(validarTextoPergunta("x".repeat(601))).not.toBeNull();
      expect(validarTextoPergunta("Dispensa?")).toBeNull();
   });

   it("pergunta abre o item e limpa a decisão; retirar volta para sugestão", () => {
      const i = decidido("a", "DISPENSA");
      perguntarItem(i, { texto: "  CH abaixo do mínimo. Aceitamos?  ", decisaoSugerida: "ADAP" }, POR, EM);
      expect(i).toMatchObject({
         estado: "PERGUNTA_ABERTA",
         decisao: null,
         pergunta: { texto: "CH abaixo do mínimo. Aceitamos?", decisaoSugerida: "ADAP" },
      });
      retirarPergunta(i);
      expect(i).toMatchObject({ estado: "SUGERIDO", pergunta: null });
   });

   it("resposta vira RESPONDIDO com decisão COORDENACAO e não pode ser retirada", () => {
      const i = item("a");
      perguntarItem(i, { texto: "Dispensa ou adaptação?", decisaoSugerida: "ADAP" }, POR, EM);
      const coord = { id: "u-coo-adm", nome: "Coordenação Fictícia" };
      responderItem(i, { decisao: "DISPENSA", comentario: "  Conteúdo equivalente  ", usarComoRegra: true }, coord, EM);
      expect(i).toMatchObject({ estado: "RESPONDIDO", decisao: { valor: "DISPENSA", origem: "COORDENACAO", por: coord } });
      expect(i.pergunta?.resposta).toMatchObject({ comentario: "Conteúdo equivalente", usarComoRegra: true });
      expect(() => retirarPergunta(i)).toThrow(ErroAnalise);
   });

   it("não responde item sem pergunta", () => {
      expect(() => responderItem(item("a"), { decisao: "DISPENSA", usarComoRegra: true }, POR, EM)).toThrow(ErroAnalise);
   });
});

describe("reexecução, prévia de matriz e atividades", () => {
   it("sugestões novas só entram em itens sem decisão", () => {
      const atual = registro([item("a", { sugestao: null }), decidido("b", "REGULAR"), item("c")]);
      const nova = registro([item("a"), item("b", { sugestao: sugestao({ decisao: "DISPENSA" }) }), item("c")]);
      expect(incorporarSugestoes(atual, nova)).toBe(1);
      expect(atual.itens[0].sugestao?.decisao).toBe("DISPENSA");
      expect(atual.itens[1].decisao?.valor).toBe("REGULAR");
   });

   it("prévia conta decisões mapeadas, itens a revisar e decisões sem par", () => {
      const atual = registro([decidido("a", "DISPENSA"), decidido("b", "REGULAR"), item("c")]);
      expect(previaMatriz(atual, [{ id: "a" }, { id: "c" }, { id: "z" }])).toEqual({ mapeadas: 1, revisar: 2, semCorrespondencia: 1 });
   });

   it("atividade acima do limite é recusada com mensagem pronta", () => {
      const max = REGRAS_ANALISE.atividadeComplementarMaxHoras;
      expect(validarAtividade(max)).toBeNull();
      expect(validarAtividade(max + 1)).toContain(`${max} h`);
      expect(validarAtividade(0)).not.toBeNull();
   });
});
