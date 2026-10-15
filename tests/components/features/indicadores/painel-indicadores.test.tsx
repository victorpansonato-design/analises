/** Painel de indicadores: destaques no topo, todos os indicadores recolhidos, IA só para a gestão e MetricSheet pela URL. */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Indicadores } from "@/features/indicadores/types/indicadores.schema";

import { calcularIndicadores, filtrarCasos, funilDe } from "@/mocks/handlers/indicadores";
import { semearCasos } from "@/mocks/seed/casos";

const AGORA = new Date("2026-10-09T15:00:00Z");
const CASOS = filtrarCasos(semearCasos(AGORA).slice(0, 80), { ciclo: null, tipo: null, curso: null, modalidade: null });

function dados(porPessoa: boolean): Indicadores {
   return {
      funil: funilDe(CASOS, AGORA),
      ...calcularIndicadores({ casos: CASOS, agora: AGORA, porPessoa, analise: () => null }),
      geradoEm: AGORA.toISOString(),
   };
}

const estado = vi.hoisted(() => ({ dados: null as Indicadores | null, papeis: ["ANALISTA"] as string[] }));

vi.mock("@/features/indicadores/api/indicadores.queries", () => ({
   useIndicadores: () => ({ data: estado.dados, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/features/sessao", async importOriginal => ({
   ...(await importOriginal<typeof import("@/features/sessao")>()),
   useMe: () => ({ data: { id: "u", nome: "Pessoa fictícia", papeis: estado.papeis, cursosCoordenados: [] } }),
}));
vi.mock("@/features/casos", async importOriginal => ({
   ...(await importOriginal<typeof import("@/features/casos")>()),
   useCursos: () => ({ data: [], isLoading: false }),
}));

import { PainelIndicadores } from "@/features/indicadores/components/painel-indicadores";

function renderizar(url = "/gestao") {
   const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
   return render(
      <QueryClientProvider client={qc}>
         <MemoryRouter initialEntries={[url]}>
            <PainelIndicadores />
         </MemoryRouter>
      </QueryClientProvider>,
   );
}

beforeAll(() => {
   globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
   } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
   estado.papeis = ["ANALISTA"];
   estado.dados = dados(false);
});

describe("PainelIndicadores", () => {
   it("abre com os destaques e os demais indicadores recolhidos", () => {
      renderizar();
      expect(screen.getByRole("heading", { name: "Conversão em matrícula" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Onde estão os protocolos" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Por que perdemos" })).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Fluxo" })).not.toBeInTheDocument();
   });

   it("mostra grupos disponíveis com denominador e sem textos de demonstração", () => {
      renderizar();
      fireEvent.click(screen.getByRole("button", { name: /Ver todos os indicadores/ }));
      expect(screen.queryByText("Dados fictícios")).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Fluxo" })).toBeInTheDocument();
      expect(screen.getAllByText("÷").length).toBeGreaterThan(0);
      expect(screen.queryByRole("heading", { name: "Pré-análise com IA" })).not.toBeInTheDocument();
      expect(screen.queryByText(/aparecem só para a diretoria/)).not.toBeInTheDocument();
   });

   it("gestão vê IA e conversão por responsável", () => {
      estado.papeis = ["GESTAO"];
      estado.dados = dados(true);
      renderizar();
      fireEvent.click(screen.getByRole("button", { name: /Ver todos os indicadores/ }));
      expect(screen.getByRole("heading", { name: "Pré-análise com IA" })).toBeInTheDocument();
      expect(screen.getByText("Por responsável")).toBeInTheDocument();
   });

   it("abre o MetricSheet pela URL com medida, composição e como ler", async () => {
      renderizar("/gestao?metrica=atrasados-agora");
      const folha = await screen.findByRole("dialog");
      expect(within(folha).getByText("Do que é feito")).toBeInTheDocument();
      expect(within(folha).getByText("Como ler")).toBeInTheDocument();
      expect(within(folha).getByRole("button", { name: "Voltar ao painel" })).toBeInTheDocument();
      fireEvent.click(within(folha).getByRole("button", { name: "Voltar ao painel" }));
   });
});
