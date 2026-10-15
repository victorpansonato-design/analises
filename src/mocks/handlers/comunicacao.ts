/**
 * Handlers simulados: templates, prévia e envio de mensagens (contrato: tag Comunicação). O backend
 * real fala com o Blip; aqui o envio vira evento na linha do tempo. Bloqueios (etapa, opt-in,
 * variável vazia) usam a mesma regra pura da interface.
 */
import { http } from "msw";

import { motivoBloqueioEnvio, motivoTemplateForaDaEtapa, type TemplateMensagem } from "@/features/comunicacao";

import { enviarTemplate } from "@/mocks/db/casos";
import { valoresDoCaso, valoresEmLinha } from "@/mocks/db/comunicacao";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { API, erro, ok } from "@/mocks/lib/http";
import { TEMPLATES, preencher, templatePorId, type TemplateMock } from "@/mocks/seed/templates";
import type { UsuarioMock } from "@/mocks/seed/usuarios";
import { casoOu404, preparar, proibidoSeNaoPuder } from "@/mocks/handlers/comum";

function invalido(mensagem: string) {
   return erro(422, "VALIDACAO", mensagem, { detalhes: [mensagem] });
}

function doPapel(t: TemplateMock, u: UsuarioMock): boolean {
   return t.papeis.some(p => u.papeis.includes(p));
}

function paraContrato(t: TemplateMock): TemplateMensagem {
   return { id: t.id, nome: t.nome, descricao: t.descricao, variaveis: t.variaveis, etapas: t.etapas };
}

/** Prévia exata: o lembrete de documentos leva a lista numa linha só (`{{2}}` no meio da frase). */
export function montarPrevia(caso: CasoRegistro, t: TemplateMock) {
   const { texto, faltando } = preencher(t, t.id === "lembrete_documentos" ? valoresEmLinha(caso) : valoresDoCaso(caso));
   return { texto, variaveisFaltando: faltando, botoes: t.botoes };
}

async function lerTemplate(request: Request, u: UsuarioMock): Promise<TemplateMock | Response> {
   const corpo = (await request.json().catch(() => ({}))) as { templateId?: unknown };
   const t = typeof corpo.templateId === "string" ? templatePorId(corpo.templateId) : null;
   if (!t) return invalido("Escolha um template aprovado");
   if (!doPapel(t, u))
      return erro(403, "PROIBIDO", "Seu perfil não envia este template", { detalhes: ["Seu perfil não envia este template"] });
   return t;
}

export const handlersComunicacao = [
   http.get(`${API}/comunicacao/templates`, async () => {
      const ctx = await preparar();
      return ok(TEMPLATES.filter(t => doPapel(t, ctx.usuario)).map(paraContrato));
   }),

   http.post(`${API}/casos/:casoId/mensagens/previa`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const t = await lerTemplate(request, ctx.usuario);
      if (t instanceof Response) return t;
      return ok(montarPrevia(caso, t));
   }),

   http.post(`${API}/casos/:casoId/mensagens`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const b = proibidoSeNaoPuder(caso, ctx, "ENVIAR_MENSAGEM");
      if (b) return b;
      const t = await lerTemplate(request, ctx.usuario);
      if (t instanceof Response) return t;
      // Analista só envia mensagens sobre documentos (docs/04): reforço além do escopo da permissão.
      const soAnalista = ctx.usuario.papeis.includes("ANALISTA") && !ctx.usuario.papeis.some(p => p !== "ANALISTA");
      if (soAnalista && !(t.etapas ?? []).includes("AGUARDANDO_DOCUMENTOS")) {
         return erro(403, "PROIBIDO", "Seu perfil só envia mensagens sobre documentos", {
            detalhes: ["Seu perfil só envia mensagens sobre documentos"],
         });
      }
      const previa = montarPrevia(caso, t);
      const motivo = motivoBloqueioEnvio({
         template: t,
         etapa: caso.etapa,
         optInWhatsapp: caso.candidato.optInWhatsapp,
         variaveisFaltando: previa.variaveisFaltando,
      });
      if (motivo) return invalido(motivoTemplateForaDaEtapa(t, caso.etapa) ? `Este template não serve à etapa atual. ${motivo}` : motivo);
      const evento = enviarTemplate(caso, t.id, ctx.usuario.id);
      if (!evento) return invalido("Template não encontrado");
      return ok(evento, 202);
   }),
];
