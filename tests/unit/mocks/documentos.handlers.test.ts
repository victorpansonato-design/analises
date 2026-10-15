// @vitest-environment node
/**
 * Handlers de documentos: recusar dispara a mensagem ao candidato; aceitar o último obrigatório
 * leva o caso sozinho à pré-análise; documento de identidade só abre para quem pode ver (LGPD).
 */
import { getResponse } from "msw";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { usePapelSimuladoStore, type Papel } from "@/features/sessao";

import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { documentosDoCaso, eventosDoCaso } from "@/mocks/db/repositorio";
import { handlersDocumentos } from "@/mocks/handlers/documentos";
import { API } from "@/mocks/lib/http";

vi.mock("@/mocks/lib/http", async original => ({ ...(await original<typeof import("@/mocks/lib/http")>()), latencia: async () => {} }));

const ID = "c-demo-documentos";
// No Node não há `location`: as rotas relativas do MSW casam contra esta origem.
const BASE = API.startsWith("http") ? "" : "http://localhost";
const CONTEXTO = { baseUrl: "http://localhost/" };

function caso() {
   const c = db.casos.get(ID);
   if (!c) throw new Error("sem caso");
   return c;
}

async function pedir(metodo: string, caminho: string, corpo?: unknown, papel: Papel = "ANALISTA") {
   usePapelSimuladoStore.setState({ papel });
   const init: RequestInit = { method: metodo, headers: { "If-Match": String(caso().versao) } };
   if (corpo instanceof FormData) init.body = corpo;
   else if (corpo !== undefined) {
      init.body = JSON.stringify(corpo);
      (init.headers as Record<string, string>)["Content-Type"] = "application/json";
   }
   const r = await getResponse(handlersDocumentos, new Request(`${BASE}${API}${caminho}`, init), CONTEXTO);
   if (!r) throw new Error(`sem handler para ${metodo} ${caminho}`);
   return { status: r.status, corpo: (await r.json()) as { success: boolean; data: unknown; error?: { message: string } } };
}

function receber(checklistId: string) {
   const item = documentosDoCaso(caso()).find(i => i.id === checklistId);
   if (!item) throw new Error("sem item");
   item.status = "RECEBIDO";
   item.arquivos = [
      {
         id: `${checklistId}-novo`,
         nome: "planos.pdf",
         mime: "application/pdf",
         tamanho: 400_000,
         canal: "WHATSAPP",
         recebidoEm: new Date().toISOString(),
      },
   ];
   return item;
}

beforeEach(() => {
   iniciarDb(new Date());
});

describe("checklist do roteiro de documentos", () => {
   it("lista os itens da transferência externa com um obrigatório pendente", async () => {
      const r = await pedir("GET", `/casos/${ID}/documentos`);
      const itens = r.corpo.data as { id: string; status: string }[];
      expect(itens.map(i => i.id)).toEqual(["historico", "planos", "vinculo", "identidade"]);
      expect(itens.find(i => i.id === "planos")?.status).toBe("PENDENTE");
   });
});

describe("avaliação", () => {
   it("recusar registra a decisão e dispara a mensagem documento_recusado", async () => {
      receber("planos");
      const versao = caso().versao;
      const r = await pedir("PATCH", `/casos/${ID}/documentos/planos`, { status: "RECUSADO", motivoRecusa: "ILEGIVEL" });
      expect(r.status).toBe(200);
      expect((r.corpo.data as { status: string }).status).toBe("RECUSADO");
      expect(caso().versao).toBe(versao + 1);
      const eventos = eventosDoCaso(caso(), () => ({}));
      const msg = eventos.find(e => e.tipo === "mensagem.enviada" && e.dados?.templateId === "documento_recusado");
      expect(msg?.visivelAoCandidato).toBe(true);
      expect(msg?.detalhe).toContain("recebemos o arquivo planos.pdf, mas a imagem ficou difícil de ler");
      expect(eventos.some(e => e.tipo === "documento.recusado" && e.categoria === "DECISAO")).toBe(true);
   });

   it("recusar sem motivo é 422 com explicação", async () => {
      receber("planos");
      const r = await pedir("PATCH", `/casos/${ID}/documentos/planos`, { status: "RECUSADO" });
      expect(r.status).toBe(422);
      expect(r.corpo.error?.message).toBe("Escolha o motivo da recusa");
   });

   it("aceitar o último obrigatório leva o caso sozinho à pré-análise", async () => {
      expect(caso().etapa).toBe("AGUARDANDO_DOCUMENTOS");
      receber("planos");
      const r = await pedir("PATCH", `/casos/${ID}/documentos/planos`, { status: "ACEITO" });
      expect(r.status).toBe(200);
      expect(caso().etapa).toBe("PRE_ANALISE");
      expect(caso().noGed).toBe(true);
      expect(eventosDoCaso(caso(), () => ({})).some(e => e.dados?.templateId === "documentos_completos")).toBe(true);
   });

   it("aceitar sem arquivo é 422; consultor também avalia", async () => {
      const semArquivo = await pedir("PATCH", `/casos/${ID}/documentos/planos`, { status: "ACEITO" });
      expect(semArquivo.status).toBe(422);
      receber("planos");
      const consultor = await pedir("PATCH", `/casos/${ID}/documentos/planos`, { status: "ACEITO" }, "CONSULTOR");
      expect(consultor.status).toBe(200);
   });

   it("versão desatualizada é 409 e não altera nada", async () => {
      receber("planos");
      usePapelSimuladoStore.setState({ papel: "ANALISTA" });
      const r = await getResponse(
         handlersDocumentos,
         new Request(`${BASE}${API}/casos/${ID}/documentos/planos`, {
            method: "PATCH",
            headers: { "If-Match": "1", "Content-Type": "application/json" },
            body: JSON.stringify({ status: "ACEITO" }),
         }),
         CONTEXTO,
      );
      expect(r?.status).toBe(409);
      expect(caso().etapa).toBe("AGUARDANDO_DOCUMENTOS");
   });
});

describe("anexo e visualização", () => {
   it("anexar deixa o item recebido, canal consultor", async () => {
      const form = new FormData();
      form.append("arquivo", new File([new Uint8Array(120_000)], "planos-de-ensino.pdf", { type: "application/pdf" }));
      form.append("checklistId", "planos");
      const r = await pedir("POST", `/casos/${ID}/documentos`, form, "CONSULTOR");
      expect(r.status).toBe(201);
      const item = r.corpo.data as { status: string; arquivos: { canal: string; nome: string }[] };
      expect(item.status).toBe("RECEBIDO");
      expect(item.arquivos.at(-1)).toMatchObject({ canal: "CONSULTOR", nome: "planos-de-ensino.pdf" });
   });

   it("abrir arquivo gera log documento.visualizado e devolve imagem fictícia", async () => {
      const r = await pedir("GET", `/casos/${ID}/documentos/historico/arquivo/historico-a1`);
      expect(r.status).toBe(200);
      const v = r.corpo.data as { url: string; mime: string };
      expect(v.url.startsWith("data:image/svg+xml")).toBe(true);
      expect(decodeURIComponent(v.url)).toContain("Documento acadêmico");
      expect(eventosDoCaso(caso(), () => ({})).some(e => e.tipo === "documento.visualizado")).toBe(true);
   });

   it("documento de identidade abre e registra acesso para todos os colaboradores", async () => {
      receber("identidade");
      const r = await pedir("GET", `/casos/${ID}/documentos/identidade/arquivo/identidade-novo`, undefined, "CONSULTOR");
      expect(r.status).toBe(200);
      expect(eventosDoCaso(caso(), () => ({})).some(e => e.tipo === "documento.visualizado")).toBe(true);
   });
});
