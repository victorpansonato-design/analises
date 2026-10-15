/**
 * Fumaça da tela única contra o backend simulado (MSW em Node): shell, funil, fila, painel do caso
 * e cada aba renderizam sem erro para os papéis dos roteiros de demonstração.
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { VirtuosoMockContext } from "react-virtuoso";

import { AuthProvider } from "@/contexts/auth/auth-context";
import { usePapelSimuladoStore, type Papel } from "@/features/sessao";
import MainLayout from "@/layout/main-layout";
import AnalisesPage from "@/pages/protected/analises";
import GestaoPage from "@/pages/protected/gestao";

import { iniciarDb } from "@/mocks/db/iniciar";
import { db } from "@/mocks/db/estado";
import { handlers } from "@/mocks/handlers";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));

const servidor = setupServer(...handlers);

beforeAll(() => {
   servidor.listen({ onUnhandledRequest: "bypass" });
   // Desktop: fila e caso lado a lado (queries `min-width` casam).
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
               <Routes>
                  <Route
                     element={
                        <VirtuosoMockContext.Provider value={{ viewportHeight: 600, itemHeight: 80 }}>
                           <MainLayout />
                        </VirtuosoMockContext.Provider>
                     }
                  >
                     <Route path="/analises" element={<AnalisesPage />} />
                     <Route path="/gestao" element={<GestaoPage />} />
                  </Route>
               </Routes>
            </MemoryRouter>
         </AuthProvider>
      </QueryClientProvider>,
   );
}

const ESPERA = { timeout: 20000 };

describe("tela única com dados simulados", () => {
   it("suporte encontra protocolos separados pelo RA e volta à mesma busca após abrir o perfil", async () => {
      abrir("/analises?etapa=LIBERADAS", "SUPORTE");
      const campo = await screen.findByRole("searchbox", { name: "Buscar aluno ou protocolo" }, ESPERA);
      fireEvent.change(campo, { target: { value: "202600842" } });
      const protocolo = db.casos.get("c-demo-analise")!.protocolo;
      const outro = db.casos.get("c-demo-coordenacao")!.protocolo;
      const perfil = await screen.findByRole("link", { name: new RegExp(protocolo) }, ESPERA);
      expect(screen.getByRole("link", { name: new RegExp(outro) })).toBeInTheDocument();
      fireEvent.click(perfil);
      expect(await screen.findByRole("button", { name: "Voltar às análises" }, ESPERA)).toBeInTheDocument();
      expect(screen.queryByRole("region", { name: "Lista de análises" })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Voltar às análises" }));
      expect(await screen.findByRole("searchbox", { name: "Buscar aluno ou protocolo" }, ESPERA)).toHaveValue("202600842");
      expect(await screen.findAllByRole("link", { name: /Abrir perfil/ }, ESPERA)).toHaveLength(2);
   }, 60000);

   it("limpar a pesquisa remove curso e modalidade juntos e mantém a fila selecionada", async () => {
      abrir("/analises?etapa=AGUARDANDO_COORDENACAO&curso=inexistente&modalidade=SEMIPRESENCIAL", "COORDENADOR");
      fireEvent.click(await screen.findByRole("button", { name: "Limpar pesquisa" }, ESPERA));
      expect(screen.getByRole("combobox", { name: "Pesquisar curso" })).toHaveValue("");
      expect(screen.getByRole("combobox", { name: "Modalidade e turno" })).toHaveValue("");
      expect(screen.getByRole("heading", { name: "Em análise coordenador" })).toBeInTheDocument();
   }, 60000);
   it("analista abre o caso de demonstração na aba Análise", async () => {
      abrir("/analises?caso=c-demo-analise", "ANALISTA");
      expect(await screen.findByText("Próximo passo", {}, ESPERA)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Concluir análise/ })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: /Análise/ })).toHaveAttribute("aria-selected", "true");
      expect(screen.queryByRole("region", { name: "Lista de análises" })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Voltar às análises" })).toBeInTheDocument();
   }, 60000);

   it("todas as abas do caso renderizam", async () => {
      abrir("/analises?caso=c-demo-analise", "ANALISTA");
      await screen.findByText("Próximo passo", {}, ESPERA);
      const equipe = await screen.findByRole("complementary", { name: "Painel da equipe" }, ESPERA);
      expect(screen.queryByRole("tab", { name: "Conversa e histórico" })).not.toBeInTheDocument();
      fireEvent.click(within(equipe).getByRole("button", { name: "Adicionar observação" }));
      const nota = within(equipe).getByRole("combobox", { name: "Nota interna" });
      fireEvent.change(nota, { target: { value: "Rascunho preservado ao consultar a análise." } });
      for (const aba of ["Documentos", "Dados", "Proposta", "Análise"]) {
         fireEvent.click(screen.getByRole("tab", { name: new RegExp(`^${aba}`) }));
         const chave = {
            Documentos: "documentos",
            Dados: "dados",
            Proposta: "proposta",
            Análise: "analise",
         }[aba];
         const painel = await screen.findByRole("tabpanel", { name: new RegExp(`^${aba}`) }, ESPERA);
         expect(painel.id).toBe(`caso-panel-${chave}`);
         expect(within(painel).queryByText(/Não conseguimos/)).not.toBeInTheDocument();
         expect(screen.getByRole("complementary", { name: "Painel da equipe" })).toBe(equipe);
         expect(nota).toHaveValue("Rascunho preservado ao consultar a análise.");
      }
   }, 60000);

   it("matrícula vê o primeiro contato e a ação de enviar proposta", async () => {
      abrir("/analises?caso=c-demo-matricula", "MATRICULA");
      expect(await screen.findByText("Primeiro contato com o candidato", {}, ESPERA)).toBeInTheDocument();
      expect(screen.getAllByRole("button", { name: /Enviar proposta/ }).length).toBeGreaterThan(0);
   }, 60000);

   it("coordenação é levada a responder as perguntas", async () => {
      abrir("/analises?caso=c-demo-coordenacao", "COORDENADOR");
      expect(await screen.findByText("Responder 2 perguntas", {}, ESPERA)).toBeInTheDocument();
   }, 60000);

   it("consultor vê a fila na vez dele e o painel vazio pede um caso", async () => {
      abrir("/analises", "CONSULTOR");
      expect(await screen.findByRole("heading", { name: "Controle de análises" }, ESPERA)).toBeInTheDocument();
      expect(screen.queryByText("Dados fictícios")).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Ver como/ })).not.toBeInTheDocument();
      expect(await screen.findByRole("region", { name: "Lista de análises" })).toBeInTheDocument();
   }, 60000);

   it("gestão comercial abre os indicadores e vê o item no menu", async () => {
      abrir("/analises?painel=indicadores", "GESTAO");
      expect(await screen.findByRole("heading", { name: "Indicadores" }, ESPERA)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Gestão comercial" })).toBeInTheDocument();
      expect(screen.getByRole("link", { name: "Gestão comercial" })).toBeInTheDocument();
      expect(screen.queryByText("Dados fictícios")).not.toBeInTheDocument();
   }, 60000);

   it("gestão comercial vê o rendimento da equipe contra a meta", async () => {
      abrir("/gestao?aba=equipe", "GESTAO");
      expect(await screen.findByRole("heading", { name: "Meta da equipe" }, ESPERA)).toBeInTheDocument();
      expect(screen.getByRole("table", { name: "Rendimento por consultor" })).toBeInTheDocument();
      expect(screen.getAllByText(/estimativa/).length).toBeGreaterThan(0);
   }, 60000);

   it("outros papéis não veem a gestão nem os indicadores", async () => {
      abrir("/gestao", "DIRETORIA");
      expect(await screen.findByText("Área da gestão comercial", undefined, ESPERA)).toBeInTheDocument();
      expect(screen.queryByRole("heading", { name: "Indicadores" })).not.toBeInTheDocument();
      expect(screen.queryByRole("link", { name: "Gestão comercial" })).not.toBeInTheDocument();
   }, 60000);
});
