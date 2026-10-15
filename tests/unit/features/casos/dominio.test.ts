/** Permissões, prioridade, próximo passo, aba padrão e régua de lembretes. */
import { describe, expect, it } from "vitest";

import { abaPadrao } from "@/features/casos/domain/abas";
import { acaoDoCaso, podeNoCaso } from "@/features/casos/domain/acoes";
import { mascararCpf, pode } from "@/features/casos/domain/permissoes";
import { compararPrioridade, proximoCaso } from "@/features/casos/domain/prioridade";
import { calcularProximoPasso } from "@/features/casos/domain/proximo-passo";
import { proximoLembrete } from "@/features/casos/domain/regua";
import type { AcaoDisponivel, CasoDetalhe, CasoResumo } from "@/features/casos/types/caso.schema";

const AGORA = new Date("2026-10-09T15:00:00Z"); // sexta, 12:00 em São Paulo
const em = (min: number) => new Date(AGORA.getTime() + min * 60_000).toISOString();

describe("permissões compartilhadas", () => {
   const escopo = { etapa: "EM_ANALISE" as const, responsavelId: "u-ana", consultorId: "u-con", cursoDestinoId: "adm" };
   it.each(["CONSULTOR", "ANALISTA", "COORDENADOR", "MATRICULA", "SUPORTE", "DIRETORIA", "ADMIN"] as const)(
      "%s tem o mesmo acesso para decidir, editar e exportar",
      papel => {
         const u = { id: "outra-pessoa", papeis: [papel], cursosCoordenados: [] };
         expect(pode(u, "DECIDIR_ITEM", escopo).pode).toBe(true);
         expect(pode(u, "EDITAR_DADOS", escopo).pode).toBe(true);
         expect(pode(u, "EXPORTAR", escopo).pode).toBe(true);
         expect(pode(u, "AVALIAR_DOCUMENTO", escopo).pode).toBe(true);
      },
   );
   it("responder coordenação depende da etapa e não do curso associado ao login", () => {
      const u = { id: "u", papeis: ["SUPORTE" as const], cursosCoordenados: [] };
      expect(pode(u, "RESPONDER_ITEM_COORDENACAO", { ...escopo, etapa: "AGUARDANDO_COORDENACAO" }).pode).toBe(true);
      expect(pode(u, "RESPONDER_ITEM_COORDENACAO", escopo).pode).toBe(false);
   });
   it("CPF continua mascarado", () => {
      expect(mascararCpf("12345678909")).toBe("***.456.789-**");
      expect(mascararCpf("123")).toBe("***.***.***-**");
   });
});

function resumo(id: string, over: Partial<CasoResumo> = {}): CasoResumo {
   return {
      id,
      protocolo: id,
      tipo: "TRANSFERENCIA_EXTERNA",
      subtipo: null,
      etapa: "EM_ANALISE",
      etapaDesde: em(-600),
      criadoEm: "2026-10-01T12:00:00Z",
      matriculado: false,
      liberadoMatriculaEm: null,
      candidato: { nome: id, ra: null },
      destino: { cursoId: "adm", cursoNome: "Administração", turno: "NOTURNO", modalidade: "PRESENCIAL", matrizId: null, ciclo: "2027.1" },
      responsavel: null,
      sla: { venceEm: em(300), alertaEm: em(200), pausadoAte: null },
      pendencia: null,
      flags: { ouvidoria: false, escalado: false, preAnaliseFalhou: false },
      reanalises: 0,
      versao: 1,
      ...over,
   };
}

describe("prioridade", () => {
   it("estourado → atenção → ouvidoria → mais antigo; pausado no fim", () => {
      const lista = [
         resumo("normal"),
         resumo("pausado", { sla: { venceEm: em(-10), alertaEm: em(-20), pausadoAte: em(1000) } }),
         resumo("ouvidoria", { flags: { ouvidoria: true, escalado: false, preAnaliseFalhou: false } }),
         resumo("atencao", { sla: { venceEm: em(30), alertaEm: em(-10), pausadoAte: null } }),
         resumo("estourado", { sla: { venceEm: em(-5), alertaEm: em(-50), pausadoAte: null } }),
      ];
      expect([...lista].sort(compararPrioridade(AGORA)).map(c => c.id)).toEqual(["estourado", "atencao", "ouvidoria", "normal", "pausado"]);
   });
   it("pegar próximo ignora quem já tem responsável e outras etapas", () => {
      const lista = [
         resumo("dono", { responsavel: { id: "u", nome: "U" }, sla: { venceEm: em(-5), alertaEm: null, pausadoAte: null } }),
         resumo("doc", { etapa: "AGUARDANDO_DOCUMENTOS" }),
         resumo("livre"),
      ];
      expect(proximoCaso(lista, ["EM_ANALISE"], AGORA)?.id).toBe("livre");
      expect(proximoCaso([], ["EM_ANALISE"], AGORA)).toBeNull();
   });
});

const acao = (nome: string, habilitada = true, motivos: string[] = []): AcaoDisponivel => ({
   acao: nome,
   habilitada,
   motivos,
   exigeMotivo: false,
});

function detalhe(over: Partial<CasoDetalhe> = {}): CasoDetalhe {
   return {
      ...resumo("c1"),
      etapaAnterior: null,
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
      origem: { iesNome: null, cursoNome: null, estudouForaNoPeriodo: null },
      ingresso: { ano: 2027, semestre: 1, periodo: null },
      responsaveis: { consultor: null, analista: null, coordenador: null, matricula: null },
      contadores: { documentosObrigatorios: 3, documentosAceitos: 3, itensMatriz: 45, itensSemDecisao: 9, perguntasAbertas: 0 },
      resumoCongeladoEm: null,
      noGed: true,
      jornada: [],
      acoesDisponiveis: [],
      criadoEm: em(-5000),
      atualizadoEm: em(-10),
      ...over,
   };
}

describe("próximo passo", () => {
   it("analista responsável vê o que falta e concluir desabilitado com motivo", () => {
      const p = calcularProximoPasso(
         detalhe({
            responsavel: { id: "u-ana", nome: "Ana" },
            acoesDisponiveis: [acao("CONCLUIR_ANALISE", false, ["Faltam 9 disciplinas sem decisão"])],
         }),
         { id: "u-ana" },
         AGORA,
      );
      expect(p.oQue).toBe("Revisar 9 disciplinas pendentes");
      expect(p.comQuem).toBe("você");
      expect(p.prazo?.texto).toBe("faltam 5 h");
      expect(p.primaria).toMatchObject({ acao: "CONCLUIR_ANALISE", habilitada: false, motivos: ["Faltam 9 disciplinas sem decisão"] });
   });
   it("com perguntas prontas a primária é enviar para coordenação", () => {
      const p = calcularProximoPasso(
         detalhe({
            responsavel: { id: "u-ana", nome: "Ana" },
            contadores: { documentosObrigatorios: 3, documentosAceitos: 3, itensMatriz: 45, itensSemDecisao: 2, perguntasAbertas: 2 },
            acoesDisponiveis: [acao("ENVIAR_COORDENACAO"), acao("CONCLUIR_ANALISE", false, ["Faltam responder 2 perguntas"])],
         }),
         { id: "u-ana" },
         AGORA,
      );
      expect(p.primaria?.acao).toBe("ENVIAR_COORDENACAO");
   });
   it("sem responsável oferece assumir; outros papéis só leem", () => {
      expect(calcularProximoPasso(detalhe({ acoesDisponiveis: [acao("ASSUMIR")] }), { id: "u" }, AGORA).primaria?.acao).toBe("ASSUMIR");
      const outro = calcularProximoPasso(detalhe({ responsavel: { id: "u-ana", nome: "Ana Exemplo" } }), { id: "u-con" }, AGORA);
      expect(outro).toMatchObject({ oQue: "Análise em andamento", comQuem: "Ana Exemplo", primaria: null });
   });
   it("coordenação responde pela aba análise filtrada", () => {
      const p = calcularProximoPasso(
         detalhe({
            etapa: "AGUARDANDO_COORDENACAO",
            contadores: { ...detalhe().contadores, perguntasAbertas: 2 },
            acoesDisponiveis: [acao("RESPONDER_ITEM_COORDENACAO")],
         }),
         { id: "u-coo" },
         AGORA,
      );
      expect(p.oQue).toBe("Responder 2 perguntas");
      expect(p.primaria?.ir).toEqual({ aba: "analise", filtro: "coordenacao" });
   });
   it("matrícula envia a proposta pela aba proposta", () => {
      const p = calcularProximoPasso(
         detalhe({
            etapa: "PRONTO_PARA_MATRICULA",
            responsavel: { id: "u-mat", nome: "M" },
            sla: { venceEm: em(40), alertaEm: em(-10), pausadoAte: null },
            acoesDisponiveis: [acao("ENVIAR_PROPOSTA")],
         }),
         { id: "u-mat" },
         AGORA,
      );
      expect(p).toMatchObject({
         oQue: "Primeiro contato com o candidato",
         comQuem: "você",
         prazo: { texto: "faltam 40 min", estado: "ATENCAO" },
      });
      expect(p.primaria?.ir).toEqual({ aba: "proposta", acao: "ENVIAR_PROPOSTA" });
   });
   it("documentos: com o candidato, lembrete automático e lembrar agora", () => {
      const p = calcularProximoPasso(
         detalhe({
            etapa: "AGUARDANDO_DOCUMENTOS",
            etapaDesde: em(-60),
            contadores: { ...detalhe().contadores, documentosAceitos: 2 },
            acoesDisponiveis: [acao("SOLICITAR_DOCUMENTO")],
         }),
         { id: "u-con" },
         AGORA,
      );
      expect(p.oQue).toBe("Falta 1 documento obrigatório");
      expect(p.comQuem).toBe("candidato");
      expect(p.prazo?.texto).toBe("lembrete automático amanhã, 09:00");
      expect(p.secundaria?.acao).toBe("SOLICITAR_DOCUMENTO");
   });
   it("etapas finais não têm prazo", () => {
      expect(calcularProximoPasso(detalhe({ etapa: "MATRICULADO" }), { id: "u" }, AGORA)).toMatchObject({
         oQue: "Matrícula efetivada",
         prazo: null,
         primaria: null,
      });
      expect(
         calcularProximoPasso(detalhe({ etapa: "PERDIDO", acoesDisponiveis: [acao("REABRIR")] }), { id: "u" }, AGORA).secundaria?.acao,
      ).toBe("REABRIR");
   });
   it("acaoDoCaso e podeNoCaso leem acoesDisponiveis", () => {
      const c = detalhe({ acoesDisponiveis: [acao("EXPORTAR"), acao("EDITAR_DADOS", false, ["x"])] });
      expect(acaoDoCaso(c, "EXPORTAR")?.habilitada).toBe(true);
      expect(podeNoCaso(c, "EDITAR_DADOS")).toBe(false);
      expect(acaoDoCaso(c, "CANCELAR")).toBeNull();
   });
});

describe("aba padrão por papel e etapa", () => {
   it("segue docs/05 §3.4", () => {
      expect(abaPadrao(["ANALISTA"], "EM_ANALISE")).toBe("analise");
      expect(abaPadrao(["COORDENADOR"], "AGUARDANDO_COORDENACAO")).toBe("analise");
      expect(abaPadrao(["CONSULTOR"], "AGUARDANDO_DOCUMENTOS")).toBe("documentos");
      expect(abaPadrao(["MATRICULA"], "PRONTO_PARA_MATRICULA")).toBe("proposta");
      expect(abaPadrao(["SUPORTE"], "EM_ANALISE")).toBe("analise");
      expect(abaPadrao(["DIRETORIA"], "PROPOSTA_ENVIADA")).toBe("proposta");
   });
});

describe("régua de lembretes", () => {
   it("próximo lembrete D+1 às 9h e pula domingo", () => {
      expect(proximoLembrete("2026-10-09T15:00:00Z", [1, 3, 5], "09:00", AGORA)?.toISOString()).toBe("2026-10-10T12:00:00.000Z");
      // Entrou na sexta: D+2 cairia no domingo e passa para segunda.
      expect(proximoLembrete("2026-10-09T15:00:00Z", [2], "09:00", AGORA)?.toISOString()).toBe("2026-10-12T12:00:00.000Z");
      expect(proximoLembrete("2026-10-01T15:00:00Z", [1, 3], "09:00", AGORA)).toBeNull();
   });
});
