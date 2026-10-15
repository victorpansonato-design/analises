/** Processos e aproveitamento de estudos (decisão de 14/10/2026): recorte da fila, máquina e abas. */
import { describe, expect, it } from "vitest";

import { abasDoTipo } from "@/features/casos/domain/abas";
import { avaliarAcao, etapasDaJornada, type CasoMaquina } from "@/features/casos/domain/caso.machine";
import { PROCESSOS, ehProcesso, filasDoProcesso, processoDoTipo, tiposDoProcesso } from "@/features/casos/domain/processos";
import { TIPOS } from "@/features/casos/types/caso.schema";
import { ACESSOS, PAPEL_DO_ACESSO, acessoDoPapel } from "@/features/sessao";

const AGORA = new Date("2026-10-14T15:00:00Z");

function caso(over: Partial<CasoMaquina> = {}): CasoMaquina {
   return {
      etapa: "EM_ANALISE",
      etapaAnterior: "PRE_ANALISE",
      tipo: "APROVEITAMENTO_ESTUDOS",
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

const ANALISTA = { tipo: "PESSOA" as const, id: "u-1", papeis: ["ANALISTA" as const], cursosCoordenados: [] };

describe("processos", () => {
   it("cada tipo pertence a exatamente um processo", () => {
      for (const t of TIPOS) expect(PROCESSOS.filter(p => (p.tipos as readonly string[]).includes(t))).toHaveLength(1);
      expect(processoDoTipo("RETORNO")).toBe("INGRESSO");
      expect(processoDoTipo("APROVEITAMENTO_ESTUDOS")).toBe("APROVEITAMENTO");
   });

   it("ingresso junta externa, portador e retorno; sem processo valem todos os tipos", () => {
      expect(tiposDoProcesso("INGRESSO")).toEqual(["TRANSFERENCIA_EXTERNA", "PORTADOR_DIPLOMA", "RETORNO"]);
      expect(tiposDoProcesso(null)).toEqual(TIPOS);
      expect(ehProcesso("APROVEITAMENTO")).toBe(true);
      expect(ehProcesso("QUALQUER")).toBe(false);
   });

   it("aproveitamento não tem a fila de matrícula; os outros têm", () => {
      expect(filasDoProcesso("APROVEITAMENTO").map(f => f.id)).not.toContain("LIBERADAS");
      expect(filasDoProcesso("INGRESSO").map(f => f.id)).toContain("LIBERADAS");
      expect(filasDoProcesso(null).map(f => f.id)).toContain("LIBERADAS");
   });
});

describe("aproveitamento de estudos termina na análise", () => {
   it("concluir a análise leva a Concluído, não a Pronto para matrícula", () => {
      expect(avaliarAcao("CONCLUIR_ANALISE", { caso: caso(), ator: ANALISTA, agora: AGORA }).para).toBe("CONCLUIDO");
      expect(avaliarAcao("CONCLUIR_ANALISE", { caso: caso({ tipo: "TRANSFERENCIA_EXTERNA" }), ator: ANALISTA, agora: AGORA }).para).toBe(
         "PRONTO_PARA_MATRICULA",
      );
   });

   it("a jornada não passa por matrícula e exige documentos de fora", () => {
      const jornada = etapasDaJornada({ tipo: "APROVEITAMENTO_ESTUDOS", estudouForaNoPeriodo: null });
      expect(jornada[0]).toBe("AGUARDANDO_DOCUMENTOS");
      expect(jornada.at(-1)).toBe("CONCLUIDO");
      expect(jornada).not.toContain("PRONTO_PARA_MATRICULA");
   });

   it("o caso não tem a aba Proposta", () => {
      expect(abasDoTipo("APROVEITAMENTO_ESTUDOS")).not.toContain("proposta");
      expect(abasDoTipo("RETORNO")).toContain("proposta");
   });
});

describe("acessos", () => {
   it("são três: todos, gestão comercial e coordenadores", () => {
      expect(ACESSOS).toEqual(["TODOS", "GESTAO", "COORDENACAO"]);
      for (const a of ACESSOS) expect(acessoDoPapel(PAPEL_DO_ACESSO[a])).toBe(a);
      expect(acessoDoPapel("MATRICULA")).toBe("TODOS");
   });
});
