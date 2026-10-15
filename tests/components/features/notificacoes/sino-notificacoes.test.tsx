/** Sino de notificações: contagem de não lidas no rótulo, vazio com frase, abrir marca como lida. */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import type { Notificacao } from "@/features/notificacoes/types/notificacao.schema";

const estado = vi.hoisted(() => ({ lista: [] as Notificacao[], marcar: vi.fn(), marcarTodas: vi.fn() }));

vi.mock("@/features/notificacoes/api/notificacoes.queries", () => ({
   useNotificacoes: () => ({ data: estado.lista, isLoading: false, isError: false, refetch: vi.fn() }),
}));
vi.mock("@/features/notificacoes/api/notificacoes.mutations", () => ({
   useMarcarLida: () => ({ marcar: estado.marcar }),
   useMarcarTodasLidas: () => ({ marcarTodas: estado.marcarTodas, isPending: false }),
}));

import { SinoNotificacoes } from "@/features/notificacoes/components/sino-notificacoes";

const EM = new Date().toISOString();
const n = (id: string, lida: boolean, titulo = `Aviso ${id}`): Notificacao => ({
   id,
   tipo: "ATRIBUIDO",
   casoId: `c-${id}`,
   titulo,
   detalhe: "Pessoa fictícia · Administração",
   em: EM,
   lida,
});

function renderizar(ui: ReactNode) {
   const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
   return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeAll(() => {
   globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
   } as unknown as typeof ResizeObserver;
});

beforeEach(() => {
   estado.lista = [];
   estado.marcar.mockReset();
   estado.marcarTodas.mockReset();
});

describe("SinoNotificacoes", () => {
   it("diz a contagem de não lidas no rótulo e mostra um contador", () => {
      estado.lista = [n("1", false), n("2", false), n("3", true)];
      renderizar(<SinoNotificacoes onAbrirCaso={() => {}} />);
      const botao = screen.getByRole("button", { name: "Notificações, 2 não lidas" });
      expect(botao).toHaveTextContent("2");
   });

   it("sem não lidas, não mostra contador", () => {
      estado.lista = [n("1", true)];
      renderizar(<SinoNotificacoes onAbrirCaso={() => {}} />);
      const botao = screen.getByRole("button", { name: "Notificações, nenhuma não lida" });
      expect(botao).toHaveTextContent("");
   });

   it("vazio explica com uma frase", async () => {
      renderizar(<SinoNotificacoes onAbrirCaso={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
      expect(await screen.findByText("Tudo em dia.")).toBeInTheDocument();
      expect(screen.getByText("Avisamos quando algo precisar de você.")).toBeInTheDocument();
   });

   it("abrir um item abre o caso e marca como lida", async () => {
      estado.lista = [n("1", false, "Caso atribuído a você"), n("2", true, "Coordenação respondeu")];
      const abrir = vi.fn();
      renderizar(<SinoNotificacoes onAbrirCaso={abrir} />);
      fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Caso atribuído a você/ }));
      expect(abrir).toHaveBeenCalledWith("c-1");
      expect(estado.marcar).toHaveBeenCalledWith("1");
   });

   it("marcar todas manda só as não lidas", async () => {
      estado.lista = [n("1", false), n("2", true), n("3", false)];
      renderizar(<SinoNotificacoes onAbrirCaso={() => {}} />);
      fireEvent.click(screen.getByRole("button", { name: /Notificações/ }));
      fireEvent.click(await screen.findByRole("button", { name: "Marcar todas como lidas" }));
      expect(estado.marcarTodas).toHaveBeenCalledWith(["1", "3"]);
   });
});
