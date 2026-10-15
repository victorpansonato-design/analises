/** Regressões da reformulação: identidade por protocolo, matrícula do aluno e filas comuns. */
import { beforeEach, describe, expect, it } from "vitest";
import { FILAS, PROCESSOS, etapasDaFila, type FiltrosFila } from "@/features/casos";
import { PAPEIS, usePapelSimuladoStore } from "@/features/sessao";
import { acoesPara, aplicarTransicao, filtrarFila, montarResumo, montarFunil, usuarioAtual } from "@/mocks/db/casos";
import { iniciarDb } from "@/mocks/db/iniciar";
import { db } from "@/mocks/db/estado";

const AGORA = new Date("2026-10-13T13:00:00Z");
const FILTROS: FiltrosFila = {
   visao: "TODOS",
   processo: null,
   etapa: null,
   tipo: null,
   curso: null,
   turno: null,
   modalidade: null,
   responsavel: null,
   somenteAtrasados: false,
   comPendencia: false,
   ouvidoria: false,
   incluirEncerrados: true,
   ciclo: null,
   q: "",
   ordem: "PRIORIDADE",
};
beforeEach(() => iniciarDb(AGORA));

describe("filas operacionais", () => {
   it("cada contagem corresponde à lista e todos os protocolos entram em Todas", () => {
      const funil = montarFunil(null, AGORA);
      for (const fila of FILAS) {
         const etapas = etapasDaFila(fila.id === "TODAS" ? null : fila.id);
         const total = funil.etapas.filter(e => fila.id === "TODAS" || etapas.includes(e.etapa)).reduce((n, e) => n + e.total, 0);
         expect(filtrarFila({ ...FILTROS, etapa: fila.id === "TODAS" ? null : fila.id }, usuarioAtual(), AGORA)).toHaveLength(total);
      }
   });
   it("buscar RA encontra dois protocolos do mesmo aluno sem agrupar ou limitar à etapa", () => {
      const lista = filtrarFila({ ...FILTROS, q: "202600842", etapa: "LIBERADAS" }, usuarioAtual(), AGORA);
      expect(lista.map(c => c.id).sort()).toEqual(["c-demo-analise", "c-demo-coordenacao"]);
      expect(new Set(lista.map(c => c.protocolo)).size).toBe(2);
      expect(new Set(lista.map(c => c.candidato.pessoaId)).size).toBe(1);
   });
   it("curso escrito sem acento e modalidade compõem o filtro", () => {
      const lista = filtrarFila({ ...FILTROS, curso: "administracao", modalidade: "PRESENCIAL", turno: "DIURNO" }, usuarioAtual(), AGORA);
      expect(lista.length).toBeGreaterThan(0);
      expect(lista.every(c => c.destino.cursoId === "adm" && c.destino.modalidade === "PRESENCIAL" && c.destino.turno !== "NOTURNO")).toBe(
         true,
      );
   });
   it("MAT não depende de a análise estar concluída", () => {
      const caso = db.casos.get("c-demo-analise")!;
      expect(caso.etapa).toBe("EM_ANALISE");
      expect(montarResumo(caso).matriculado).toBe(true);
   });
   it("a data de liberação usa a última liberação e inclusão mantém sua data própria", () => {
      const caso = db.casos.get("c-demo-analise")!;
      expect(montarResumo(caso).liberadoMatriculaEm).toBeNull();
      caso.jornada.push({ etapa: "PRONTO_PARA_MATRICULA", entrouEm: "2026-10-10T12:00:00Z", saiuEm: null, porId: null });
      caso.jornada.push({ etapa: "PRONTO_PARA_MATRICULA", entrouEm: "2026-10-12T12:00:00Z", saiuEm: null, porId: null });
      expect(montarResumo(caso)).toMatchObject({ criadoEm: caso.criadoEm, liberadoMatriculaEm: "2026-10-12T12:00:00Z" });
   });
   it.each(PAPEIS)("%s acessa análise e coordenação com as mesmas validações", papel => {
      usePapelSimuladoStore.setState({ papel });
      const analise = acoesPara(db.casos.get("c-demo-analise")!, usuarioAtual(), AGORA);
      expect(analise.find(a => a.acao === "DECIDIR_ITEM")?.habilitada).toBe(true);
      expect(analise.find(a => a.acao === "CONCLUIR_ANALISE")).toMatchObject({ habilitada: false });
      expect(
         acoesPara(db.casos.get("c-demo-coordenacao")!, usuarioAtual(), AGORA).find(a => a.acao === "RESPONDER_ITEM_COORDENACAO")
            ?.habilitada,
      ).toBe(true);
   });
   it("matricular atualiza o vínculo nos protocolos do aluno sem mudar a etapa dos demais", () => {
      const c = db.casos.get("c-demo-negociacao")!;
      const outro = db.casos.get("c-demo-analise")!;
      outro.candidato = { ...c.candidato };
      outro.matriculado = false;
      const versao = outro.versao;
      c.matriculado = false;
      aplicarTransicao(c, { acao: "EFETIVAR_MATRICULA", aceite: { canal: "WHATSAPP", em: AGORA.toISOString() } }, usuarioAtual(), AGORA);
      expect(c.matriculado).toBe(true);
      expect(outro.matriculado).toBe(true);
      expect(outro.etapa).toBe("EM_ANALISE");
      expect(outro.candidato.ra).toBe(c.candidato.ra);
      expect(outro.versao).toBe(versao + 1);
   });
});

describe("processos (ingresso, interna e aproveitamento)", () => {
   it("a contagem de cada processo bate com a fila dele e as três somam o total", () => {
      const funil = montarFunil(null, AGORA);
      const processos = funil.processos ?? [];
      expect(processos.map(p => p.processo)).toEqual(PROCESSOS.map(p => p.id));
      for (const p of processos) {
         expect(filtrarFila({ ...FILTROS, processo: p.processo }, usuarioAtual(), AGORA)).toHaveLength(p.total);
         const doProcesso = montarFunil(null, AGORA, p.processo);
         expect(doProcesso.etapas.reduce((n, e) => n + e.total, 0)).toBe(p.total);
      }
      expect(processos.reduce((n, p) => n + p.total, 0)).toBe(funil.etapas.reduce((n, e) => n + e.total, 0));
   });

   it("aproveitamento só traz aproveitamento, nunca em etapa de matrícula", () => {
      const lista = filtrarFila({ ...FILTROS, processo: "APROVEITAMENTO" }, usuarioAtual(), AGORA);
      expect(lista.length).toBeGreaterThan(0);
      expect(new Set(lista.map(c => c.tipo))).toEqual(new Set(["APROVEITAMENTO_ESTUDOS"]));
      expect(lista.some(c => ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "MATRICULADO"].includes(c.etapa))).toBe(false);
      expect(lista.some(c => c.etapa === "CONCLUIDO")).toBe(true);
   });

   it("ingresso junta externa, portador e retorno", () => {
      const tipos = new Set(filtrarFila({ ...FILTROS, processo: "INGRESSO" }, usuarioAtual(), AGORA).map(c => c.tipo));
      expect(tipos).toEqual(new Set(["TRANSFERENCIA_EXTERNA", "PORTADOR_DIPLOMA", "RETORNO"]));
   });
});
