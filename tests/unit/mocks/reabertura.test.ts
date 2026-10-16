/**
 * Reabertura da análise (15/10/2026): o aluno contesta dispensas depois da proposta e a análise volta
 * para a equipe ou para a coordenação; o parecer da coordenação vira observação do protocolo.
 */
import { setupServer } from "msw/node";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ErroTransicao } from "@/features/casos";
import { usePapelSimuladoStore } from "@/features/sessao";
import { aplicarTransicao, usuarioAtual } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { analiseDoCaso } from "@/mocks/db/repositorio";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { handlersAnalise } from "@/mocks/handlers/analise";
import { API } from "@/mocks/lib/http";

vi.mock("@/mocks/lib/http", async original => ({
   ...(await original<typeof import("@/mocks/lib/http")>()),
   latencia: async () => undefined,
}));

const AGORA = new Date("2026-10-15T15:00:00Z");
const server = setupServer(...handlersAnalise);
beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterAll(() => server.close());
beforeEach(() => {
   iniciarDb(AGORA);
   usePapelSimuladoStore.getState().setPapel("ANALISTA");
});

function caso(f: (c: CasoRegistro) => boolean): CasoRegistro {
   const c = [...db.casos.values()].find(x => f(x) && !!analiseDoCaso(x));
   if (!c) throw new Error("Semente sem o caso esperado");
   return c;
}

function contestar(c: CasoRegistro, destino: "ANALISE" | "COORDENACAO", n = 2) {
   const ids = (analiseDoCaso(c)?.itens ?? [])
      .filter(i => i.decisao?.valor === "DISPENSA")
      .slice(0, n)
      .map(i => i.id);
   aplicarTransicao(
      c,
      {
         acao: "SOLICITAR_REANALISE",
         motivo: "CANDIDATO_CONTESTOU_DISCIPLINA",
         texto: "O aluno diz que a ementa cobre o conteúdo",
         destinoReanalise: destino,
         itemIds: ids,
      },
      usuarioAtual(),
      AGORA,
   );
   return ids;
}

describe("reabrir análise depois da proposta", () => {
   it("para a coordenação: cada disciplina contestada vira pergunta com a contestação", () => {
      const c = caso(x => x.etapa === "PROPOSTA_ENVIADA");
      const ids = contestar(c, "COORDENACAO");
      expect(c.etapa).toBe("AGUARDANDO_COORDENACAO");
      expect(c.resumoCongelado).toBeNull();
      const itens = analiseDoCaso(c)?.itens.filter(i => ids.includes(i.id)) ?? [];
      expect(itens).toHaveLength(2);
      for (const i of itens) {
         expect(i.estado).toBe("PERGUNTA_ABERTA");
         expect(i.contestacao?.texto).toContain("ementa cobre");
         expect(i.pergunta?.texto).toContain("O aluno contestou");
      }
   });

   it("para a equipe: volta para análise, marca a contestação e mantém a decisão", () => {
      const c = caso(x => x.etapa === "EM_NEGOCIACAO");
      const ids = contestar(c, "ANALISE", 1);
      expect(c.etapa).toBe("EM_ANALISE");
      const i = analiseDoCaso(c)?.itens.find(x => x.id === ids[0]);
      expect(i?.contestacao).not.toBeNull();
      expect(i?.decisao?.valor).toBe("DISPENSA");
   });

   it("para a coordenação sem disciplina marcada é recusado", () => {
      const c = caso(x => x.etapa === "PROPOSTA_ENVIADA");
      expect(() => contestar(c, "COORDENACAO", 0)).toThrow(ErroTransicao);
   });

   it("aproveitamento concluído também reabre", () => {
      const c = caso(x => x.etapa === "CONCLUIDO");
      contestar(c, "ANALISE", 1);
      expect(c.etapa).toBe("EM_ANALISE");
   });

   it("o parecer da coordenação vai para as observações do protocolo", async () => {
      const c = caso(x => x.etapa === "PROPOSTA_ENVIADA");
      const [itemId] = contestar(c, "COORDENACAO", 1);
      usePapelSimuladoStore.getState().setPapel("COORDENADOR");
      const versao = analiseDoCaso(c)?.versao ?? 0;
      const r = await fetch(`${API}/casos/${c.id}/analise/itens/${itemId}/resposta`, {
         method: "PUT",
         headers: { "Content-Type": "application/json", "If-Match": String(versao) },
         body: JSON.stringify({ decisao: "REGULAR", comentario: "A ementa de origem não cobre o conteúdo prático", usarComoRegra: false }),
      });
      expect(r.status).toBe(200);
      const parecer = (db.eventos.get(c.id) ?? []).find(e => e.tipo === "coordenacao.parecer");
      expect(parecer?.categoria).toBe("NOTA");
      expect(parecer?.detalhe).toContain("Regular.");
      expect(parecer?.detalhe).toContain("Fundamento: A ementa de origem não cobre");
   });
});
