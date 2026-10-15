import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { CalculoDispensa } from "@/features/calculo-dispensa";
import { handlersDispensa } from "@/mocks/handlers/dispensa";
import { renderComProviders } from "../helpers/render";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));
const servidor = setupServer(...handlersDispensa);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

async function consultar() {
   renderComProviders(<CalculoDispensa />);
   fireEvent.click(await screen.findByRole("button", { name: "Consultar RA 2026001" }));
   await screen.findByRole("heading", { name: "Clara Martins Oliveira" });
}

describe("cálculo independente por RA e manual", () => {
   it("carrega dispensas, confere outubro e troca o período sem reaproveitar o financeiro anterior", async () => {
      await consultar();
      expect(screen.getByRole("checkbox", { name: "Cursar Comunicação escrita" })).not.toBeChecked();
      expect(within(screen.getByRole("region", { name: "Resultado do cálculo" })).getByText("R$ 600,00")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Ver financeiro/ }));
      const outubro = screen.getByRole("rowheader", { name: /outubro/i }).closest("tr")!;
      expect(within(outubro).getByText("+ R$ 150,00")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Voltar ao cálculo" }));
      await waitFor(() => expect(screen.queryByRole("heading", { name: "Financeiro do aluno" })).not.toBeInTheDocument());
      fireEvent.change(screen.getByRole("combobox", { name: "Período letivo" }), { target: { value: "0-2026-1-Noturno-1" } });
      expect(screen.getByRole("checkbox", { name: "Cursar Comunicação escrita I" })).toBeChecked();
      fireEvent.click(screen.getByRole("button", { name: /Ver financeiro/ }));
      expect(screen.getByRole("rowheader", { name: /janeiro/i })).toBeInTheDocument();
      expect(screen.queryByRole("rowheader", { name: /outubro/i })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Valores conferem com o cálculo" })).toBeInTheDocument();
   }, 20000);

   it("restaura o cadastro após ajustes e usa a fórmula correta ao alternar perfil", async () => {
      await consultar();
      fireEvent.change(screen.getByRole("combobox", { name: "Regra de cálculo" }), { target: { value: "ceu" } });
      expect(within(screen.getByRole("region", { name: "Resultado do cálculo" })).getAllByText("R$ 330,00")).toHaveLength(2);
      fireEvent.change(screen.getByRole("combobox", { name: "Regra de cálculo" }), { target: { value: "prouni50" } });
      expect(within(screen.getByRole("region", { name: "Resultado do cálculo" })).getAllByText("R$ 500,00")).toHaveLength(2);
      fireEvent.click(screen.getByRole("checkbox", { name: "Cursar Comunicação escrita" }));
      fireEvent.click(screen.getByRole("button", { name: "Restaurar cadastro" }));
      expect(screen.getByRole("checkbox", { name: "Cursar Comunicação escrita" })).not.toBeChecked();
      expect(screen.getByRole("combobox", { name: "Regra de cálculo" })).toHaveValue("normal");
      expect(screen.queryByRole("button", { name: "Restaurar cadastro" })).not.toBeInTheDocument();
   });

   it("oferece cálculo manual após RA não encontrado e troca contrato/grade pelo catálogo", async () => {
      renderComProviders(<CalculoDispensa />);
      fireEvent.change(screen.getByRole("textbox", { name: "RA do aluno" }), { target: { value: "9999999" } });
      fireEvent.click(screen.getByRole("button", { name: "Buscar aluno" }));
      fireEvent.click(await screen.findByRole("button", { name: "Fazer cálculo manual" }));
      await screen.findByRole("combobox", { name: "Curso" });
      fireEvent.change(screen.getByRole("combobox", { name: "Curso" }), { target: { value: "Direito" } });
      expect(screen.getByRole("spinbutton", { name: "Contrato mensal (R$)" })).toHaveValue(2400);
      expect(screen.getByRole("checkbox", { name: "Cursar Direito constitucional" })).toBeChecked();
      expect(screen.queryByRole("button", { name: /Ver financeiro/ })).not.toBeInTheDocument();
      fireEvent.change(screen.getByRole("spinbutton", { name: "Bolsa comercial (%)" }), { target: { value: "101" } });
      expect(screen.getByText("Informe um percentual de 0 a 100.")).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "Resultado do cálculo" })).getByText("—")).toBeInTheDocument();
   });
});
