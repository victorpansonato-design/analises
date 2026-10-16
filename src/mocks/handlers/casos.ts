/** Fila, funil, detalhe, transições, atribuição, flags e dados sensíveis (contrato: tag Casos). */
import { http } from "msw";

import {
   ErroTransicao,
   ETAPAS_PEGAR_PROXIMO,
   ROTULO_PENDENCIA,
   VisaoSchema,
   OrdemSchema,
   proximoCaso,
   type EdicaoCaso,
   type EntradaTransicao,
   type FlagsEntrada,
} from "@/features/casos";

import {
   aplicarTransicao,
   atribuir,
   contarAtrasados,
   enviarTemplate,
   filtrarFila,
   montarDetalhe,
   montarFunil,
   montarResumo,
   type ParametrosFila,
} from "@/mocks/db/casos";
import { espelharAcompanhamento } from "@/mocks/db/acompanhamento";
import { valoresDoCaso } from "@/mocks/db/comunicacao";
import { db } from "@/mocks/db/estado";
import { documentosDoCaso, registrarEvento } from "@/mocks/db/repositorio";
import { API, erro, ok, vazio } from "@/mocks/lib/http";
import { casoOu404, conflitoDeVersao, preparar, proibidoSeNaoPuder, tocar } from "@/mocks/handlers/comum";

function lerFila(url: URL): ParametrosFila & { cursor: number; limite: number } {
   const p = url.searchParams;
   const flag = (k: string) => p.get(k) === "true";
   return {
      visao: VisaoSchema.catch("TODOS").parse(p.get("visao") ?? undefined),
      processo: p.get("processo"),
      etapa: p.get("etapa"),
      tipo: p.get("tipo"),
      curso: p.get("curso"),
      turno: p.get("turno"),
      modalidade: p.get("modalidade"),
      responsavel: p.get("responsavel"),
      somenteAtrasados: flag("somenteAtrasados"),
      comPendencia: flag("comPendencia"),
      ouvidoria: flag("ouvidoria"),
      incluirEncerrados: p.has("incluirEncerrados") ? flag("incluirEncerrados") : !p.get("etapa") || p.get("etapa") === "CONCLUIDAS",
      ciclo: p.get("ciclo"),
      q: p.get("q"),
      ordem: OrdemSchema.catch("PRIORIDADE").parse(p.get("ordem") ?? undefined),
      cursor: Number(p.get("cursor") ?? 0) || 0,
      limite: Math.min(200, Number(p.get("limite") ?? 50) || 50),
   };
}

const valores = (id: string) => () => {
   const c = db.casos.get(id);
   return c ? valoresDoCaso(c) : {};
};

export const handlersCasos = [
   http.get(`${API}/casos`, async ({ request }) => {
      const ctx = await preparar();
      const f = lerFila(new URL(request.url));
      const todos = filtrarFila(f, ctx.usuario, ctx.agora);
      const pagina = todos.slice(f.cursor, f.cursor + f.limite);
      const proximo = f.cursor + f.limite < todos.length ? String(f.cursor + f.limite) : null;
      return ok({
         itens: pagina.map(montarResumo),
         total: todos.length,
         atrasados: contarAtrasados(todos, ctx.agora),
         proximoCursor: proximo,
      });
   }),

   http.get(`${API}/casos/funil`, async ({ request }) => {
      const ctx = await preparar();
      const p = new URL(request.url).searchParams;
      return ok(montarFunil(p.get("ciclo"), ctx.agora, p.get("processo")));
   }),

   http.post(`${API}/casos/proximo`, async () => {
      const ctx = await preparar();
      const etapas = [...new Set(ctx.usuario.papeis.flatMap(p => ETAPAS_PEGAR_PROXIMO[p] ?? []))];
      if (etapas.length === 0) return erro(403, "PROIBIDO", "Seu perfil não usa o Pegar próximo");
      const proximo = proximoCaso([...db.casos.values()].map(montarResumo), etapas, ctx.agora);
      if (!proximo) return vazio();
      const caso = db.casos.get(proximo.id);
      if (!caso) return vazio();
      atribuir(caso, ctx.usuario.id, ctx.usuario, ctx.agora);
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.get(`${API}/casos/:casoId`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      espelharAcompanhamento(caso);
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.patch(`${API}/casos/:casoId`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const bloqueio = conflitoDeVersao(request, caso) ?? proibidoSeNaoPuder(caso, ctx, "EDITAR_DADOS");
      if (bloqueio) return bloqueio;
      const e = (await request.json()) as EdicaoCaso;
      const alterados: string[] = [];
      if (e.nome !== undefined) {
         caso.candidato.nome = e.nome.trim();
         alterados.push("nome");
      }
      if (e.celular !== undefined) {
         const d = e.celular.replace(/\D/g, "");
         if (d.length < 10)
            return erro(422, "VALIDACAO", "Celular inválido. Informe com DDD.", { detalhes: ["Celular inválido. Informe com DDD."] });
         caso.candidato.celular = d;
         alterados.push("celular");
      }
      if (e.email !== undefined) {
         caso.candidato.email = e.email || null;
         alterados.push("e-mail");
      }
      if (e.optInWhatsapp !== undefined) {
         caso.candidato.optInWhatsapp = e.optInWhatsapp;
         alterados.push("autorização de WhatsApp");
      }
      if (e.outroRa !== undefined) {
         caso.candidato.outroRa = e.outroRa || null;
         alterados.push("outro RA");
      }
      if (e.origem) {
         caso.origem = {
            ...caso.origem,
            iesNome: e.origem.iesNome ?? caso.origem.iesNome,
            cursoNome: e.origem.cursoNome ?? caso.origem.cursoNome,
         };
         alterados.push("origem");
      }
      if (e.ingresso) {
         caso.ingresso = { ano: e.ingresso.ano ?? caso.ingresso.ano, semestre: e.ingresso.semestre ?? caso.ingresso.semestre };
         alterados.push("ingresso");
      }
      tocar(caso, ctx.usuario, ctx.agora);
      registrarEvento(
         caso,
         {
            tipo: "caso.editado",
            categoria: "SISTEMA",
            autor: { tipo: "PESSOA", id: ctx.usuario.id, nome: ctx.usuario.nome },
            titulo: "Dados do caso alterados",
            detalhe: alterados.join(", ") || null,
            visivelAoCandidato: false,
            statusEntrega: null,
         },
         valores(caso.id),
      );
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.post(`${API}/casos/:casoId/transicoes`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const conflito = conflitoDeVersao(request, caso);
      if (conflito) return conflito;
      const entrada = (await request.json()) as EntradaTransicao;
      try {
         if (entrada.acao === "EFETIVAR_MATRICULA" && entrada.aceite) {
            caso.proposta.aceite = { canal: entrada.aceite.canal, em: entrada.aceite.em, porId: ctx.usuario.id };
         }
         aplicarTransicao(caso, entrada, ctx.usuario, ctx.agora);
      } catch (e) {
         if (entrada.acao === "EFETIVAR_MATRICULA") caso.proposta.aceite = null;
         if (e instanceof ErroTransicao)
            return erro(422, "TRANSICAO_RECUSADA", e.motivos[0] ?? "Ação indisponível", { detalhes: e.motivos });
         throw e;
      }
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.put(`${API}/casos/:casoId/atribuicao`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const conflito = conflitoDeVersao(request, caso);
      if (conflito) return conflito;
      const { usuarioId } = (await request.json()) as { usuarioId: string };
      const assumir = usuarioId === "EU";
      const bloqueio = proibidoSeNaoPuder(caso, ctx, assumir ? "ASSUMIR" : "ATRIBUIR");
      if (bloqueio) return bloqueio;
      atribuir(caso, assumir ? ctx.usuario.id : usuarioId, ctx.usuario, ctx.agora);
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.patch(`${API}/casos/:casoId/flags`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const conflito = conflitoDeVersao(request, caso);
      if (conflito) return conflito;
      const f = (await request.json()) as FlagsEntrada;
      const autor = { tipo: "PESSOA" as const, id: ctx.usuario.id, nome: ctx.usuario.nome };
      const registrar = (titulo: string, detalhe: string | null) =>
         registrarEvento(
            caso,
            { tipo: "caso.flag", categoria: "DECISAO", autor, titulo, detalhe, visivelAoCandidato: false, statusEntrega: null },
            valores(caso.id),
         );
      if (f.ouvidoria !== undefined) {
         const b = proibidoSeNaoPuder(caso, ctx, "MARCAR_OUVIDORIA");
         if (b) return b;
         caso.flags.ouvidoria = f.ouvidoria;
         registrar(f.ouvidoria ? "Marcado como ouvidoria" : "Ouvidoria retirada", f.justificativa ?? null);
      }
      if (f.escalado !== undefined) {
         const b = proibidoSeNaoPuder(caso, ctx, "ESCALAR");
         if (b) return b;
         caso.flags.escalado = f.escalado;
         registrar(f.escalado ? "Caso escalado" : "Escalonamento retirado", f.justificativa ?? null);
      }
      if (f.pendencia !== undefined) {
         const b = proibidoSeNaoPuder(caso, ctx, "REGISTRAR_PENDENCIA");
         if (b) return b;
         if (f.pendencia && Date.parse(f.pendencia.revisarEm) <= ctx.agora.getTime()) {
            return erro(422, "VALIDACAO", "Escolha uma data de revisão no futuro", { detalhes: ["Escolha uma data de revisão no futuro"] });
         }
         caso.pendencia = f.pendencia;
         registrar(
            f.pendencia ? `Pendência externa: ${ROTULO_PENDENCIA[f.pendencia.tipo].toLowerCase()}` : "Pendência externa resolvida",
            f.pendencia?.descricao ?? f.justificativa ?? null,
         );
      }
      tocar(caso, ctx.usuario, ctx.agora);
      return ok(montarDetalhe(caso, ctx.usuario, ctx.agora));
   }),

   http.get(`${API}/casos/:casoId/dados-sensiveis/:campo`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const campo = String(params.campo);
      if (campo === "CPF") {
         const b = proibidoSeNaoPuder(caso, ctx, "REVELAR_CPF");
         if (b) return b;
      } else {
         const b = proibidoSeNaoPuder(caso, ctx, "ENVIAR_MENSAGEM");
         if (b) return b;
      }
      const valor = campo === "CPF" ? caso.candidato.cpf : campo === "CELULAR" ? caso.candidato.celular : (caso.candidato.email ?? "");
      // LGPD: toda revelação gera log de acesso (docs/04 §3, docs/11).
      registrarEvento(
         caso,
         {
            tipo: "dado.revelado",
            categoria: "SISTEMA",
            autor: { tipo: "PESSOA", id: ctx.usuario.id, nome: ctx.usuario.nome },
            titulo: `${campo === "CPF" ? "CPF" : campo === "CELULAR" ? "Celular" : "E-mail"} revelado`,
            detalhe: "Acesso registrado para auditoria.",
            visivelAoCandidato: false,
            statusEntrega: null,
         },
         valores(caso.id),
      );
      return ok({ valor });
   }),

   http.post(`${API}/casos/:casoId/documentos\\:solicitar`, async ({ params }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const b = proibidoSeNaoPuder(caso, ctx, "SOLICITAR_DOCUMENTO");
      if (b) return b;
      const faltam = documentosDoCaso(caso).filter(d => d.obrigatorio && (d.status === "PENDENTE" || d.status === "RECUSADO"));
      if (faltam.length === 0)
         return erro(422, "VALIDACAO", "Não há documento pendente para lembrar", { detalhes: ["Não há documento pendente para lembrar"] });
      if (!caso.candidato.optInWhatsapp)
         return erro(422, "VALIDACAO", "O candidato não autorizou contato pelo WhatsApp", {
            detalhes: ["O candidato não autorizou contato pelo WhatsApp"],
         });
      enviarTemplate(caso, "lembrete_documentos", ctx.usuario.id);
      return ok(null, 202);
   }),
];
