import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { HistoricoCaso, type EventoTimeline } from "@/features/timeline";
import { montarDetalhe, usuarioAtual } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { handlers } from "@/mocks/handlers";
import { API } from "@/mocks/lib/http";
import { renderComProviders } from "../../../helpers/render";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));
const servidor = setupServer(...handlers);
beforeAll(() => servidor.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());
beforeEach(() => iniciarDb());

it("salva a observação no protocolo e mantém o mesmo registro na miniaba Histórico", async () => {
   const caso = montarDetalhe(db.casos.get("c-demo-analise")!, usuarioAtual(), new Date());
   renderComProviders(<HistoricoCaso caso={caso} />);
   const painel = within(screen.getByRole("region", { name: "Observações" }));
   fireEvent.click(painel.getByRole("button", { name: "Adicionar observação" }));
   const campo = painel.getByRole("combobox", { name: "Nota interna" });
   expect(campo).toHaveFocus();
   fireEvent.change(campo, { target: { value: "Conferir a oferta antes de orientar a matrícula." } });
   fireEvent.click(painel.getByRole("button", { name: "Salvar nota" }));
   expect(await painel.findByText("Conferir a oferta antes de orientar a matrícula.")).toBeInTheDocument();
   expect(campo).toHaveValue("");
   const bolha = painel.getByText("Conferir a oferta antes de orientar a matrícula.").closest(".observacao-bolha")!;
   expect(bolha).toHaveTextContent("Conferir a oferta antes de orientar a matrícula.");
   expect(bolha.querySelector("time")).toHaveAttribute("dateTime");
   const datas = [...screen.getByRole("region", { name: "Observações" }).querySelectorAll("time")].map(t => Date.parse(t.dateTime));
   expect(datas).toEqual([...datas].sort((a, b) => b - a));
   fireEvent.click(screen.getByRole("tab", { name: "Histórico" }));
   const registros = await screen.findByRole("tabpanel", { name: "Histórico" });
   expect(await within(registros).findByText("Conferir a oferta antes de orientar a matrícula.")).toBeInTheDocument();
   fireEvent.click(screen.getByRole("tab", { name: "Observações" }));
   expect(painel.getByText("Conferir a oferta antes de orientar a matrícula.")).toBeVisible();
});

it("preserva o rascunho quando a equipe alterna as miniabas", () => {
   const caso = montarDetalhe(db.casos.get("c-demo-documentos")!, usuarioAtual(), new Date());
   renderComProviders(<HistoricoCaso caso={caso} />);
   fireEvent.click(screen.getByRole("button", { name: "Adicionar observação" }));
   const campo = screen.getByRole("combobox", { name: "Nota interna" });
   fireEvent.change(campo, { target: { value: "Aguardando conferência dos planos de ensino." } });
   fireEvent.click(screen.getByRole("tab", { name: "Mensagens" }));
   expect(screen.queryByRole("combobox", { name: "Nota interna" })).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole("tab", { name: "Observações" }));
   expect(screen.getByRole("combobox", { name: "Nota interna" })).toHaveValue("Aguardando conferência dos planos de ensino.");
});

it("permite enviar mensagem a partir do painel compacto e volta ao painel após o envio", async () => {
   const caso = montarDetalhe(db.casos.get("c-demo-documentos")!, usuarioAtual(), new Date());
   renderComProviders(<HistoricoCaso caso={caso} renderMensagem={fim => <button onClick={fim}>Concluir envio autorizado</button>} />);
   fireEvent.click(screen.getByRole("tab", { name: "Mensagens" }));
   fireEvent.click(screen.getByRole("button", { name: "Enviar mensagem ao candidato" }));
   const gaveta = await screen.findByRole("dialog", { name: "Mensagem ao candidato" });
   fireEvent.click(within(gaveta).getByRole("button", { name: "Concluir envio autorizado" }));
   await waitFor(() => expect(screen.queryByRole("dialog", { name: "Mensagem ao candidato" })).not.toBeInTheDocument());
   expect(screen.getByRole("tab", { name: "Mensagens" })).toHaveAttribute("aria-selected", "true");
});

it("mostra três observações recentes e permite consultar todas as anteriores", async () => {
   const caso = montarDetalhe(db.casos.get("c-demo-analise")!, usuarioAtual(), new Date());
   db.eventos.set(
      caso.id,
      Array.from({ length: 7 }, (_, i): EventoTimeline => ({
         id: `nota-${i}`,
         tipo: "nota.adicionada",
         categoria: "NOTA",
         em: new Date(Date.now() - i * 60000).toISOString(),
         autor: { tipo: "PESSOA", id: "u-ana-1", nome: "Equipe" },
         titulo: "Nota interna",
         detalhe: `Observação ${i + 1}`,
         visivelAoCandidato: false,
         statusEntrega: null,
      })),
   );
   renderComProviders(<HistoricoCaso caso={caso} />);
   expect(await screen.findByText("Observação 1")).toBeInTheDocument();
   expect(screen.getByText("Observação 3")).toBeInTheDocument();
   expect(screen.queryByText("Observação 4")).not.toBeInTheDocument();
   fireEvent.click(screen.getByRole("button", { name: "Observações anteriores" }));
   expect(screen.getByText("Observação 6")).toBeInTheDocument();
   fireEvent.click(screen.getByRole("button", { name: "Observações anteriores" }));
   expect(screen.getByText("Observação 7")).toBeInTheDocument();
   expect(screen.queryByRole("button", { name: "Observações anteriores" })).not.toBeInTheDocument();
});

it("preserva as notas já carregadas se a consulta das anteriores falhar", async () => {
   const caso = montarDetalhe(db.casos.get("c-demo-analise")!, usuarioAtual(), new Date());
   const eventos = Array.from({ length: 30 }, (_, i): EventoTimeline => ({
      id: `antiga-${i}`,
      tipo: "nota.adicionada",
      categoria: "NOTA",
      em: new Date(Date.now() - i * 60000).toISOString(),
      autor: { tipo: "PESSOA", id: "u-ana-1", nome: "Equipe" },
      titulo: "Nota interna",
      detalhe: `Nota preservada ${i + 1}`,
      visivelAoCandidato: false,
      statusEntrega: null,
   }));
   servidor.use(
      http.get(`${API}/casos/:casoId/timeline`, ({ request }) => {
         if (new URL(request.url).searchParams.has("cursor"))
            return HttpResponse.json({ error: { message: "Indisponível" } }, { status: 503 });
         return HttpResponse.json({ data: { itens: eventos, proximoCursor: "30" } });
      }),
   );
   renderComProviders(<HistoricoCaso caso={caso} />);
   await screen.findByText("Nota preservada 1");
   for (let i = 0; i < 9; i++) fireEvent.click(screen.getByRole("button", { name: "Observações anteriores" }));
   expect(screen.getByText("Nota preservada 30")).toBeInTheDocument();
   fireEvent.click(screen.getByRole("button", { name: "Observações anteriores" }));
   expect(await screen.findByRole("alert")).toHaveTextContent("As notas já carregadas continuam disponíveis");
   expect(screen.getByText("Nota preservada 1")).toBeVisible();
   expect(screen.getByText("Nota preservada 30")).toBeVisible();
});
