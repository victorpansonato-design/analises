import { describe, expect, it } from "vitest";

import {
   buscarOfertas,
   codigoDoCurso,
   consultaValida,
   type CurriculoResumo,
   type FiltroMatriz,
   type OfertaBase,
} from "@/features/matriz-curricular";

function curriculo(id: string, extra: Partial<CurriculoResumo> = {}): CurriculoResumo {
   return {
      id,
      codigo: id.toUpperCase(),
      rotulo: "Matriz 2026.1",
      turno: null,
      vigenciaInicio: "2026-02-01",
      ativo: true,
      chTotal: 3000,
      totalDisciplinas: 40,
      ...extra,
   };
}

const catalogo: (OfertaBase & { curriculos: CurriculoResumo[] })[] = [
   {
      id: "adm-presencial",
      curso: "Administração",
      modalidade: "PRESENCIAL",
      codigo: 8,
      curriculos: [
         curriculo("adm-2026-1-n", { turno: "NOTURNO" }),
         curriculo("adm-2026-1-d", { turno: "DIURNO" }),
         curriculo("adm-2022-1-n", { turno: "NOTURNO", ativo: false, vigenciaInicio: "2022-02-01" }),
      ],
   },
   { id: "adm-hibrido", curso: "Administração", modalidade: "HIBRIDO", codigo: 2008, curriculos: [curriculo("adm-2025-1-h")] },
   { id: "adm-ead", curso: "Administração", modalidade: "EAD", codigo: 7008, curriculos: [curriculo("adm-2026-1-ead")] },
   {
      id: "dir-presencial",
      curso: "Direito",
      modalidade: "PRESENCIAL",
      codigo: 12,
      curriculos: [curriculo("dir-2026-1-d", { turno: "DIURNO" })],
   },
   {
      id: "cont-ead",
      curso: "Ciências Contábeis",
      modalidade: "EAD",
      codigo: 7009,
      curriculos: [curriculo("cco-2023-1-ead", { ativo: false })],
   },
];

const filtro = (q: string, extra: Partial<FiltroMatriz> = {}): FiltroMatriz => ({ q, modalidade: null, turno: null, ...extra });

describe("código do curso por modalidade", () => {
   it("presencial é a base; híbrido soma 2000 e EAD soma 7000", () => {
      expect(codigoDoCurso(8, "PRESENCIAL")).toBe(8);
      expect(codigoDoCurso(8, "HIBRIDO")).toBe(2008);
      expect(codigoDoCurso(8, "EAD")).toBe(7008);
   });
});

describe("consulta válida", () => {
   it("código busca com um dígito; nome pede ao menos duas letras", () => {
      expect(consultaValida("8")).toBe(true);
      expect(consultaValida("a")).toBe(false);
      expect(consultaValida("ad")).toBe(true);
      expect(consultaValida("   ")).toBe(false);
   });
});

describe("busca de ofertas", () => {
   it("sem consulta não lista nada (tela calma ao abrir)", () => {
      expect(buscarOfertas(catalogo, filtro(""))).toEqual([]);
   });

   it("nome casa sem acento e sem caixa, em todas as modalidades, na ordem presencial, híbrido e EAD", () => {
      expect(buscarOfertas(catalogo, filtro("ADMINISTRACAO")).map(o => o.codigo)).toEqual([8, 2008, 7008]);
   });

   it("código exato acha a oferta da modalidade", () => {
      expect(buscarOfertas(catalogo, filtro("7008")).map(o => o.id)).toEqual(["adm-ead"]);
      expect(buscarOfertas(catalogo, filtro("2008")).map(o => o.id)).toEqual(["adm-hibrido"]);
      expect(buscarOfertas(catalogo, filtro("8")).map(o => o.id)).toEqual(["adm-presencial"]);
   });

   it("código casa pelo começo", () => {
      expect(buscarOfertas(catalogo, filtro("700")).map(o => o.codigo)).toEqual([7008, 7009]);
   });

   it("só currículos ativos aparecem, do mais recente; os inativos viram contagem", () => {
      const [adm] = buscarOfertas(catalogo, filtro("adm", { modalidade: "PRESENCIAL" }));
      expect(adm.curriculos.map(c => c.id)).toEqual(["adm-2026-1-d", "adm-2026-1-n"]);
      expect(adm.inativos).toBe(1);
      const [cont] = buscarOfertas(catalogo, filtro("contabeis"));
      expect(cont.curriculos).toEqual([]);
      expect(cont.inativos).toBe(1);
   });

   it("filtra pela modalidade", () => {
      expect(buscarOfertas(catalogo, filtro("administração", { modalidade: "EAD" })).map(o => o.codigo)).toEqual([7008]);
   });

   it("turno vale só no presencial e mostra apenas os currículos daquele turno", () => {
      const noturno = buscarOfertas(catalogo, filtro("ad", { modalidade: "PRESENCIAL", turno: "NOTURNO" }));
      expect(noturno).toHaveLength(1);
      expect(noturno[0].curriculos.map(c => c.id)).toEqual(["adm-2026-1-n"]);
      expect(noturno[0].inativos).toBe(1);
      expect(buscarOfertas(catalogo, filtro("direito", { modalidade: "PRESENCIAL", turno: "NOTURNO" }))).toEqual([]);
      // Fora do presencial o turno é ignorado.
      expect(buscarOfertas(catalogo, filtro("adm", { modalidade: "EAD", turno: "DIURNO" }))).toHaveLength(1);
   });

   it("devolve só o resumo do currículo, sem campos extras do catálogo", () => {
      const comExtra = [{ ...catalogo[3], curriculos: [{ ...catalogo[3].curriculos[0], disciplinas: [] }] }];
      expect(Object.keys(buscarOfertas(comExtra, filtro("12"))[0].curriculos[0])).not.toContain("disciplinas");
   });
});
