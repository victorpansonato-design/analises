/**
 * O backend simulado se comporta como o real: semente determinística e fictícia, permissões e
 * máquina aplicadas, efeitos colaterais das transições e a automação do "sistema trabalha".
 */
import { beforeEach, describe, expect, it } from "vitest";

import { cpfValido } from "@/features/protocolo";
import { usePapelSimuladoStore } from "@/features/sessao";

import { contadoresDaAnalise } from "@/mocks/db/analise";
import { acoesPara, aplicarTransicao, filtrarFila, montarDetalhe, montarFunil, tick, usuarioAtual } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import { iniciarDb } from "@/mocks/db/iniciar";
import { analiseDoCaso, documentosDoCaso } from "@/mocks/db/repositorio";
import { semearCasos } from "@/mocks/seed/casos";

const AGORA = new Date("2026-10-09T15:00:00Z");

const fila = {
   etapa: null,
   tipo: null,
   curso: null,
   turno: null,
   modalidade: null,
   responsavel: null,
   somenteAtrasados: false,
   comPendencia: false,
   ouvidoria: false,
   incluirEncerrados: false,
   ciclo: null,
   q: null,
   ordem: "PRIORIDADE" as const,
};

function caso(id: string) {
   const c = db.casos.get(id);
   if (!c) throw new Error(`sem caso ${id}`);
   return c;
}

beforeEach(() => {
   iniciarDb(AGORA);
   usePapelSimuladoStore.setState({ papel: "ANALISTA" });
});

describe("semente", () => {
   it("é determinística e tem os volumes do funil", () => {
      const a = semearCasos(AGORA);
      const b = semearCasos(AGORA);
      expect(a.map(c => c.candidato.nome)).toEqual(b.map(c => c.candidato.nome));
      expect(a.length).toBeGreaterThanOrEqual(300);
      const funil = montarFunil(null, AGORA);
      expect(funil.etapas.find(e => e.etapa === "AGUARDANDO_DOCUMENTOS")?.total).toBeGreaterThan(80);
      expect(funil.etapas.some(e => e.atrasados > 0)).toBe(true);
   });

   it("CPFs são inventados com dígito válido e e-mails em domínio reservado", () => {
      for (const c of db.casos.values()) {
         expect(cpfValido(c.candidato.cpf)).toBe(true);
         if (c.candidato.email) expect(c.candidato.email.endsWith("@example.com")).toBe(true);
      }
   });

   it("roteiro da analista: 45 itens, 32 sugestões de alta confiança", () => {
      const a = analiseDoCaso(caso("c-demo-analise"));
      expect(a?.itens).toHaveLength(45);
      const altas =
         a?.itens.filter(i => i.estado === "SUGERIDO" && (i.sugestao?.confianca === "ALTA" || i.sugestao?.confianca === "REGRA")) ?? [];
      expect(altas).toHaveLength(32);
   });

   it("roteiro da coordenação tem 2 perguntas abertas", () => {
      expect(contadoresDaAnalise(analiseDoCaso(caso("c-demo-coordenacao"))).perguntasAbertas).toBe(2);
   });
});

describe("fila e permissões", () => {
   it("a lista padrão apresenta todos os protocolos abertos a qualquer colaborador", () => {
      const ids = filtrarFila({ ...fila, visao: "TODOS" }, usuarioAtual(), AGORA).map(c => c.id);
      expect(ids).toContain("c-demo-analise");
      expect(ids).toContain("c-demo-coordenacao");
      expect(ids).toContain("c-demo-matricula");
   });

   it("busca por nome ignora acento e etapa", () => {
      const alvo = caso("c-demo-matricula");
      const termo = alvo.candidato.nome
         .split(" ")[0]
         .normalize("NFD")
         .replace(/\p{Diacritic}/gu, "")
         .toUpperCase();
      expect(filtrarFila({ ...fila, visao: "MINHA_VEZ", q: termo }, usuarioAtual(), AGORA).map(c => c.id)).toContain(alvo.id);
   });

   it("ações disponíveis são as mesmas para todos os colaboradores", () => {
      const c = caso("c-demo-matricula");
      expect(acoesPara(c, usuarioAtual(), AGORA).some(a => a.acao === "ENVIAR_PROPOSTA")).toBe(true);
      usePapelSimuladoStore.setState({ papel: "MATRICULA" });
      expect(acoesPara(c, usuarioAtual(), AGORA).find(a => a.acao === "ENVIAR_PROPOSTA")?.habilitada).toBe(true);
   });

   it("detalhe mascara o CPF e o contato para quem não envia mensagem", () => {
      usePapelSimuladoStore.setState({ papel: "DIRETORIA" });
      const d = montarDetalhe(caso("c-demo-analise"), usuarioAtual(), AGORA);
      expect(d.candidato.cpfMascarado).toMatch(/^\*\*\*\.\d{3}\.\d{3}-\*\*$/);
      expect(d.candidato.celular).toMatch(/\(\d{2}\)/);
   });
});

describe("transições e automação", () => {
   it("concluir análise congela o resumo e distribui para a matrícula", () => {
      const c = caso("c-demo-ajuste");
      const a = analiseDoCaso(c);
      if (!a) throw new Error("sem análise");
      for (const i of a.itens) if (i.estado !== "RESPONDIDO") i.estado = "DECIDIDO";
      a.periodoIngresso = 2;
      aplicarTransicao(c, { acao: "CONCLUIR_ANALISE" }, usuarioAtual(), AGORA);
      expect(c.etapa).toBe("PRONTO_PARA_MATRICULA");
      expect(c.resumoCongeladoEm).toBe(AGORA.toISOString());
      expect(c.resumoCongelado?.periodoIngresso).toBe(2);
      expect(c.responsaveis.matriculaId).not.toBeNull();
   });

   it("pré-análise conclui sozinha e entrega só sugestões", () => {
      const c = [...db.casos.values()].find(x => x.etapa === "PRE_ANALISE");
      if (!c) throw new Error("sem caso em pré-análise");
      c.preAnalise.iniciadaEm = new Date(AGORA.getTime() - 60_000).toISOString();
      tick(AGORA);
      expect(c.etapa).toBe("EM_ANALISE");
      expect(analiseDoCaso(c)?.itens.every(i => i.decisao === null)).toBe(true);
   });

   it("adiado retoma na data", () => {
      const c = [...db.casos.values()].find(x => x.etapa === "ADIADO");
      if (!c) throw new Error("sem adiado");
      c.retomarEm = new Date(AGORA.getTime() - 1000).toISOString();
      tick(AGORA);
      expect(c.etapa).not.toBe("ADIADO");
   });

   it("documentos do roteiro do consultor: falta exatamente um obrigatório", () => {
      const docs = documentosDoCaso(caso("c-demo-documentos"));
      expect(docs.filter(d => d.obrigatorio && d.status !== "ACEITO")).toHaveLength(1);
   });
});
