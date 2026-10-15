/** Regras puras do checklist e da mensagem de recusa (docs/05 §3.4, docs/08 §3). */
import { describe, expect, it } from "vitest";

import {
   contarChecklist,
   itensParaLembrar,
   motivoArquivoInvalido,
   motivoNaoAnexar,
   motivoNaoAvaliar,
   motivoRecusaInvalido,
   textoRecusa,
   type ItemChecklist,
} from "@/features/documentos";

const arquivo = {
   id: "a1",
   nome: "historico.pdf",
   mime: "application/pdf",
   tamanho: 300_000,
   canal: "WHATSAPP" as const,
   recebidoEm: "2026-10-09T12:00:00Z",
};

function item(p: Partial<ItemChecklist>): ItemChecklist {
   return {
      id: "x",
      nome: "Histórico escolar",
      obrigatorio: true,
      status: "PENDENTE",
      motivoRecusa: null,
      legibilidade: null,
      arquivos: [],
      proximoLembreteEm: null,
      ...p,
   };
}

describe("contarChecklist", () => {
   it("conta obrigatórios resolvidos (aceito ou dispensado), a conferir e faltando", () => {
      const c = contarChecklist([
         item({ id: "a", status: "ACEITO" }),
         item({ id: "b", status: "RECEBIDO", arquivos: [arquivo] }),
         item({ id: "c", status: "RECUSADO" }),
         item({ id: "d", status: "PENDENTE" }),
         item({ id: "e", obrigatorio: false, status: "RECEBIDO", arquivos: [arquivo] }),
      ]);
      expect(c).toEqual({ obrigatorios: 4, obrigatoriosOk: 1, aConferir: 2, faltando: 2, completo: false });
   });
   it("fica completo com todos os obrigatórios aceitos, mesmo com opcional pendente", () => {
      const c = contarChecklist([item({ id: "a", status: "ACEITO" }), item({ id: "b", obrigatorio: false })]);
      expect(c.completo).toBe(true);
      expect(`${c.obrigatoriosOk}/${c.obrigatorios}`).toBe("1/1");
   });
   it("lembra só obrigatório pendente ou recusado", () => {
      const ids = itensParaLembrar([
         item({ id: "a" }),
         item({ id: "b", status: "RECUSADO" }),
         item({ id: "c", obrigatorio: false }),
         item({ id: "d", status: "RECEBIDO" }),
      ]).map(i => i.id);
      expect(ids).toEqual(["a", "b"]);
   });
});

describe("motivoNaoAvaliar", () => {
   it("sem arquivo não aceita nem recusa", () => {
      expect(motivoNaoAvaliar(item({}), "ACEITO")).toBe("Ainda não chegou arquivo para conferir");
      expect(motivoNaoAvaliar(item({}), "RECUSADO")).toBe("Ainda não chegou arquivo para conferir");
   });
   it("recebido pode ser aceito ou recusado", () => {
      const r = item({ status: "RECEBIDO", arquivos: [arquivo] });
      expect(motivoNaoAvaliar(r, "ACEITO")).toBeNull();
      expect(motivoNaoAvaliar(r, "RECUSADO")).toBeNull();
   });
   it("dispensar só vale para opcional", () => {
      expect(motivoNaoAvaliar(item({}), "DISPENSADO")).toBe("Documento obrigatório não pode ser dispensado");
      expect(motivoNaoAvaliar(item({ obrigatorio: false }), "DISPENSADO")).toBeNull();
   });
   it("não repete a mesma decisão", () => {
      expect(motivoNaoAvaliar(item({ status: "ACEITO", arquivos: [arquivo] }), "ACEITO")).toBe("Este documento já foi aceito");
      expect(motivoNaoAvaliar(item({ status: "RECUSADO", arquivos: [arquivo] }), "RECUSADO")).toMatch(/aguarde o novo envio/);
   });
});

describe("anexo", () => {
   it("histórico interno não se anexa à mão", () => {
      expect(motivoNaoAnexar(item({ id: "historico-interno" }))).toMatch(/Migrar histórico interno/);
      expect(motivoNaoAnexar(item({ status: "RECUSADO" }))).toBeNull();
   });
   it("aceita PDF e imagem até o limite", () => {
      expect(motivoArquivoInvalido({ type: "application/pdf", size: 1000 })).toBeNull();
      expect(motivoArquivoInvalido({ type: "image/jpeg", size: 1000 })).toBeNull();
      expect(motivoArquivoInvalido({ type: "application/zip", size: 1000 })).toMatch(/PDF ou imagem/);
      expect(motivoArquivoInvalido({ type: "image/png", size: 25 * 1024 * 1024 })).toMatch(/maior que 20 MB/);
   });
});

describe("mensagem de recusa", () => {
   it("monta o template documento_recusado com a dica padrão", () => {
      expect(textoRecusa({ nome: "Ana", arquivo: "historico.jpg", documento: "Histórico escolar", motivo: "ILEGIVEL" })).toBe(
         "Ana, recebemos o arquivo historico.jpg, mas a imagem ficou difícil de ler. Pode enviar de novo?\nDica: fotografe com boa luz e o documento inteiro na tela.",
      );
   });
   it("o texto de quem recusa substitui a dica", () => {
      const t = textoRecusa({
         nome: "Ana",
         arquivo: "a.pdf",
         documento: "Planos de ensino",
         motivo: "DOCUMENTO_ERRADO",
         texto: "  envie os planos, não o histórico  ",
      });
      expect(t).toContain("não é o documento que pedimos (planos de ensino)");
      expect(t.endsWith("Dica: envie os planos, não o histórico")).toBe(true);
   });
   it("motivo Outro exige explicação", () => {
      expect(motivoRecusaInvalido(null)).toBe("Escolha o motivo da recusa");
      expect(motivoRecusaInvalido("OUTRO", " ")).toMatch(/Explique/);
      expect(motivoRecusaInvalido("OUTRO", "faltou o verso")).toBeNull();
      expect(motivoRecusaInvalido("VENCIDO")).toBeNull();
   });
});
