import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { LinhaItem, type AcoesLinha } from "@/features/analise/components/linha-item";
import type { ItemAnalise } from "@/features/analise";

import { decidido, item, origem } from "../../../unit/features/analise/fixtures";

function acoes(): AcoesLinha {
   return {
      decidir: vi.fn(),
      focar: vi.fn(),
      selecionar: vi.fn(),
      expandir: vi.fn(),
      perguntar: vi.fn(),
      retirarPergunta: vi.fn(),
      trocarOrigem: vi.fn(),
      historico: vi.fn(),
      motivo: vi.fn(),
   };
}

function renderizar(i: ItemAnalise, a = acoes(), podeDecidir = true, expandido = false, origens = [origem("o1", { ch: 40 })]) {
   render(
      <div role="grid">
         <LinhaItem
            item={i}
            origemPorId={new Map(origens.map(o => [o.id, o]))}
            focado
            selecionado={false}
            expandido={expandido}
            podeDecidir={podeDecidir}
            podePerguntar
            layoutBase="t"
            acoes={a}
         />
      </div>,
   );
   return a;
}

function pastilha(rotulo: string) {
   return screen.getByRole("radio", { name: rotulo }).querySelector(".seg-thumb");
}

describe("LinhaItem", () => {
   it("mantém a opção não confirmada em tom fantasma sem texto extra na linha", () => {
      renderizar(item("a"));
      expect(screen.getByRole("radio", { name: "Dispensa" })).toHaveAttribute("aria-checked", "true");
      expect(pastilha("Dispensa")).toHaveClass("opacity-45");
      expect(screen.getByText(/ainda não confirmada/)).toHaveClass("sr-only");
      expect(screen.queryByText(/Sugestão · IA/)).not.toBeInTheDocument();
   });

   it("decisão confirmada fica sólida", () => {
      renderizar(decidido("a", "REGULAR"));
      expect(screen.getByRole("radio", { name: "Regular" })).toHaveAttribute("aria-checked", "true");
      expect(pastilha("Regular")).not.toHaveClass("opacity-45");
   });

   it("clicar na própria sugestão confirma", () => {
      const i = item("a");
      const a = renderizar(i);
      fireEvent.click(screen.getByRole("radio", { name: "Dispensa" }));
      expect(a.decidir).toHaveBeenCalledWith(i, "DISPENSA");
   });

   it("comparação de CH fica disponível nos detalhes", () => {
      renderizar(item("a"), acoes(), true, true);
      expect(screen.getByText(/abaixo do mínimo/)).toBeInTheDocument();
   });

   it("exibe os dados essenciais em colunas e as opções na ordem pedida", () => {
      renderizar(item("a", { codigo: "26_AEDAE_60", disciplina: "Análise estratégica de dados aplicada à educação" }));
      const celulas = screen.getAllByRole("gridcell");
      expect(celulas[1]).toHaveTextContent("Análise estratégica de dados aplicada à educação");
      expect(celulas[2]).toHaveTextContent("26_AEDAE_60");
      expect(celulas[3]).toHaveTextContent("60 h");
      expect(celulas[4]).toHaveTextContent("2024/1");
      expect(celulas[5]).toHaveTextContent("8,0");
      expect(screen.getAllByRole("radio").map(r => r.textContent)).toEqual(["Dispensa", "DP", "ADAP", "Regular"]);
      expect(screen.queryByText(/abaixo do mínimo/)).not.toBeInTheDocument();
      expect(screen.queryByText("Faculdade Fictícia")).not.toBeInTheDocument();
   });

   it("não inventa período ou nota sem origem", () => {
      renderizar(item("a", { sugestao: null }));
      const celulas = screen.getAllByRole("gridcell");
      expect(celulas[4]).toHaveTextContent("—");
      expect(celulas[5]).toHaveTextContent("—");
   });

   it("mantém período e nota alinhados quando várias origens sustentam a dispensa", () => {
      renderizar(item("a", { sugestao: { ...item("a").sugestao!, origemIds: ["o2", "o1"] } }), acoes(), true, false, [
         origem("o1", { ano: 2024, semestre: 1, nota: null }),
         origem("o2", { ano: 2025, semestre: 2, nota: 0 }),
      ]);
      const celulas = screen.getAllByRole("gridcell");
      expect(Array.from(celulas[4].children).map(c => c.textContent)).toEqual(["2025/2", "2024/1"]);
      expect(Array.from(celulas[5].children).map(c => c.textContent)).toEqual(["0,0", "—"]);
   });

   it("somente leitura desabilita a decisão", () => {
      renderizar(item("a"), acoes(), false);
      expect(screen.getByRole("radio", { name: "Dispensa" })).toBeDisabled();
   });
});
