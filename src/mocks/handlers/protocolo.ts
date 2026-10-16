/** Novo protocolo e lookup de pessoa por CPF (contrato: `POST /casos`, `GET /pessoas/lookup`). */
import { http } from "msw";

import { ROTULO_TIPO_COMPLETO, type Tipo } from "@/features/casos";
import type { NovoProtocolo } from "@/features/protocolo";

import { gerarToken } from "@/mocks/db/acompanhamento";
import { aplicarTransicao, montarDetalhe, montarResumo } from "@/mocks/db/casos";
import { valoresDoCaso } from "@/mocks/db/comunicacao";
import { db } from "@/mocks/db/estado";
import { registrarEvento } from "@/mocks/db/repositorio";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { API, erro, ok } from "@/mocks/lib/http";
import { criarPrng, hash } from "@/mocks/lib/prng";
import { preparar } from "@/mocks/handlers/comum";
import { cursoPorId } from "@/mocks/seed/cursos";
import { gerarCelular, gerarCpf, gerarEmail, gerarNome, gerarRa } from "@/mocks/seed/pessoas";

const FINAIS = ["MATRICULADO", "PERDIDO", "CANCELADO"];

/** Protocolo é um número sequencial (ex.: 85560): o próximo depois do maior já emitido. */
function proximoProtocolo(): string {
   let maior = 85000;
   for (const c of db.casos.values()) maior = Math.max(maior, Number(c.protocolo) || 0);
   return String(maior + 1);
}

/** Pessoas fictícias fora da fila, para testar a detecção de vínculo no protocolo. */
function pessoasAvulsas() {
   const ex = criarPrng("pessoa-ex-aluno");
   const ativo = criarPrng("pessoa-aluno-ativo");
   const nomeEx = gerarNome(ex);
   const nomeAtivo = gerarNome(ativo);
   return [
      {
         cpf: gerarCpf(ex),
         nome: nomeEx,
         celular: gerarCelular(ex),
         email: gerarEmail(nomeEx, ex),
         ra: gerarRa(ex),
         vinculo: "EX_ALUNO" as const,
         tipo: "RETORNO" as const,
      },
      {
         cpf: gerarCpf(ativo),
         nome: nomeAtivo,
         celular: gerarCelular(ativo),
         email: gerarEmail(nomeAtivo, ativo),
         ra: gerarRa(ativo),
         vinculo: "ALUNO_ATIVO" as const,
         tipo: "TRANSFERENCIA_INTERNA" as const,
      },
   ];
}

export const handlersProtocolo = [
   // Extensão do contrato (docs/09 §5, "Vestibular"): dados do vestibular da pessoa.
   http.get(`${API}/pessoas/:pessoaId/vestibular`, async ({ params }) => {
      await preparar();
      const caso = [...db.casos.values()].find(c => c.candidato.pessoaId === params.pessoaId);
      return ok(caso?.dadosVestibular ?? null);
   }),

   http.get(`${API}/pessoas/lookup`, async ({ request }) => {
      await preparar();
      const cpf = (new URL(request.url).searchParams.get("cpf") ?? "").replace(/\D/g, "");
      if (cpf.length !== 11) return erro(422, "VALIDACAO", "Informe os 11 dígitos do CPF", { detalhes: ["Informe os 11 dígitos do CPF"] });
      const casos = [...db.casos.values()].filter(c => c.candidato.cpf === cpf);
      const avulsa = pessoasAvulsas().find(p => p.cpf === cpf);
      if (casos.length === 0 && !avulsa) {
         return ok({ encontrada: false, pessoa: null, vinculo: "NENHUM", tipoSugerido: null, casosAtivos: [], dadosVestibular: null });
      }
      const base = casos[0];
      const vinculo =
         avulsa?.vinculo ??
         (casos.some(c => c.etapa === "MATRICULADO" || c.tipo === "TRANSFERENCIA_INTERNA")
            ? "ALUNO_ATIVO"
            : casos.some(c => c.tipo === "RETORNO")
              ? "EX_ALUNO"
              : "NENHUM");
      const tipoSugerido: Tipo | null = vinculo === "ALUNO_ATIVO" ? "TRANSFERENCIA_INTERNA" : vinculo === "EX_ALUNO" ? "RETORNO" : null;
      return ok({
         encontrada: true,
         pessoa: base
            ? {
                 pessoaId: base.candidato.pessoaId,
                 nome: base.candidato.nome,
                 celular: base.candidato.celular,
                 email: base.candidato.email,
                 ra: base.candidato.ra,
              }
            : {
                 pessoaId: `p-${hash(cpf)}`,
                 nome: avulsa?.nome ?? "",
                 celular: avulsa?.celular ?? null,
                 email: avulsa?.email ?? null,
                 ra: avulsa?.ra ?? null,
              },
         vinculo,
         tipoSugerido,
         casosAtivos: casos.filter(c => !FINAIS.includes(c.etapa)).map(montarResumo),
         dadosVestibular: base?.dadosVestibular ?? null,
      });
   }),

   http.post(`${API}/casos`, async ({ request }) => {
      const ctx = await preparar();
      const np = (await request.json()) as NovoProtocolo;
      const existente = [...db.casos.values()].find(c => c.candidato.cpf === np.cpf);
      const curso = cursoPorId(np.destino.cursoId);
      const t = ctx.agora.toISOString();
      const n = db.casos.size + 1;
      const r = criarPrng(`novo-${np.cpf}-${t}`);
      const caso: CasoRegistro = {
         id: `c-n${n.toString(36)}${hash(t).toString(36).slice(0, 3)}`,
         protocolo: proximoProtocolo(),
         tipo: np.tipo,
         subtipo: np.subtipo,
         etapa: "RASCUNHO",
         etapaAnterior: null,
         etapaDesde: t,
         criadoEm: t,
         atualizadoEm: t,
         versao: 1,
         matriculado: existente?.matriculado ?? false,
         ultimoAutorId: ctx.usuario.id,
         candidato: {
            pessoaId: existente?.candidato.pessoaId ?? `p-${hash(np.cpf).toString(36)}`,
            nome: np.nome.trim(),
            ra: existente?.candidato.ra ?? null,
            outroRa: null,
            cpf: np.cpf,
            celular: np.celular.replace(/\D/g, ""),
            email: np.email || null,
            optInWhatsapp: np.optInWhatsapp,
         },
         destino: { ...np.destino, matrizId: `${curso.id}-20262` },
         origem: { iesNome: np.origem.iesNome, cursoNome: np.origem.cursoNome, estudouForaNoPeriodo: np.estudouForaNoPeriodo },
         ingresso: { ano: 2027, semestre: 1 },
         responsaveis: {
            consultorId: ctx.usuario.papeis.includes("CONSULTOR") ? ctx.usuario.id : null,
            analistaId: null,
            coordenadorId: curso.coordenadorId,
            matriculaId: null,
         },
         sla: { venceEm: null, alertaEm: null },
         pendencia: null,
         retomarEm: null,
         flags: { ouvidoria: false, escalado: false, preAnaliseFalhou: false },
         reanalises: 0,
         jornada: [{ etapa: "RASCUNHO", entrouEm: t, saiuEm: null, porId: ctx.usuario.id }],
         resumoCongeladoEm: null,
         resumoCongelado: null,
         noGed: false,
         preAnalise: {
            status: "PENDENTE",
            iniciadaEm: null,
            concluidaEm: null,
            modelo: null,
            cobertura: { sugeridos: 0, total: 0 },
            avisos: [],
            erro: null,
         },
         proposta: { financeiro: null, pendenciaFinanceiraAnterior: null, resposta: null, aceite: null, enviadaEm: null },
         motivoEncerramento: null,
         dadosVestibular: null,
         semente: r.int(1, 2 ** 31 - 1),
         roteiro: null,
         teste: false,
      };
      // O link do aluno nasce com o protocolo.
      caso.tokenAcompanhamento = gerarToken(`${caso.id}|${t}|${np.cpf}`);
      // Quem não é consultor também abre protocolo; o caso fica com ele no acompanhamento de documentos.
      caso.responsaveis.consultorId ??= ctx.usuario.id;
      db.casos.set(caso.id, caso);
      registrarEvento(
         caso,
         {
            tipo: "caso.criado",
            categoria: "SISTEMA",
            autor: { tipo: "PESSOA", id: ctx.usuario.id, nome: ctx.usuario.nome },
            titulo: "Protocolo aberto",
            detalhe: `${ROTULO_TIPO_COMPLETO[np.tipo]} · ${curso.nome}`,
            visivelAoCandidato: false,
            statusEntrega: null,
         },
         () => valoresDoCaso(caso),
      );
      if (np.enviar) {
         try {
            aplicarTransicao(caso, { acao: "ENVIAR_PROTOCOLO" }, ctx.usuario, ctx.agora);
         } catch (e) {
            db.casos.delete(caso.id);
            const motivos = (e as { motivos?: string[] }).motivos ?? ["Não foi possível enviar o protocolo"];
            return erro(
               motivos.some(m => m.includes("ativo")) ? 409 : 422,
               motivos.some(m => m.includes("ativo")) ? "DUPLICADO" : "TRANSICAO_RECUSADA",
               motivos[0],
               { detalhes: motivos },
            );
         }
      }
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora), 201);
   }),
];
