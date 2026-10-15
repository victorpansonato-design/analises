// @vitest-environment node
/** Handlers da linha do tempo: filtro e cursor; nota com @menção notifica quem foi mencionado. */
import { getResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePapelSimuladoStore, type Papel } from "@/features/sessao";

import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { registrarEvento } from "@/mocks/db/repositorio";
import { handlersTimeline } from "@/mocks/handlers/timeline";
import { API } from "@/mocks/lib/http";

vi.mock("@/mocks/lib/http", async original => ({ ...(await original<typeof import("@/mocks/lib/http")>()), latencia: async () => {} }));

const ID = "c-demo-documentos";
const BASE = API.startsWith("http") ? "" : "http://localhost";
const CONTEXTO = { baseUrl: "http://localhost/" };

interface Pagina {
   itens: { id: string; categoria: string; em: string; tipo: string; dados?: Record<string, unknown> }[];
   proximoCursor: string | null;
}

async function pedir(metodo: string, caminho: string, corpo?: unknown, papel: Papel = "CONSULTOR") {
   usePapelSimuladoStore.setState({ papel });
   const init: RequestInit = { method: metodo };
   if (corpo !== undefined) init.body = JSON.stringify(corpo);
   const r = await getResponse(handlersTimeline, new Request(`${BASE}${API}${caminho}`, init), CONTEXTO);
   if (!r) throw new Error(`sem handler para ${metodo} ${caminho}`);
   return { status: r.status, corpo: (await r.json()) as { data: unknown; error?: { message: string } } };
}

function caso() {
   const c = db.casos.get(ID);
   if (!c) throw new Error("sem caso");
   return c;
}

beforeEach(() => {
   iniciarDb(new Date());
});

describe("GET timeline", () => {
   it("filtra por categoria e devolve o mais recente primeiro", async () => {
      const r = await pedir("GET", `/casos/${ID}/timeline?filtro=MENSAGENS`);
      const p = r.corpo.data as Pagina;
      expect(p.itens.length).toBeGreaterThan(0);
      expect(p.itens.every(e => e.categoria === "MENSAGEM")).toBe(true);
      const tempos = p.itens.map(e => Date.parse(e.em));
      expect([...tempos].sort((a, b) => b - a)).toEqual(tempos);
   });

   it("pagina por cursor de 30", async () => {
      for (let i = 0; i < 40; i++) {
         registrarEvento(
            caso(),
            {
               tipo: "teste",
               categoria: "SISTEMA",
               autor: { tipo: "SISTEMA", id: null, nome: null },
               titulo: `t${i}`,
               detalhe: null,
               visivelAoCandidato: false,
               statusEntrega: null,
            },
            () => ({}),
         );
      }
      const p1 = (await pedir("GET", `/casos/${ID}/timeline`)).corpo.data as Pagina;
      expect(p1.itens).toHaveLength(30);
      expect(p1.proximoCursor).toBe("30");
      const p2 = (await pedir("GET", `/casos/${ID}/timeline?cursor=${p1.proximoCursor}`)).corpo.data as Pagina;
      expect(p2.itens.some(e => p1.itens.some(x => x.id === e.id))).toBe(false);
   });
});

describe("POST notas", () => {
   it("registra a nota e notifica cada mencionado (menos quem escreveu)", async () => {
      const antes = db.notificacoes.get("u-ana-1")?.length ?? 0;
      const r = await pedir("POST", `/casos/${ID}/notas`, {
         texto: "  @Juliana Prado o candidato pediu ajuda  ",
         mencoes: ["u-ana-1", "u-inexistente", "u-con-1"],
      });
      expect(r.status).toBe(201);
      const ev = r.corpo.data as Pagina["itens"][number] & { detalhe: string };
      expect(ev.categoria).toBe("NOTA");
      expect(ev.tipo).toBe("nota.adicionada");
      expect(ev.detalhe).toBe("@Juliana Prado o candidato pediu ajuda");
      expect(ev.dados?.mencoes).toEqual(["u-ana-1", "u-con-1"]);
      const nova = db.notificacoes.get("u-ana-1") ?? [];
      expect(nova).toHaveLength(antes + 1);
      expect(nova[0]).toMatchObject({ tipo: "MENCAO", casoId: ID, lida: false });
      // A consultora persona (u-con-1) escreveu: não se notifica.
      expect(
         (db.notificacoes.get("u-con-1") ?? []).some(n => n.tipo === "MENCAO" && n.casoId === ID && n.titulo.includes("mencionou")),
      ).toBe(false);
   });

   it("nota vazia é 422", async () => {
      const r = await pedir("POST", `/casos/${ID}/notas`, { texto: "   ", mencoes: [] });
      expect(r.status).toBe(422);
      expect(r.corpo.error?.message).toBe("Escreva a nota antes de salvar");
   });
});
