/**
 * Integração dos handlers da análise via MSW (node): versão da análise no If-Match, 409, permissão
 * por papel e um único evento na linha do tempo por ação em lote. Usa a seed fictícia.
 */
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { usePapelSimuladoStore } from "@/features/sessao";
import { iniciarDb } from "@/mocks/db/iniciar";
import { db } from "@/mocks/db/estado";
import { handlersAnalise } from "@/mocks/handlers/analise";
import { API } from "@/mocks/lib/http";

const server = setupServer(...handlersAnalise);
const CASO = "c-demo-analise";

interface Envelope<T> {
   success: boolean;
   data: T;
   error?: { code: string; message: string };
}

async function chamar<T>(metodo: string, caminho: string, corpo?: unknown, versao?: number) {
   const headers: Record<string, string> = { "Content-Type": "application/json" };
   if (versao !== undefined) headers["If-Match"] = String(versao);
   const r = await fetch(`${API}${caminho}`, { method: metodo, headers, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
   return { status: r.status, corpo: (await r.json()) as Envelope<T> };
}

type AnaliseResp = { versao: number; itens: { id: string; estado: string; sugestao: { confianca: string } | null }[] };

beforeAll(() => {
   iniciarDb();
   usePapelSimuladoStore.getState().setPapel("ANALISTA");
   server.listen({ onUnhandledRequest: "error" });
});
afterAll(() => server.close());

describe("handlers da análise (HTTP)", () => {
   it("decide com a versão da análise e recusa versão antiga com 409", { timeout: 15_000 }, async () => {
      const { corpo } = await chamar<AnaliseResp>("GET", `/casos/${CASO}/analise`);
      const alvo = corpo.data.itens.find(i => i.estado === "SUGERIDO");
      expect(alvo).toBeDefined();
      const v = corpo.data.versao;
      const ok = await chamar<{ versao: number; item: { estado: string } }>(
         "PUT",
         `/casos/${CASO}/analise/itens/${alvo?.id}`,
         { valor: "REGULAR" },
         v,
      );
      expect(ok.status).toBe(200);
      expect(ok.corpo.data).toMatchObject({ versao: v + 1, item: { estado: "DECIDIDO" } });
      const velho = await chamar("PUT", `/casos/${CASO}/analise/itens/${alvo?.id}`, { valor: "DP" }, v);
      expect(velho.status).toBe(409);
   });

   it("lote gera um único evento analise.itens_em_lote", { timeout: 15_000 }, async () => {
      const antes = (db.eventos.get(CASO) ?? []).filter(e => e.tipo === "analise.itens_em_lote").length;
      const { corpo } = await chamar<AnaliseResp>("GET", `/casos/${CASO}/analise`);
      const r = await chamar<AnaliseResp>(
         "POST",
         `/casos/${CASO}/analise/itens:lote`,
         { modo: "ACEITAR_SUGESTOES_ALTA" },
         corpo.data.versao,
      );
      expect(r.status).toBe(200);
      const depois = (db.eventos.get(CASO) ?? []).filter(e => e.tipo === "analise.itens_em_lote").length;
      expect(depois).toBe(antes + 1);
      expect(
         r.corpo.data.itens.filter(i => i.estado === "SUGERIDO" && (i.sugestao?.confianca === "ALTA" || i.sugestao?.confianca === "REGRA")),
      ).toHaveLength(0);
   });

   it("consultor também decide na etapa de análise", { timeout: 15_000 }, async () => {
      usePapelSimuladoStore.getState().setPapel("CONSULTOR");
      const { corpo } = await chamar<AnaliseResp>("GET", `/casos/${CASO}/analise`);
      const r = await chamar("PUT", `/casos/${CASO}/analise/itens/${corpo.data.itens[0].id}`, { valor: "REGULAR" }, corpo.data.versao);
      expect(r.status).toBe(200);
      expect(r.corpo.error).toBeUndefined();
      usePapelSimuladoStore.getState().setPapel("ANALISTA");
   });

   it("atividade acima do limite responde 422 com mensagem pronta", { timeout: 15_000 }, async () => {
      const { corpo } = await chamar<AnaliseResp>("GET", `/casos/${CASO}/analise`);
      const r = await chamar(
         "POST",
         `/casos/${CASO}/analise/atividades-complementares`,
         { atividadeId: "MONITORIA", ch: 999 },
         corpo.data.versao,
      );
      expect(r.status).toBe(422);
      expect(r.corpo.error?.message).toContain("no máximo");
   });
});
