/** Ritmo das metas de vendas: dias úteis, esperado, projeção (estimativa) e situação. */
import { describe, expect, it } from "vitest";

import { acumulado, avaliarMeta, diasUteisDoMes, ordenarPorRendimento, progressoDoMes, totalDaEquipe } from "@/features/gestao";
import { distribuicaoProtocolos } from "@/features/indicadores/domain/destaques";

// 14/10/2026, quarta-feira, meio da tarde em São Paulo.
const AGORA = new Date("2026-10-14T18:00:00Z");

describe("calendário do mês", () => {
   it("conta só segunda a sexta", () => {
      expect(diasUteisDoMes("2026-10")).toHaveLength(22);
      expect(diasUteisDoMes("2026-10")[0]).toBe("2026-10-01");
      expect(diasUteisDoMes("2026-10", ["2026-10-12"])).toHaveLength(21);
   });

   it("mês corrente conta os dias úteis até hoje; mês passado está fechado; futuro não começou", () => {
      expect(progressoDoMes("2026-10", AGORA)).toEqual({ total: 22, decorridos: 10, restantes: 12, fechado: false, futuro: false });
      expect(progressoDoMes("2026-09", AGORA)).toMatchObject({ decorridos: 22, restantes: 0, fechado: true });
      expect(progressoDoMes("2026-11", AGORA)).toMatchObject({ decorridos: 0, futuro: true });
   });
});

describe("avaliarMeta", () => {
   const outubro = progressoDoMes("2026-10", AGORA);

   it("no ritmo quando o realizado acompanha a parte esperada da meta", () => {
      const l = avaliarMeta(22, 10, outubro);
      expect(l.esperado).toBe(10);
      expect(l.projecao).toBe(22);
      expect(l.situacao).toBe("NO_RITMO");
      expect(l.faltam).toBe(12);
      expect(l.porDiaUtil).toBe(1);
   });

   it("atenção e abaixo do ritmo pelos limiares dos parâmetros", () => {
      expect(avaliarMeta(22, 8, outubro).situacao).toBe("ATENCAO");
      expect(avaliarMeta(22, 5, outubro).situacao).toBe("ABAIXO");
   });

   it("meta batida vale mesmo no meio do mês; mês fechado sem meta é não atingida", () => {
      expect(avaliarMeta(8, 9, outubro).situacao).toBe("ATINGIDA");
      expect(avaliarMeta(8, 7, progressoDoMes("2026-09", AGORA)).situacao).toBe("NAO_ATINGIDA");
      expect(avaliarMeta(0, 3, outubro)).toMatchObject({ situacao: "SEM_META", fracao: null });
   });

   it("sem dia útil decorrido não há projeção", () => {
      expect(avaliarMeta(10, 0, progressoDoMes("2026-11", AGORA)).projecao).toBeNull();
   });
});

describe("equipe", () => {
   const c = (nome: string, meta: number, matriculas: number, porDia: number[]) => ({
      id: nome,
      nome,
      meta,
      versaoMeta: 1,
      matriculas,
      matriculasPorDia: porDia,
      protocolosAbertos: 0,
      propostasEnviadas: 0,
      analisesConcluidas: matriculas * 3,
      primeiroContatoHoras: null,
      carteira: [{ etapa: "EM_ANALISE" as const, total: 2 }],
      historico: [],
   });

   it("soma metas, matrículas, carteira e o acumulado por dia", () => {
      const t = totalDaEquipe([c("Ana", 10, 3, [1, 0, 2]), c("Bia", 8, 4, [0, 4])]);
      expect(t).toMatchObject({ meta: 18, matriculas: 7, carteiraAtiva: 4, porDia: [1, 4, 2] });
      expect(acumulado(t.porDia)).toEqual([1, 5, 7]);
   });

   it("ordena por quanto da meta já foi feito", () => {
      const r = ordenarPorRendimento([c("Ana", 10, 3, []), c("Bia", 8, 6, []), c("Caio", 0, 5, [])]);
      expect(r.map(x => x.nome)).toEqual(["Bia", "Ana", "Caio"]);
   });
});

describe("distribuicaoProtocolos", () => {
   it("quatro partes que somam ao total, sem os adiados", () => {
      const etapa = (e: string, total: number) => ({ etapa: e, total, atrasados: 0, emAtencao: 0 });
      const d = distribuicaoProtocolos({
         etapas: [etapa("EM_ANALISE", 6), etapa("PROPOSTA_ENVIADA", 2), etapa("MATRICULADO", 1), etapa("PERDIDO", 1), etapa("ADIADO", 3)],
      } as never);
      expect(d.total).toBe(10);
      expect(d.adiados).toBe(3);
      expect(d.grupos.map(g => g.total)).toEqual([6, 2, 1, 1]);
      expect(d.grupos.reduce((s, g) => s + g.fracao, 0)).toBeCloseTo(1);
   });
});
