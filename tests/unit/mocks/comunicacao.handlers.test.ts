// @vitest-environment node
/** Handlers de comunicação: templates por papel, prévia fiel e bloqueios do envio (docs/08 §4). */
import { getResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePapelSimuladoStore, type Papel } from "@/features/sessao";

import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { documentosDoCaso, eventosDoCaso } from "@/mocks/db/repositorio";
import { handlersComunicacao } from "@/mocks/handlers/comunicacao";
import { API } from "@/mocks/lib/http";

vi.mock("@/mocks/lib/http", async original => ({ ...(await original<typeof import("@/mocks/lib/http")>()), latencia: async () => {} }));

const DOCS = "c-demo-documentos";
const ANALISE = "c-demo-analise";
const BASE = API.startsWith("http") ? "" : "http://localhost";
const CONTEXTO = { baseUrl: "http://localhost/" };

async function pedir(metodo: string, caminho: string, corpo?: unknown, papel: Papel = "CONSULTOR") {
   usePapelSimuladoStore.setState({ papel });
   const init: RequestInit = { method: metodo };
   if (corpo !== undefined) init.body = JSON.stringify(corpo);
   const r = await getResponse(handlersComunicacao, new Request(`${BASE}${API}${caminho}`, init), CONTEXTO);
   if (!r) throw new Error(`sem handler para ${metodo} ${caminho}`);
   return { status: r.status, corpo: (await r.json()) as { data: unknown; error?: { message: string } } };
}

function caso(id: string) {
   const c = db.casos.get(id);
   if (!c) throw new Error("sem caso");
   return c;
}

beforeEach(() => {
   iniciarDb(new Date());
});

describe("templates", () => {
   it("todos têm acesso aos mesmos templates", async () => {
      const consultor = (await pedir("GET", "/comunicacao/templates")).corpo.data as { id: string }[];
      expect(consultor.map(t => t.id)).toContain("proposta_pronta");
      const matricula = (await pedir("GET", "/comunicacao/templates", undefined, "MATRICULA")).corpo.data as { id: string }[];
      expect(matricula.map(t => t.id)).toContain("proposta_pronta");
   });
});

describe("prévia", () => {
   it("lembrete de documentos lista o que falta numa linha, com os botões", async () => {
      const r = await pedir("POST", `/casos/${DOCS}/mensagens/previa`, { templateId: "lembrete_documentos" });
      const p = r.corpo.data as { texto: string; variaveisFaltando: string[]; botoes: string[] };
      expect(p.variaveisFaltando).toEqual([]);
      expect(p.texto).toContain("Só falta: planos de ensino das disciplinas cursadas.");
      expect(p.botoes).toEqual(["Enviar agora", "Preciso de ajuda"]);
   });

   it("variável vazia aparece marcada e listada", async () => {
      for (const d of documentosDoCaso(caso(DOCS))) d.status = "ACEITO";
      const p = (await pedir("POST", `/casos/${DOCS}/mensagens/previa`, { templateId: "lembrete_documentos" })).corpo.data as {
         texto: string;
         variaveisFaltando: string[];
      };
      expect(p.variaveisFaltando).toEqual(["documentos"]);
      expect(p.texto).toContain("[documentos]");
   });
});

describe("envio", () => {
   it("envia, registra na linha do tempo e responde 202 com o evento", async () => {
      const r = await pedir("POST", `/casos/${DOCS}/mensagens`, { templateId: "lembrete_documentos" });
      expect(r.status).toBe(202);
      const ev = r.corpo.data as { id: string; categoria: string; visivelAoCandidato: boolean };
      expect(ev).toMatchObject({ categoria: "MENSAGEM", visivelAoCandidato: true });
      expect(eventosDoCaso(caso(DOCS), () => ({})).some(e => e.id === ev.id)).toBe(true);
   });

   it("422 com motivo: variável vazia, sem opt-in e etapa errada", async () => {
      caso(DOCS).candidato.optInWhatsapp = false;
      const semOptIn = await pedir("POST", `/casos/${DOCS}/mensagens`, { templateId: "lembrete_documentos" });
      expect(semOptIn.status).toBe(422);
      expect(semOptIn.corpo.error?.message).toBe("O candidato não autorizou contato pelo WhatsApp");

      caso(DOCS).candidato.optInWhatsapp = true;
      for (const d of documentosDoCaso(caso(DOCS))) d.status = "ACEITO";
      const vazio = await pedir("POST", `/casos/${DOCS}/mensagens`, { templateId: "lembrete_documentos" });
      expect(vazio.status).toBe(422);
      expect(vazio.corpo.error?.message).toBe("Falta: documentos pendentes");

      const etapa = await pedir("POST", `/casos/${DOCS}/mensagens`, { templateId: "lembrete_proposta" });
      expect(etapa.status).toBe(422);
      expect(etapa.corpo.error?.message).toMatch(/não serve à etapa atual/);
   });

   it("analista envia mensagem compatível com a etapa atual", async () => {
      const r = await pedir("POST", `/casos/${ANALISE}/mensagens`, { templateId: "documentos_completos" }, "ANALISTA");
      expect(r.status).toBe(202);
      expect(r.corpo.error).toBeUndefined();
   });
});
