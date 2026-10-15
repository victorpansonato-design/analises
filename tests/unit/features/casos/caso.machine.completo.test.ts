/**
 * Cobertura completa da máquina (docs/12 Fase 2): toda transição a partir de toda etapa de origem e
 * toda guarda com a mensagem que a interface mostra.
 */
import { describe, expect, it } from "vitest";

import { TRANSICOES, avaliarAcao, etapasDaJornada, transicionar, type Ator, type CasoMaquina } from "@/features/casos/domain/caso.machine";
import type { AcaoTransicao, Etapa } from "@/features/casos/types/caso.schema";

const AGORA = new Date("2026-10-09T15:00:00Z");
const FUTURO = "2026-11-01T12:00:00Z";

function caso(over: Partial<CasoMaquina> = {}): CasoMaquina {
   return {
      etapa: "EM_ANALISE",
      etapaAnterior: "PRE_ANALISE",
      tipo: "TRANSFERENCIA_EXTERNA",
      subtipo: null,
      estudouForaNoPeriodo: null,
      responsavelId: "u-1",
      consultorId: "u-1",
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
      resumoCongelado: true,
      resumoDoCicloVigente: true,
      condicaoFinanceiraCarregada: true,
      optInWhatsapp: true,
      aceiteRegistrado: true,
      matrizDoCicloMudou: false,
      ...over,
   };
}

const ADMIN: Ator = { tipo: "PESSOA", id: "u-1", papeis: ["ADMIN"], cursosCoordenados: [] };
const SISTEMA: Ator = { tipo: "SISTEMA" };
const pessoa = (papel: Parameters<typeof Array.prototype.includes>[0], cursos: string[] = []): Ator => ({
   tipo: "PESSOA",
   id: "u-1",
   papeis: [papel as never],
   cursosCoordenados: cursos,
});

/** Um ator que pode executar a transição (o papel humano listado ou o sistema). */
function atorPara(acao: AcaoTransicao): Ator {
   const t = TRANSICOES.find(x => x.acao === acao);
   if (!t || t.papeis.length === 0) return SISTEMA;
   const papel = t.papeis[0];
   return pessoa(papel, papel === "COORDENADOR" ? ["adm"] : []);
}

const AJUSTES: Partial<Record<AcaoTransicao, Partial<CasoMaquina>>> = {
   ENVIAR_COORDENACAO: { perguntasAbertas: 1 },
};

describe("toda transição a partir de toda etapa de origem", () => {
   for (const t of TRANSICOES) {
      for (const de of t.de) {
         it(`${t.acao} sai de ${de}`, () => {
            const atorFinal = atorPara(t.acao);
            const r = transicionar(t.acao, {
               caso: caso({ etapa: de, ...AJUSTES[t.acao] }),
               ator: atorFinal,
               payload: { motivo: "OUTRO", texto: "teste", retomarEm: FUTURO },
               agora: AGORA,
            });
            expect(r.de).toBe(de);
            expect(r.etapaDesde).toBe(AGORA.toISOString());
            expect(r.evento.acao).toBe(t.acao);
         });
      }
   }
});

describe("destinos condicionais", () => {
   const ctx = (acao: AcaoTransicao, over: Partial<CasoMaquina>, ator: Ator = atorPara(acao)) =>
      transicionar(acao, { caso: caso(over), ator, payload: { motivo: "OUTRO", retomarEm: FUTURO }, agora: AGORA }).para;

   it("retomar volta para a etapa anterior, ou pré-análise se a matriz do ciclo mudou", () => {
      expect(ctx("RETOMAR", { etapa: "ADIADO", etapaAnterior: "PROPOSTA_ENVIADA" })).toBe("PROPOSTA_ENVIADA");
      expect(ctx("RETOMAR", { etapa: "ADIADO", etapaAnterior: "PROPOSTA_ENVIADA", matrizDoCicloMudou: true })).toBe("PRE_ANALISE");
      expect(ctx("RETOMAR", { etapa: "ADIADO", etapaAnterior: null, resumoCongelado: false })).toBe("EM_ANALISE");
   });

   it("reabrir escolhe matrícula, análise ou documentos", () => {
      expect(ctx("REABRIR", { etapa: "PERDIDO" })).toBe("PRONTO_PARA_MATRICULA");
      expect(ctx("REABRIR", { etapa: "PERDIDO", resumoDoCicloVigente: false })).toBe("EM_ANALISE");
      expect(ctx("REABRIR", { etapa: "CANCELADO", resumoCongelado: false, checklistCompleto: false })).toBe("AGUARDANDO_DOCUMENTOS");
      expect(ctx("REABRIR", { etapa: "CANCELADO", resumoCongelado: false, checklistCompleto: false, tipo: "TRANSFERENCIA_INTERNA" })).toBe(
         "EM_ANALISE",
      );
   });

   it("alterar destino continua em documentos ou volta para a pré-análise", () => {
      expect(ctx("ALTERAR_DESTINO", { etapa: "AGUARDANDO_DOCUMENTOS" })).toBe("AGUARDANDO_DOCUMENTOS");
      expect(ctx("ALTERAR_DESTINO", { etapa: "PROPOSTA_ENVIADA" })).toBe("PRE_ANALISE");
   });

   it("diploma pede documentos; retorno com vínculo não", () => {
      expect(ctx("ENVIAR_PROTOCOLO", { etapa: "RASCUNHO", tipo: "PORTADOR_DIPLOMA" })).toBe("AGUARDANDO_DOCUMENTOS");
      expect(
         ctx("ENVIAR_PROTOCOLO", {
            etapa: "RASCUNHO",
            tipo: "RETORNO",
            subtipo: "COM_VINCULO_ALTERACAO_CURRICULAR",
            estudouForaNoPeriodo: null,
         }),
      ).toBe("PRE_ANALISE");
   });
});

describe("toda guarda falha com a mensagem pronta", () => {
   const casos: [AcaoTransicao, Etapa, Partial<CasoMaquina>, string][] = [
      ["ENVIAR_PROTOCOLO", "RASCUNHO", { cpfValido: false }, "Informe um CPF válido"],
      ["ENVIAR_PROTOCOLO", "RASCUNHO", { celularValido: false }, "Informe um celular válido"],
      ["ENVIAR_PROTOCOLO", "RASCUNHO", { destinoDefinido: false }, "Defina curso, turno e modalidade de destino"],
      ["DOCUMENTOS_COMPLETOS", "AGUARDANDO_DOCUMENTOS", { checklistCompleto: false }, "Ainda há documentos obrigatórios não aceitos"],
      ["ENVIAR_COORDENACAO", "EM_ANALISE", { perguntasAbertas: 0 }, "Crie ao menos uma pergunta à coordenação em um item da análise"],
      ["RESPONDER_COORDENACAO", "AGUARDANDO_COORDENACAO", { perguntasAbertas: 1 }, "Falta responder 1 pergunta"],
      ["CONCLUIR_ANALISE", "EM_ANALISE", { itensSemDecisao: 1 }, "Falta 1 disciplina sem decisão"],
      ["CONCLUIR_ANALISE", "EM_ANALISE", { perguntasAbertas: 2 }, "Faltam responder 2 perguntas"],
      ["CONCLUIR_ANALISE", "EM_ANALISE", { periodoIngressoDefinido: false }, "Defina o período de ingresso"],
      ["CONCLUIR_ANALISE", "EM_ANALISE", { horasComplementaresValidas: false }, "Há atividade complementar acima do limite de horas"],
      [
         "CONCLUIR_ANALISE",
         "EM_ANALISE",
         { origemRepetidaInvalida: true },
         "Uma disciplina de origem está sustentando mais de uma dispensa",
      ],
      ["ENVIAR_PROPOSTA", "PRONTO_PARA_MATRICULA", { resumoCongelado: false }, "A análise ainda não foi concluída"],
      ["ENVIAR_PROPOSTA", "PRONTO_PARA_MATRICULA", { condicaoFinanceiraCarregada: false }, "A condição financeira ainda não foi carregada"],
      ["ENVIAR_PROPOSTA", "PRONTO_PARA_MATRICULA", { optInWhatsapp: false }, "O candidato não autorizou contato pelo WhatsApp"],
      ["ALTERAR_DESTINO", "EM_ANALISE", { destinoDefinido: false }, "Defina curso, turno e modalidade de destino"],
   ];
   for (const [acao, etapa, over, mensagem] of casos) {
      it(`${acao}: ${mensagem}`, () => {
         const av = avaliarAcao(acao, { caso: caso({ etapa, ...over }), ator: atorPara(acao), agora: AGORA });
         expect(av.visivel).toBe(true);
         expect(av.habilitada).toBe(false);
         expect(av.motivos).toContain(mensagem);
         expect(() =>
            transicionar(acao, { caso: caso({ etapa, ...over }), ator: atorPara(acao), payload: { motivo: "OUTRO" }, agora: AGORA }),
         ).toThrow();
      });
   }

   it("adiar com data no passado explica a data", () => {
      const av = avaliarAcao("ADIAR", {
         caso: caso({ etapa: "PRONTO_PARA_MATRICULA" }),
         ator: pessoa("MATRICULA"),
         payload: { retomarEm: "2026-01-01T00:00:00Z" },
         agora: AGORA,
      });
      expect(av.motivos).toEqual(["Escolha uma data de retomada no futuro"]);
   });

   it("efetivar fica habilitada sem aceite, mas a transição exige o aceite no pedido", () => {
      const base = { caso: caso({ etapa: "EM_NEGOCIACAO", aceiteRegistrado: false }), ator: pessoa("MATRICULA"), agora: AGORA };
      expect(avaliarAcao("EFETIVAR_MATRICULA", base).habilitada).toBe(true);
      expect(() => transicionar("EFETIVAR_MATRICULA", base)).toThrow(/aceite/);
      expect(transicionar("EFETIVAR_MATRICULA", { ...base, payload: { aceite: { canal: "WHATSAPP", em: FUTURO } } }).para).toBe(
         "MATRICULADO",
      );
   });

   it("ação fora da etapa não aparece", () => {
      expect(avaliarAcao("ENVIAR_PROPOSTA", { caso: caso({ etapa: "EM_ANALISE" }), ator: pessoa("MATRICULA"), agora: AGORA }).visivel).toBe(
         false,
      );
   });

   it("sistema não executa ação exclusiva de pessoas", () => {
      const av = avaliarAcao("CONCLUIR_ANALISE", { caso: caso(), ator: SISTEMA, agora: AGORA });
      expect(av.motivos).toEqual(["Ação exclusiva de pessoas"]);
   });

   it("transição sem motivo quando é exigido é recusada", () => {
      expect(() => transicionar("CANCELAR", { caso: caso({ etapa: "AGUARDANDO_DOCUMENTOS" }), ator: ADMIN, agora: AGORA })).toThrow(
         /motivo/i,
      );
   });
});

describe("etapasDaJornada", () => {
   it("interna não passa por documentos", () => {
      expect(etapasDaJornada({ tipo: "TRANSFERENCIA_INTERNA", estudouForaNoPeriodo: null })[0]).toBe("PRE_ANALISE");
      expect(etapasDaJornada({ tipo: "TRANSFERENCIA_EXTERNA", estudouForaNoPeriodo: null })[0]).toBe("AGUARDANDO_DOCUMENTOS");
   });
});
