/**
 * Render de teste com os providers que os componentes da tela esperam: React Query (sem retry) e
 * roteador em memória (o estado da tela vive na URL).
 */
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, type RenderOptions } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";

export function renderComProviders(ui: ReactElement, { rota = "/analises", ...opcoes }: RenderOptions & { rota?: string } = {}) {
   const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
   const Providers = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>
         <MemoryRouter initialEntries={[rota]}>{children}</MemoryRouter>
      </QueryClientProvider>
   );
   return { queryClient, ...render(ui, { wrapper: Providers, ...opcoes }) };
}
