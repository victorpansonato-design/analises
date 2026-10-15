/**
 * Ponto de partida: a fase 2 deve cobrir TODAS as transições e guardas.
 */
import { describe, expect, it } from "vitest";

import { acoesDisponiveis, avaliarAcao, transicionar, type Ator, type CasoMaquina } from "@/features/casos/domain/caso.machine";

const AGORA = new Date("2026-10-09T15:00:00Z");

function caso(over: Partial<CasoMaquina> = {}): CasoMaquina {
   return {
      etapa: "EM_ANALISE",
      etapaAnterior: "PRE_ANALISE",
      tipo: "TRANSFERENCIA_EXTERNA",
      subtipo: null,
      estudouForaNoPeriodo: null,
      responsavelId: "u-ana",
      consultorId: "u-con",
      cursoDestinoId: "adm",
      cpfValido: true,
      celularValido: true,
      destinoDefinido: true,
      possuiCasoAtivoDuplicado: false,
      checklistCompleto: true,
      itensSemDecisao: 0,
      perguntasAbertas: 0,
      periodoIngressoDefinido: true,
      horasComplementaresValidas: true,
      origemRepetidaInvalida: false,
      resumoCongelado: false,
      resumoDoCicloVigente: false,
      condicaoFinanceiraCarregada: false,
      optInWhatsapp: true,
      aceiteRegistrado: false,
      matrizDoCicloMudou: false,
      ...over,
   };
}

const pessoa = (id: string, ...papeis: Extract<Ator, { tipo: "PESSOA" }>["papeis"]): Ator => ({
   tipo: "PESSOA",
   id,
   papeis,
   cursosCoordenados: papeis.includes("COORDENADOR") ? ["adm"] : [],
});
const analista = pessoa("u-ana", "ANALISTA");
const outraAnalista = pessoa("u-out", "ANALISTA");
const coordenador = pessoa("u-coo", "COORDENADOR");
const matricula = pessoa("u-mat", "MATRICULA");
const consultor = pessoa("u-con", "CONSULTOR");
const sistema: Ator = { tipo: "SISTEMA" };

describe("ENVIAR_PROTOCOLO", () => {
   it("externa vai para documentos", () => {
      const r = transicionar("ENVIAR_PROTOCOLO", { caso: caso({ etapa: "RASCUNHO" }), ator: consultor, agora: AGORA });
      expect(r.para).toBe("AGUARDANDO_DOCUMENTOS");
   });
   it("interna pula documentos", () => {
      const r = transicionar("ENVIAR_PROTOCOLO", {
         caso: caso({ etapa: "RASCUNHO", tipo: "TRANSFERENCIA_INTERNA" }),
         ator: consultor,
         agora: AGORA,
      });
      expect(r.para).toBe("PRE_ANALISE");
   });
   it("retorno que estudou fora pede documentos", () => {
      const r = transicionar("ENVIAR_PROTOCOLO", {
         caso: caso({ etapa: "RASCUNHO", tipo: "RETORNO", subtipo: "SEM_VINCULO", estudouForaNoPeriodo: true }),
         ator: consultor,
         agora: AGORA,
      });
      expect(r.para).toBe("AGUARDANDO_DOCUMENTOS");
   });
   it("bloqueia duplicado com mensagem pronta", () => {
      const av = avaliarAcao("ENVIAR_PROTOCOLO", {
         caso: caso({ etapa: "RASCUNHO", possuiCasoAtivoDuplicado: true }),
         ator: consultor,
         agora: AGORA,
      });
      expect(av.habilitada).toBe(false);
      expect(av.motivos).toContain("Já existe um caso ativo deste candidato para este curso");
   });
});

describe("CONCLUIR_ANALISE", () => {
   it("qualquer colaborador conclui com as guardas satisfeitas", () => {
      const av = avaliarAcao("CONCLUIR_ANALISE", { caso: caso(), ator: outraAnalista, agora: AGORA });
      expect(av.habilitada).toBe(true);
      expect(av.motivos).toEqual([]);
   });
   it("explica pendências no plural", () => {
      const av = avaliarAcao("CONCLUIR_ANALISE", { caso: caso({ itensSemDecisao: 3 }), ator: analista, agora: AGORA });
      expect(av.motivos).toContain("Faltam 3 disciplinas sem decisão");
   });
   it("vai para pronto para matrícula", () => {
      expect(transicionar("CONCLUIR_ANALISE", { caso: caso(), ator: analista, agora: AGORA }).para).toBe("PRONTO_PARA_MATRICULA");
   });
});

describe("coordenação", () => {
   it("enviar exige pergunta", () => {
      expect(avaliarAcao("ENVIAR_COORDENACAO", { caso: caso(), ator: analista, agora: AGORA }).habilitada).toBe(false);
      expect(avaliarAcao("ENVIAR_COORDENACAO", { caso: caso({ perguntasAbertas: 2 }), ator: analista, agora: AGORA }).habilitada).toBe(
         true,
      );
   });
   it("coordenação tem acesso comum e ainda exige todas as perguntas respondidas", () => {
      const c = caso({ etapa: "AGUARDANDO_COORDENACAO" });
      expect(avaliarAcao("RESPONDER_COORDENACAO", { caso: c, ator: coordenador, agora: AGORA }).habilitada).toBe(true);
      const deOutroCurso = { ...coordenador, cursosCoordenados: ["dir"] } as Ator;
      expect(avaliarAcao("RESPONDER_COORDENACAO", { caso: c, ator: deOutroCurso, agora: AGORA }).habilitada).toBe(true);
   });
});

describe("motivo e restrições por papel", () => {
   it("encerrar exige motivo", () => {
      const ctx = { caso: caso({ etapa: "EM_NEGOCIACAO" }), ator: matricula, agora: AGORA };
      expect(() => transicionar("ENCERRAR_PERDIDO", ctx)).toThrow();
      expect(transicionar("ENCERRAR_PERDIDO", { ...ctx, payload: { motivo: "FINANCEIRO" } }).para).toBe("PERDIDO");
   });
   it("consultor pode cancelar nas etapas abertas com motivo", () => {
      expect(avaliarAcao("CANCELAR", { caso: caso({ etapa: "AGUARDANDO_DOCUMENTOS" }), ator: consultor, agora: AGORA }).habilitada).toBe(
         true,
      );
      expect(avaliarAcao("CANCELAR", { caso: caso({ etapa: "EM_ANALISE" }), ator: consultor, agora: AGORA }).habilitada).toBe(true);
   });
   it("adiar exige data futura", () => {
      const ctx = { caso: caso({ etapa: "PRONTO_PARA_MATRICULA" }), ator: matricula, agora: AGORA };
      expect(avaliarAcao("ADIAR", { ...ctx, payload: { motivo: "PROXIMO_CICLO", retomarEm: "2026-10-01T12:00:00Z" } }).habilitada).toBe(
         false,
      );
      expect(avaliarAcao("ADIAR", { ...ctx, payload: { motivo: "PROXIMO_CICLO", retomarEm: "2027-01-10T12:00:00Z" } }).habilitada).toBe(
         true,
      );
   });
});

describe("sistema", () => {
   it("sem retorno grava motivo SEM_RETORNO", () => {
      const r = transicionar("MARCAR_SEM_RETORNO", { caso: caso({ etapa: "PROPOSTA_ENVIADA" }), ator: sistema, agora: AGORA });
      expect(r.para).toBe("PERDIDO");
      expect(r.evento.motivo).toBe("SEM_RETORNO");
   });
   it("pessoa não executa ação exclusiva do sistema", () => {
      expect(avaliarAcao("CONCLUIR_PRE_ANALISE", { caso: caso({ etapa: "PRE_ANALISE" }), ator: analista, agora: AGORA }).habilitada).toBe(
         false,
      );
   });
});

describe("REABRIR e RETOMAR", () => {
   it("reabre em pronto quando o resumo é do ciclo vigente", () => {
      const c = caso({ etapa: "PERDIDO", resumoCongelado: true, resumoDoCicloVigente: true });
      expect(transicionar("REABRIR", { caso: c, ator: matricula, agora: AGORA, payload: { motivo: "x" } }).para).toBe(
         "PRONTO_PARA_MATRICULA",
      );
   });
   it("retoma na etapa anterior", () => {
      const c = caso({ etapa: "ADIADO", etapaAnterior: "PROPOSTA_ENVIADA" });
      expect(transicionar("RETOMAR", { caso: c, ator: sistema, agora: AGORA }).para).toBe("PROPOSTA_ENVIADA");
   });
});

describe("acoesDisponiveis", () => {
   it("matrícula em PRONTO vê enviar proposta bloqueada com motivos", () => {
      const lista = acoesDisponiveis({ caso: caso({ etapa: "PRONTO_PARA_MATRICULA" }), ator: matricula, agora: AGORA });
      const enviar = lista.find(a => a.acao === "ENVIAR_PROPOSTA");
      expect(enviar?.habilitada).toBe(false);
      expect(enviar?.motivos).toContain("A análise ainda não foi concluída");
   });
});
