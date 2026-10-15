/**
 * Fluxos de ponta a ponta contra o backend simulado: o que cada papel faz no dia a dia, do clique
 * até o caso mudar de etapa (docs/00 §2, critérios de sucesso do PROMPT §7).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "@/contexts/auth/auth-context";
import { usePapelSimuladoStore, type Papel } from "@/features/sessao";
import MainLayout from "@/layout/main-layout";
import AnalisesPage from "@/pages/protected/analises";

import { analiseDoCaso } from "@/mocks/db/repositorio";
import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { handlers } from "@/mocks/handlers";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));

const servidor = setupServer(...handlers);
const ESPERA = { timeout: 20000 };

beforeAll(() => {
   servidor.listen({ onUnhandledRequest: "bypass" });
   window.matchMedia = ((query: string) => ({
      matches: query.includes("min-width"),
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
   })) as unknown as typeof window.matchMedia;
});
afterEach(() => servidor.resetHandlers());
afterAll(() => servidor.close());
beforeEach(() => iniciarDb());

function abrir(rota: string, papel: Papel) {
   usePapelSimuladoStore.setState({ papel });
   const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
   return render(
      <QueryClientProvider client={queryClient}>
         <AuthProvider>
            <MemoryRouter initialEntries={[rota]}>
               <Toaster />
               <Routes>
                  <Route element={<MainLayout />}>
                     <Route path="/analises" element={<AnalisesPage />} />
                  </Route>
               </Routes>
            </MemoryRouter>
         </AuthProvider>
      </QueryClientProvider>,
   );
}

function caso(id: string) {
   const c = db.casos.get(id);
   if (!c) throw new Error(id);
   return c;
}

describe("fluxos por papel", () => {
   it("analista aceita as 32 sugestões de alta confiança em lote", async () => {
      abrir("/analises?caso=c-demo-analise&aba=analise", "ANALISTA");
      fireEvent.click(await screen.findByRole("button", { name: /Aceitar 32 sugestões de alta confiança/ }, ESPERA));
      fireEvent.click(await screen.findByRole("button", { name: "Confirmar 32 decisões" }, ESPERA));
      await waitFor(
         () => expect(analiseDoCaso(caso("c-demo-analise"))?.itens.filter(i => i.estado === "DECIDIDO")).toHaveLength(36),
         ESPERA,
      );
      // O card do próximo passo acompanha: sobram as 9 que pedem julgamento.
      expect(await screen.findByText("Revisar 9 disciplinas pendentes", {}, ESPERA)).toBeInTheDocument();
   }, 60000);

   it("coordenação aprova as perguntas e devolve para a analista", async () => {
      abrir("/analises?caso=c-demo-coordenacao", "COORDENADOR");
      fireEvent.click(await screen.findByRole("button", { name: /Concordar com todas as sugestões/ }, ESPERA));
      expect(await screen.findByText("Perguntas respondidas, falta devolver", {}, ESPERA)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /Devolver para a analista/ }));
      const dialogo = await screen.findByRole("dialog", {}, ESPERA);
      fireEvent.click(within(dialogo).getByRole("button", { name: "Devolver para a analista" }));
      await waitFor(() => expect(caso("c-demo-coordenacao").etapa).toBe("AJUSTE_POS_COORDENACAO"), ESPERA);
   }, 60000);

   it("matrícula envia a proposta com a prévia do WhatsApp", async () => {
      abrir("/analises?caso=c-demo-matricula", "MATRICULA");
      const [primaria] = await screen.findAllByRole("button", { name: /Enviar proposta/ }, ESPERA);
      fireEvent.click(primaria);
      const dialogo = await screen.findByRole("dialog", {}, ESPERA);
      await within(dialogo).findByText(/sua análise ficou pronta/, {}, ESPERA);
      const enviar = within(dialogo)
         .getAllByRole("button", { name: /Enviar/ })
         .at(-1);
      if (!enviar) throw new Error("sem botão de envio");
      await waitFor(() => expect(enviar).not.toBeDisabled(), ESPERA);
      fireEvent.click(enviar);
      await waitFor(() => expect(caso("c-demo-matricula").etapa).toBe("PROPOSTA_ENVIADA"), ESPERA);
   }, 60000);

   it("consultor abre link antigo de conversa e registra observação no painel permanente", async () => {
      abrir("/analises?caso=c-demo-documentos&aba=conversa", "CONSULTOR");
      const adicionar = await screen.findByRole("button", { name: "Adicionar observação" }, ESPERA);
      expect(screen.queryByRole("tab", { name: "Conversa e histórico" })).not.toBeInTheDocument();
      fireEvent.click(adicionar);
      const campo = await screen.findByPlaceholderText(/Escreva para a equipe/, {}, ESPERA);
      fireEvent.change(campo, { target: { value: "Candidato vai mandar os planos de ensino amanhã." } });
      fireEvent.click(screen.getByRole("button", { name: /Salvar nota/ }));
      expect(await screen.findByText(/vai mandar os planos de ensino amanhã/, {}, ESPERA)).toBeInTheDocument();
   }, 60000);

   it("consultor vê o documento que falta na aba Documentos", async () => {
      abrir("/analises?caso=c-demo-documentos&aba=documentos", "CONSULTOR");
      expect(await screen.findByText(/Planos de ensino/, {}, ESPERA)).toBeInTheDocument();
      expect(screen.getByText("Falta 1 documento obrigatório")).toBeInTheDocument();
   }, 60000);

   it("analista abre a busca global com Ctrl+K e encontra o caso pelo protocolo", async () => {
      abrir("/analises", "ANALISTA");
      await screen.findByRole("region", { name: "Lista de análises" }, ESPERA);
      fireEvent.keyDown(window, { key: "k", ctrlKey: true });
      const busca = await screen.findByPlaceholderText(/Buscar RA, CPF, nome ou protocolo/, {}, ESPERA);
      fireEvent.change(busca, { target: { value: caso("c-demo-analise").protocolo } });
      expect(await screen.findByText(caso("c-demo-analise").candidato.nome, {}, ESPERA)).toBeInTheDocument();
   }, 60000);
});
