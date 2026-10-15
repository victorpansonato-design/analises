/**
 * Cálculo dos indicadores no backend simulado (docs/10, DS §11 "honestidade de dado"): invariantes
 * que tornam impossível o painel discordar de si mesmo.
 */
import { describe, expect, it } from "vitest";

import { IndicadoresSchema, type Indicador } from "@/features/indicadores";

import { calcularIndicadores, ehTeste, filtrarCasos, funilDe, serieSintetica } from "@/mocks/handlers/indicadores";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { semearCasos } from "@/mocks/seed/casos";

const AGORA = new Date("2026-10-09T15:00:00Z");
const SEMENTE = semearCasos(AGORA);
const SEM_FILTRO = { ciclo: null, tipo: null, curso: null, modalidade: null };

function todos(g: ReturnType<typeof calcularIndicadores>): Indicador[] {
   return [...g.fluxo, ...g.resultado, ...g.esforco, ...g.experiencia, ...g.ia];
}

const soma = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

function conferirInvariantes(i: Indicador) {
   if (i.numerador !== null && i.denominador !== null && i.unidade === "PERCENTUAL") {
      expect(i.numerador, i.id).toBeLessThanOrEqual(i.denominador);
      expect(i.numerador, i.id).toBeGreaterThanOrEqual(0);
      if (i.denominador > 0) expect(i.valor, i.id).toBe(i.numerador / i.denominador);
      else expect(i.valor, i.id).toBeNull();
   }
   if (i.valor === null) expect(i.serie, i.id).toEqual([]);
   else {
      expect(i.serie.length, i.id).toBeGreaterThan(0);
      expect(i.serie[i.serie.length - 1].valor, i.id).toBe(i.valor);
   }
   if (i.unidade === "PERCENTUAL") for (const p of i.serie) expect(p.valor >= 0 && p.valor <= 1, i.id).toBe(true);
   expect(i.comoLer.length, i.id).toBeGreaterThan(10);

   const linhas = i.composicao;
   if (linhas.length === 0) return;
   const comDen = linhas.every(l => l.denominador !== undefined && l.denominador !== null);
   if (linhas.every(l => l.percentual === null)) {
      // Linhas que não somam (medianas por grupo): cada uma traz a sua base.
      expect(comDen, i.id).toBe(true);
      return;
   }
   if (comDen) {
      // Linhas com taxa própria: somam ao numerador e ao denominador do indicador.
      expect(soma(linhas.map(l => l.valor)), i.id).toBeCloseTo(i.numerador ?? Number.NaN, 6);
      expect(soma(linhas.map(l => l.denominador as number)), i.id).toBeCloseTo(i.denominador ?? Number.NaN, 6);
      for (const l of linhas) expect(l.valor, `${i.id} ${l.rotulo}`).toBeLessThanOrEqual(l.denominador as number);
   } else {
      // Linhas que dividem um total: somam ao numerador, ao denominador ou ao próprio valor (contagem).
      const total = soma(linhas.map(l => l.valor));
      expect([i.numerador, i.denominador, i.valor], i.id).toContain(total);
      for (const l of linhas) expect(l.percentual, `${i.id} ${l.rotulo}`).toBeCloseTo(total > 0 ? l.valor / total : 0, 9);
   }
}

describe("filtrarCasos", () => {
   it("tira os casos de teste e aplica o recorte", () => {
      const base = SEMENTE.slice(0, 3).map((c, i) => ({ ...c, teste: i === 0 }));
      const cancelado: CasoRegistro = { ...SEMENTE[3], etapa: "CANCELADO", motivoEncerramento: "TESTE", teste: false };
      expect(ehTeste(cancelado)).toBe(true);
      const r = filtrarCasos([...base, cancelado], SEM_FILTRO);
      expect(r.map(c => c.id)).toEqual(base.slice(1).map(c => c.id));
      const porCurso = filtrarCasos(SEMENTE, { ...SEM_FILTRO, curso: "adm" });
      expect(porCurso.length).toBeGreaterThan(0);
      expect(porCurso.every(c => c.destino.cursoId === "adm")).toBe(true);
   });
});

describe("calcularIndicadores (lista pequena)", () => {
   const pequena = filtrarCasos(SEMENTE.slice(0, 40), SEM_FILTRO);
   const g = calcularIndicadores({ casos: pequena, agora: AGORA, porPessoa: true, analise: () => null });

   it("respeita o contrato", () => {
      expect(() => IndicadoresSchema.parse({ funil: funilDe(pequena, AGORA), ...g, geradoEm: AGORA.toISOString() })).not.toThrow();
   });

   it("numerador ≤ denominador, valor = numerador ÷ denominador e último ponto = valor", () => {
      for (const i of todos(g)) conferirInvariantes(i);
   });

   it("atrasados agora é a soma do funil do mesmo recorte", () => {
      const funil = funilDe(pequena, AGORA);
      const atrasados = g.fluxo.find(i => i.id === "atrasados-agora") as Indicador;
      expect(atrasados.numerador).toBe(soma(funil.etapas.map(e => e.atrasados)));
      expect(atrasados.denominador).toBe(soma(funil.etapas.map(e => e.total)));
   });

   it("conversão segue a coorte de análise concluída", () => {
      const coorte = pequena.filter(c => c.jornada.some(p => p.etapa === "PRONTO_PARA_MATRICULA"));
      const conv = g.resultado.find(i => i.id === "conversao") as Indicador;
      expect(conv.denominador).toBe(coorte.length);
      expect(conv.numerador).toBe(coorte.filter(c => c.etapa === "MATRICULADO").length);
   });

   it("é determinístico", () => {
      expect(calcularIndicadores({ casos: pequena, agora: AGORA, porPessoa: true, analise: () => null })).toEqual(g);
   });
});

describe("calcularIndicadores (semente inteira)", () => {
   const casos = filtrarCasos(SEMENTE, SEM_FILTRO);

   it("mantém os invariantes em todos os grupos", () => {
      const g = calcularIndicadores({ casos, agora: AGORA, porPessoa: true, analise: () => null });
      expect(g.ia.length).toBeGreaterThan(0);
      for (const i of todos(g)) conferirInvariantes(i);
   });

   it("sem VER_INDICADORES_POR_PESSOA não há IA nem conversão por responsável", () => {
      const g = calcularIndicadores({ casos, agora: AGORA, porPessoa: false, analise: () => null });
      expect(g.ia).toEqual([]);
      expect(g.resultado.some(i => i.id === "conversao-responsavel")).toBe(false);
   });

   it("filtrar soma um subconjunto: o recorte por curso cabe no total", () => {
      const total = calcularIndicadores({ casos, agora: AGORA, porPessoa: false, analise: () => null });
      const adm = calcularIndicadores({
         casos: casos.filter(c => c.destino.cursoId === "adm"),
         agora: AGORA,
         porPessoa: false,
         analise: () => null,
      });
      for (const id of ["toques-consultor", "conversao", "perdas"]) {
         const t = [...total.resultado, ...total.esforco].find(i => i.id === id) as Indicador;
         const a = [...adm.resultado, ...adm.esforco].find(i => i.id === id) as Indicador;
         expect(a.numerador as number).toBeLessThanOrEqual(t.numerador as number);
         expect(a.denominador as number).toBeLessThanOrEqual(t.denominador as number);
      }
   });
});

describe("serieSintetica", () => {
   it("termina no valor e não sai de [0, 1] em taxa", () => {
      const s = serieSintetica("x", 0.02, AGORA, true);
      expect(s).toHaveLength(8);
      expect(s[s.length - 1].valor).toBe(0.02);
      expect(s.every(p => p.valor >= 0 && p.valor <= 1)).toBe(true);
      expect(serieSintetica("x", null, AGORA, true)).toEqual([]);
   });
});
