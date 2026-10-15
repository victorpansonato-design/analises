/**
 * Gestão comercial no backend simulado (MSW em Node): só o papel GESTAO entra, o mês corrente corta
 * no dia de hoje, a resposta respeita o contrato e a meta tem controle de versão.
 */
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { EquipeSchema, type Equipe } from "@/features/gestao";
import { usePapelSimuladoStore } from "@/features/sessao";
import { iniciarDb } from "@/mocks/db/iniciar";
import { handlersGestao, montarEquipe } from "@/mocks/handlers/gestao";
import { handlersIndicadores } from "@/mocks/handlers/indicadores";
import { API } from "@/mocks/lib/http";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));

const server = setupServer(...handlersGestao, ...handlersIndicadores);

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, versao?: number) {
   const headers: Record<string, string> = { "Content-Type": "application/json" };
   if (versao !== undefined) headers["If-Match"] = String(versao);
   const r = await fetch(`${API}${caminho}`, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
   return { status: r.status, corpo: (await r.json()) as { data: T; error?: { code: string } } };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
   iniciarDb();
   usePapelSimuladoStore.getState().setPapel("GESTAO");
});

describe("gestão comercial (HTTP)", () => {
   it("outros papéis recebem 403 na equipe e nos indicadores", async () => {
      usePapelSimuladoStore.getState().setPapel("DIRETORIA");
      expect((await chamar("GET", "/gestao/equipe")).status).toBe(403);
      expect((await chamar("GET", "/indicadores")).status).toBe(403);
   });

   it("a gestão recebe a equipe do mês corrente no formato do contrato", async () => {
      const { status, corpo } = await chamar<Equipe>("GET", "/gestao/equipe");
      expect(status).toBe(200);
      const equipe = EquipeSchema.parse(corpo.data);
      expect(equipe.consultores).toHaveLength(5);
      expect(equipe.mesesDisponiveis).toHaveLength(6);
      for (const c of equipe.consultores) {
         expect(c.matriculasPorDia.reduce((s, v) => s + v, 0)).toBe(c.matriculas);
         expect(c.matriculas).toBeLessThanOrEqual(c.analisesConcluidas);
         expect(c.historico.at(-1)?.mes).toBe(equipe.mes);
      }
   });

   it("mês fora da janela é recusado", async () => {
      expect((await chamar("GET", "/gestao/equipe?mes=2020-01")).status).toBe(400);
   });

   it("salva a meta com a versão lida e recusa versão antiga com 409", async () => {
      const { corpo } = await chamar<Equipe>("GET", "/gestao/equipe");
      const alvo = corpo.data.consultores[0];
      const mes = corpo.data.mes;
      const salvo = await chamar("PUT", "/gestao/metas", { consultorId: alvo.id, mes, meta: alvo.meta + 3 }, alvo.versaoMeta);
      expect(salvo.status).toBe(200);
      const depois = await chamar<Equipe>("GET", "/gestao/equipe");
      const lido = depois.corpo.data.consultores.find(c => c.id === alvo.id);
      expect(lido?.meta).toBe(alvo.meta + 3);
      expect(lido?.versaoMeta).toBe(alvo.versaoMeta + 1);
      const velho = await chamar("PUT", "/gestao/metas", { consultorId: alvo.id, mes, meta: 1 }, alvo.versaoMeta);
      expect(velho.status).toBe(409);
   });

   it("meta de mês fechado não muda", async () => {
      const { corpo } = await chamar<Equipe>("GET", "/gestao/equipe");
      const passado = corpo.data.mesesDisponiveis[1];
      const r = await chamar("PUT", "/gestao/metas", { consultorId: corpo.data.consultores[0].id, mes: passado, meta: 5 }, 1);
      expect(r.status).toBe(422);
   });

   it("mês fechado traz o mês inteiro; o corrente corta no dia de hoje", () => {
      const agora = new Date("2026-10-14T18:00:00Z");
      expect(montarEquipe("2026-09", agora).consultores[0].matriculasPorDia).toHaveLength(30);
      expect(montarEquipe("2026-10", agora).consultores[0].matriculasPorDia).toHaveLength(14);
   });
});
