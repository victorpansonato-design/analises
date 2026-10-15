import { fireEvent, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { MatrizCurricular } from "@/features/matriz-curricular";
import { handlersMatrizCurricular } from "@/mocks/handlers/matriz-curricular";
import { renderComProviders } from "../helpers/render";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));
const servidor = setupServer(...handlersMatrizCurricular);
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());

/** Folga para a suíte completa em paralelo (debounce da busca + troca animada de estado). */
const ESPERA = { timeout: 10_000 };

describe("matriz curricular", () => {
   it("abre calma, sem lista; o código acha a oferta e o currículo abre em página inteira", async () => {
      renderComProviders(<MatrizCurricular />, { rota: "/matriz-curricular" });
      expect(screen.getByText("Encontre um curso")).toBeInTheDocument();
      expect(screen.queryByRole("article")).not.toBeInTheDocument();

      fireEvent.change(screen.getByRole("searchbox", { name: "Buscar curso por nome ou código" }), { target: { value: "7008" } });
      const oferta = await screen.findByRole("article", { name: "Administração, EAD" }, ESPERA);
      expect(screen.getAllByRole("article")).toHaveLength(1);
      expect(within(oferta).getByText("1 currículo inativo oculto")).toBeInTheDocument();

      fireEvent.click(within(oferta).getByRole("button", { name: /Abrir Matriz 2026\.1/ }));
      expect(await screen.findByRole("heading", { level: 1, name: "Administração" }, ESPERA)).toBeInTheDocument();
      expect(screen.getByText("ADM-2026-1-EAD")).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "1º período" })).toBeInTheDocument();
      expect(screen.getByText("ADM0101")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("tab", { name: /Disciplinas por grupo/ }));
      expect(await screen.findByRole("heading", { name: "Estágio obrigatório" }, ESPERA)).toBeInTheDocument();
      expect(screen.getByText("A partir do 5º semestre")).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Trabalho de conclusão de curso" })).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Voltar" }));
      expect(await screen.findByRole("article", { name: "Administração, EAD" }, ESPERA)).toBeInTheDocument();
   }, 30_000);

   it("currículo sem grupos explica o vazio", async () => {
      renderComProviders(<MatrizCurricular />, { rota: "/matriz-curricular?curriculo=enf-2025-1-d&aba=grupos" });
      expect(await screen.findByText("Este currículo não tem disciplinas por grupo", {}, ESPERA)).toBeInTheDocument();
   });
});
