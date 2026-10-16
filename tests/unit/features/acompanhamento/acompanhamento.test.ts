/** Acompanhamento do aluno: etapas internas viram poucos passos claros, sem expor o que é da equipe. */
import { describe, expect, it } from "vitest";

import {
   linkWhatsapp,
   montarAcompanhamento,
   passosDoTipo,
   rotuloSituacao,
   saudacao,
   textoDoPasso,
   urlAcompanhamento,
   type EntradaAcompanhamento,
} from "@/features/acompanhamento";
import type { Etapa } from "@/features/casos";

const t = (h: number) => new Date(Date.UTC(2026, 9, 1, 12 + h)).toISOString();

function entrada(etapa: Etapa, jornada: Etapa[], extra: Partial<EntradaAcompanhamento> = {}): EntradaAcompanhamento {
   return {
      protocolo: "85560",
      nome: "Marina Teixeira Lopes",
      tipo: "TRANSFERENCIA_EXTERNA",
      etapa,
      etapaAnterior: jornada.length > 1 ? jornada[jornada.length - 2] : null,
      estudouForaNoPeriodo: null,
      criadoEm: t(0),
      atualizadoEm: t(jornada.length),
      jornada: jornada.map((e, i) => ({ etapa: e, entrouEm: t(i) })),
      destino: { nome: "Administração", modalidade: "PRESENCIAL", turno: "NOTURNO", ciclo: "2027.1" },
      ra: null,
      ...extra,
   };
}

const estados = (e: EntradaAcompanhamento) => montarAcompanhamento(e).passos.map(p => `${p.passo}:${p.estado}`);

describe("passos por tipo", () => {
   it("ingresso com documentos vai do pedido à matrícula", () => {
      expect(passosDoTipo("TRANSFERENCIA_EXTERNA", null)).toEqual(["RECEBIDA", "DOCUMENTOS", "ANALISE", "PROPOSTA", "MATRICULA"]);
   });
   it("transferência interna não pede documentos externos", () => {
      expect(passosDoTipo("TRANSFERENCIA_INTERNA", null)).toEqual(["RECEBIDA", "ANALISE", "PROPOSTA", "MATRICULA"]);
   });
   it("aproveitamento termina no resultado, sem proposta nem matrícula", () => {
      expect(passosDoTipo("APROVEITAMENTO_ESTUDOS", null)).toEqual(["RECEBIDA", "DOCUMENTOS", "ANALISE", "RESULTADO"]);
   });
});

describe("montarAcompanhamento", () => {
   it("coordenação e ajuste aparecem para o aluno só como análise", () => {
      const e = entrada("AGUARDANDO_COORDENACAO", [
         "RASCUNHO",
         "AGUARDANDO_DOCUMENTOS",
         "PRE_ANALISE",
         "EM_ANALISE",
         "AGUARDANDO_COORDENACAO",
      ]);
      expect(estados(e)).toEqual(["RECEBIDA:FEITO", "DOCUMENTOS:FEITO", "ANALISE:ATUAL", "PROPOSTA:PROXIMO", "MATRICULA:PROXIMO"]);
      const a = montarAcompanhamento(e);
      expect(a.passos[2].em).toBe(t(2)); // chegou à análise na pré-análise
      expect(a.passos[1].em).toBe(t(2)); // saiu dos documentos no mesmo momento
      expect(a.aguardandoAluno).toBe(false);
   });

   it("documentos pendentes e proposta enviada são a vez do aluno", () => {
      expect(montarAcompanhamento(entrada("AGUARDANDO_DOCUMENTOS", ["RASCUNHO", "AGUARDANDO_DOCUMENTOS"])).aguardandoAluno).toBe(true);
      const proposta = entrada("PROPOSTA_ENVIADA", ["RASCUNHO", "EM_ANALISE", "PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA"]);
      expect(montarAcompanhamento(proposta).aguardandoAluno).toBe(true);
      expect(rotuloSituacao(montarAcompanhamento(proposta))).toBe("Aguardando você");
   });

   it("matrícula efetivada conclui tudo e mostra o RA; antes disso o RA não sai", () => {
      const jornada: Etapa[] = [
         "RASCUNHO",
         "AGUARDANDO_DOCUMENTOS",
         "EM_ANALISE",
         "PRONTO_PARA_MATRICULA",
         "PROPOSTA_ENVIADA",
         "MATRICULADO",
      ];
      const a = montarAcompanhamento(entrada("MATRICULADO", jornada, { ra: "202612345" }));
      expect(a.situacao).toBe("MATRICULADO");
      expect(a.passos.every(p => p.estado === "FEITO")).toBe(true);
      expect(a.passos.at(-1)?.em).toBe(t(5));
      expect(a.ra).toBe("202612345");
      expect(montarAcompanhamento(entrada("EM_ANALISE", ["EM_ANALISE"], { ra: "202612345" })).ra).toBeNull();
   });

   it("reanálise depois da proposta volta o aluno para a análise", () => {
      const e = entrada("EM_ANALISE", [
         "RASCUNHO",
         "AGUARDANDO_DOCUMENTOS",
         "EM_ANALISE",
         "PRONTO_PARA_MATRICULA",
         "PROPOSTA_ENVIADA",
         "EM_ANALISE",
      ]);
      expect(estados(e)).toEqual(["RECEBIDA:FEITO", "DOCUMENTOS:FEITO", "ANALISE:ATUAL", "PROPOSTA:PROXIMO", "MATRICULA:PROXIMO"]);
      expect(montarAcompanhamento(e).passos[2].em).toBe(t(5)); // a análise recomeçou
   });

   it("encerrado marca onde o pedido parou; adiado continua no passo, pausado", () => {
      const perdido = entrada("PERDIDO", [
         "RASCUNHO",
         "AGUARDANDO_DOCUMENTOS",
         "EM_ANALISE",
         "PRONTO_PARA_MATRICULA",
         "PROPOSTA_ENVIADA",
         "PERDIDO",
      ]);
      const a = montarAcompanhamento(perdido);
      expect(a.situacao).toBe("ENCERRADO");
      expect(a.passos.map(p => p.estado)).toEqual(["FEITO", "FEITO", "FEITO", "INTERROMPIDO", "PROXIMO"]);
      const adiado = montarAcompanhamento(entrada("ADIADO", ["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "ADIADO"]));
      expect(adiado.situacao).toBe("PAUSADO");
      expect(adiado.passos[1].estado).toBe("ATUAL");
      expect(adiado.aguardandoAluno).toBe(false);
   });

   it("aproveitamento concluído termina no resultado", () => {
      const e = entrada("CONCLUIDO", ["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "EM_ANALISE", "CONCLUIDO"], { tipo: "APROVEITAMENTO_ESTUDOS" });
      const a = montarAcompanhamento(e);
      expect(a.situacao).toBe("CONCLUIDO");
      expect(a.passos.map(p => p.passo)).toEqual(["RECEBIDA", "DOCUMENTOS", "ANALISE", "RESULTADO"]);
      expect(a.passos.every(p => p.estado === "FEITO")).toBe(true);
   });

   it("expõe só o primeiro nome", () => {
      expect(montarAcompanhamento(entrada("EM_ANALISE", ["EM_ANALISE"])).primeiroNome).toBe("Marina");
   });
});

describe("textos e links", () => {
   it("saudação comemora a matrícula pelo nome", () => {
      expect(saudacao({ primeiroNome: "Marina", tipo: "RETORNO", situacao: "MATRICULADO" }).titulo).toBe(
         "Parabéns, Marina! Sua matrícula foi efetivada.",
      );
      expect(saudacao({ primeiroNome: "Marina", tipo: "RETORNO", situacao: "EM_ANDAMENTO" }).titulo).toContain("de volta");
   });
   it("texto do passo muda quando a vez é do aluno", () => {
      const d = { tipo: "TRANSFERENCIA_EXTERNA" as const, aguardandoAluno: true };
      expect(textoDoPasso("PROPOSTA", "ATUAL", d)).toContain("Sua proposta chegou");
      expect(textoDoPasso("PROPOSTA", "ATUAL", { ...d, aguardandoAluno: false })).toContain("preparando");
   });
   it("WhatsApp já leva o número oficial e o protocolo", () => {
      const url = linkWhatsapp("85560");
      expect(url.startsWith("https://wa.me/5511948477000?text=")).toBe(true);
      expect(decodeURIComponent(url)).toContain("protocolo 85560");
   });
   it("monta a URL pública com o base path, sem barras dobradas", () => {
      expect(urlAcompanhamento("abc123", "https://exemplo.dev/", "/analises/")).toBe("https://exemplo.dev/analises/acompanhe/abc123");
      expect(urlAcompanhamento("abc123", "https://exemplo.dev", "/")).toBe("https://exemplo.dev/acompanhe/abc123");
   });
});
