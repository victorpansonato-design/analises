/** Simulação visual da página do aluno: percorre os momentos sem depender do caso real. */
import { describe, expect, it } from "vitest";

import { montarAcompanhamento, type EntradaAcompanhamento } from "@/features/acompanhamento";
import { momentoReal, momentosSimulados } from "@/features/acompanhamento/domain/simulacao";
import type { Etapa } from "@/features/casos";

const AGORA = "2026-10-16T15:00:00.000Z";
const base = (etapa: Etapa, jornada: Etapa[], extra: Partial<EntradaAcompanhamento> = {}) =>
   montarAcompanhamento({
      protocolo: "85560",
      nome: "Marina Lopes",
      tipo: "TRANSFERENCIA_EXTERNA",
      etapa,
      etapaAnterior: null,
      estudouForaNoPeriodo: null,
      criadoEm: "2026-10-01T12:00:00.000Z",
      atualizadoEm: "2026-10-02T12:00:00.000Z",
      jornada: jornada.map((e, i) => ({ etapa: e, entrouEm: `2026-10-0${i + 1}T12:00:00.000Z` })),
      destino: { nome: "Administração", modalidade: "PRESENCIAL", turno: "NOTURNO", ciclo: "2027.1" },
      ra: null,
      ...extra,
   });

describe("momentosSimulados", () => {
   it("ingresso: documentos, análise, proposta (preparando e enviada) e matrícula", () => {
      const m = momentosSimulados(base("AGUARDANDO_DOCUMENTOS", ["RASCUNHO", "AGUARDANDO_DOCUMENTOS"]), AGORA);
      expect(m.map(x => `${x.passos.find(p => p.estado === "ATUAL")?.passo ?? x.situacao}:${x.aguardandoAluno}`)).toEqual([
         "DOCUMENTOS:true",
         "ANALISE:false",
         "PROPOSTA:false",
         "PROPOSTA:true",
         "MATRICULADO:false",
      ]);
      const fim = m.at(-1)!;
      expect(fim.passos.every(p => p.estado === "FEITO")).toBe(true);
      expect(fim.ra).toBe("202785560");
   });

   it("aproveitamento termina concluído, sem RA", () => {
      const m = momentosSimulados(base("EM_ANALISE", ["EM_ANALISE"], { tipo: "APROVEITAMENTO_ESTUDOS" }), AGORA);
      expect(m.at(-1)?.situacao).toBe("CONCLUIDO");
      expect(m.at(-1)?.ra).toBeNull();
   });

   it("começa de onde o caso real está", () => {
      const real = base("PROPOSTA_ENVIADA", [
         "RASCUNHO",
         "AGUARDANDO_DOCUMENTOS",
         "EM_ANALISE",
         "PRONTO_PARA_MATRICULA",
         "PROPOSTA_ENVIADA",
      ]);
      const m = momentosSimulados(real, AGORA);
      expect(momentoReal(real, m)).toBe(3);
   });
});
