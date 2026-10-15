/** Complemento do domínio: escopos de permissão, etapas restantes do próximo passo, SLA e régua. */
import { describe, expect, it } from "vitest";

import { abaPadrao, ehAba } from "@/features/casos/domain/abas";
import { CALENDARIO_PADRAO } from "@/features/casos/domain/parametros";
import { pode } from "@/features/casos/domain/permissoes";
import { calcularProximoPasso, rotuloPendencia } from "@/features/casos/domain/proximo-passo";
import { proximoLembreteDocumentos, proximoLembreteProposta, semRetornoEm } from "@/features/casos/domain/regua";
import { adicionarMinutosUteis, lerSla, rotuloSla } from "@/features/casos/domain/sla";
import type { AcaoDisponivel, CasoDetalhe, Etapa } from "@/features/casos/types/caso.schema";

const AGORA = new Date("2026-10-09T15:00:00Z");
const em = (min: number) => new Date(AGORA.getTime() + min * 60_000).toISOString();
const acao = (nome: string, habilitada = true, motivos: string[] = []): AcaoDisponivel => ({
   acao: nome,
   habilitada,
   motivos,
   exigeMotivo: false,
});

function caso(over: Partial<CasoDetalhe> = {}): CasoDetalhe {
   return {
      id: "c1",
      protocolo: "PRT",
      tipo: "TRANSFERENCIA_EXTERNA",
      subtipo: null,
      etapa: "EM_ANALISE",
      etapaDesde: em(-60),
      matriculado: false,
      liberadoMatriculaEm: null,
      candidato: {
         pessoaId: "p",
         nome: "Candidato Exemplo",
         ra: null,
         outroRa: null,
         cpfMascarado: "***.000.000-**",
         celular: null,
         email: null,
         optInWhatsapp: true,
      },
      destino: { cursoId: "adm", cursoNome: "Administração", turno: "NOTURNO", modalidade: "PRESENCIAL", matrizId: null, ciclo: "2027.1" },
      responsavel: { id: "u-x", nome: "Pessoa Exemplo" },
      sla: { venceEm: em(120), alertaEm: em(90), pausadoAte: null },
      pendencia: null,
      flags: { ouvidoria: false, escalado: false, preAnaliseFalhou: false },
      reanalises: 0,
      versao: 1,
      etapaAnterior: null,
      origem: { iesNome: null, cursoNome: null, estudouForaNoPeriodo: null },
      ingresso: { ano: 2027, semestre: 1, periodo: null },
      responsaveis: { consultor: null, analista: null, coordenador: null, matricula: null },
      contadores: { documentosObrigatorios: 3, documentosAceitos: 3, itensMatriz: 45, itensSemDecisao: 0, perguntasAbertas: 0 },
      resumoCongeladoEm: null,
      noGed: true,
      jornada: [],
      acoesDisponiveis: [],
      criadoEm: em(-5000),
      atualizadoEm: em(-10),
      ...over,
   };
}

describe("capacidades por etapa", () => {
   const u = { id: "u", papeis: ["SUPORTE" as const], cursosCoordenados: [] };
   const escopo = (etapa: Etapa) => ({ etapa, responsavelId: "outra-pessoa", consultorId: null, cursoDestinoId: "dir" });
   it("decisões só em análise, ajuste ou coordenação", () => {
      for (const etapa of ["EM_ANALISE", "AJUSTE_POS_COORDENACAO", "AGUARDANDO_COORDENACAO"] as const)
         expect(pode(u, "DECIDIR_ITEM", escopo(etapa)).pode).toBe(true);
      for (const etapa of ["MATRICULADO", "AGUARDANDO_DOCUMENTOS", "PRE_ANALISE"] as const)
         expect(pode(u, "DECIDIR_ITEM", escopo(etapa)).pode).toBe(false);
   });
   it("perguntas só durante análise e ajuste", () => {
      expect(pode(u, "PERGUNTAR_COORDENACAO", escopo("EM_ANALISE")).pode).toBe(true);
      expect(pode(u, "PERGUNTAR_COORDENACAO", escopo("AGUARDANDO_COORDENACAO")).pode).toBe(false);
   });
   it("contato, notas e financeiro têm acesso comum", () => {
      for (const cap of ["ADICIONAR_NOTA", "ENVIAR_MENSAGEM", "VER_FINANCEIRO"] as const)
         expect(pode(u, cap, escopo("PRONTO_PARA_MATRICULA")).pode).toBe(true);
   });
});

describe("próximo passo nas demais etapas", () => {
   it("rascunho, pré-análise e ajuste", () => {
      expect(
         calcularProximoPasso(caso({ etapa: "RASCUNHO", acoesDisponiveis: [acao("ENVIAR_PROTOCOLO")] }), { id: "u" }, AGORA).primaria?.acao,
      ).toBe("ENVIAR_PROTOCOLO");
      expect(calcularProximoPasso(caso({ etapa: "PRE_ANALISE" }), { id: "u" }, AGORA)).toMatchObject({
         comQuem: "sistema",
         prazo: { texto: "cerca de 1 min" },
      });
      expect(
         calcularProximoPasso(
            caso({ etapa: "AJUSTE_POS_COORDENACAO", responsavel: null, acoesDisponiveis: [acao("ASSUMIR")] }),
            { id: "u" },
            AGORA,
         ).oQue,
      ).toBe("Ajuste após a coordenação sem responsável");
      expect(calcularProximoPasso(caso({ etapa: "AJUSTE_POS_COORDENACAO" }), { id: "outro" }, AGORA).oQue).toBe(
         "Ajuste após a coordenação",
      );
      expect(
         calcularProximoPasso(
            caso({ responsavel: { id: "u", nome: "U" }, acoesDisponiveis: [acao("CONCLUIR_ANALISE")] }),
            { id: "u" },
            AGORA,
         ).oQue,
      ).toBe("Tudo decidido, falta concluir a análise");
   });
   it("coordenação: devolver e visão de quem só acompanha", () => {
      expect(
         calcularProximoPasso(
            caso({
               etapa: "AGUARDANDO_COORDENACAO",
               acoesDisponiveis: [acao("RESPONDER_ITEM_COORDENACAO"), acao("RESPONDER_COORDENACAO")],
            }),
            { id: "u" },
            AGORA,
         ).primaria?.acao,
      ).toBe("RESPONDER_COORDENACAO");
      expect(
         calcularProximoPasso(
            caso({ etapa: "AGUARDANDO_COORDENACAO", contadores: { ...caso().contadores, perguntasAbertas: 1 } }),
            { id: "u" },
            AGORA,
         ).oQue,
      ).toBe("Coordenação responde 1 pergunta");
      expect(calcularProximoPasso(caso({ etapa: "AGUARDANDO_COORDENACAO" }), { id: "u" }, AGORA).oQue).toBe("Coordenação revisando");
   });
   it("matrícula, proposta, conversa e adiado", () => {
      expect(calcularProximoPasso(caso({ etapa: "PRONTO_PARA_MATRICULA" }), { id: "u" }, AGORA).oQue).toBe(
         "Aguardando primeiro contato da matrícula",
      );
      expect(
         calcularProximoPasso(
            caso({ etapa: "PRONTO_PARA_MATRICULA", responsavel: null, acoesDisponiveis: [acao("ASSUMIR"), acao("ENVIAR_PROPOSTA")] }),
            { id: "u" },
            AGORA,
         ).primaria?.acao,
      ).toBe("ASSUMIR");
      const proposta = calcularProximoPasso(
         caso({ etapa: "PROPOSTA_ENVIADA", etapaDesde: em(-30), acoesDisponiveis: [acao("REGISTRAR_RESPOSTA")] }),
         { id: "u" },
         AGORA,
      );
      expect(proposta).toMatchObject({ comQuem: "candidato", secundaria: { acao: "REGISTRAR_RESPOSTA" } });
      expect(proposta.prazo?.texto).toMatch(/^lembrete automático/);
      expect(
         calcularProximoPasso(caso({ etapa: "EM_NEGOCIACAO", acoesDisponiveis: [acao("EFETIVAR_MATRICULA")] }), { id: "u" }, AGORA).primaria
            ?.ir,
      ).toEqual({ aba: "proposta", acao: "EFETIVAR_MATRICULA" });
      const adiado = calcularProximoPasso(
         caso({ etapa: "ADIADO", sla: { venceEm: null, alertaEm: null, pausadoAte: em(3000) }, acoesDisponiveis: [acao("RETOMAR")] }),
         { id: "u" },
         AGORA,
      );
      expect(adiado.oQue).toMatch(/^Adiado, retoma sozinho em/);
      expect(
         calcularProximoPasso(caso({ etapa: "ADIADO", sla: { venceEm: null, alertaEm: null, pausadoAte: null } }), { id: "u" }, AGORA).oQue,
      ).toBe("Adiado");
      expect(calcularProximoPasso(caso({ etapa: "CANCELADO" }), { id: "u" }, AGORA).oQue).toBe("Caso cancelado");
   });
   it("documentos completos aguardando conferência e pendência externa", () => {
      expect(calcularProximoPasso(caso({ etapa: "AGUARDANDO_DOCUMENTOS", etapaDesde: em(-30 * 24 * 60) }), { id: "u" }, AGORA).oQue).toBe(
         "Documentos recebidos, aguardando conferência",
      );
      expect(rotuloPendencia(caso(), AGORA)).toBeNull();
      expect(rotuloPendencia(caso({ pendencia: { tipo: "EDITAL_DP", revisarEm: em(24 * 60) } }), AGORA)).toBe(
         "Aguardando edital de DP · revisar amanhã, 12:00",
      );
   });
});

describe("SLA, régua e abas", () => {
   it("pausado mostra a data; sem SLA não tem rótulo", () => {
      const pausado = lerSla({ venceEm: em(10), alertaEm: null, pausadoAte: "2026-10-20T15:00:00Z" }, AGORA);
      expect(rotuloSla(pausado, "2026-10-20T15:00:00Z")).toBe("pausado até 20/10");
      expect(rotuloSla(lerSla({ venceEm: null, alertaEm: null, pausadoAte: null }, AGORA))).toBe("");
      expect(rotuloSla(lerSla({ venceEm: em(3 * 24 * 60), alertaEm: null, pausadoAte: null }, AGORA))).toBe("faltam 3 d");
   });
   it("horas úteis pulam feriado e fim de semana", () => {
      const cal = { ...CALENDARIO_PADRAO, feriados: ["2026-10-12"] };
      // Sexta 17:00 local + 2 h úteis: 1 h na sexta, sábado vai até 12h → 1 h no sábado.
      expect(adicionarMinutosUteis(new Date("2026-10-09T20:00:00Z"), 120, cal).toISOString()).toBe("2026-10-10T12:00:00.000Z");
      // Sábado 12:00 local + 1 h: domingo fechado, segunda é feriado → terça 09:00.
      expect(adicionarMinutosUteis(new Date("2026-10-10T15:00:00Z"), 60, cal).toISOString()).toBe("2026-10-13T12:00:00.000Z");
   });
   it("atalhos da régua e sem retorno em D+7", () => {
      expect(proximoLembreteDocumentos(em(-60), AGORA)).not.toBeNull();
      expect(proximoLembreteProposta(em(-60), AGORA)).not.toBeNull();
      expect(semRetornoEm("2026-10-09T15:00:00Z").toISOString()).toBe("2026-10-16T15:00:00.000Z");
   });
   it("aba padrão do consultor e validação de aba", () => {
      expect(abaPadrao(["CONSULTOR"], "PRONTO_PARA_MATRICULA")).toBe("proposta");
      expect(abaPadrao(["CONSULTOR"], "EM_ANALISE")).toBe("analise");
      expect(abaPadrao(["MATRICULA"], "EM_ANALISE")).toBe("analise");
      expect(abaPadrao(["ANALISTA"], "AGUARDANDO_DOCUMENTOS")).toBe("documentos");
      expect(ehAba("dados")).toBe(true);
      expect(ehAba("x")).toBe(false);
      expect(ehAba(null)).toBe(false);
   });
});
