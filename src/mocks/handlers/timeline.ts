/**
 * Handlers simulados: linha do tempo e notas internas (contrato: tag Linha do tempo). Filtro, ordem
 * e paginação vêm das mesmas funções puras da interface; nota com @menção notifica cada mencionado.
 */
import { http } from "msw";

import { filtrarEventos, lerFiltro, ordenarRecentesPrimeiro, paginarEventos, type NovaNota } from "@/features/timeline";

import { valoresDoCaso } from "@/mocks/db/comunicacao";
import { eventosDoCaso, notificar, registrarEvento } from "@/mocks/db/repositorio";
import { API, erro, ok } from "@/mocks/lib/http";
import { usuarioPorId } from "@/mocks/seed/usuarios";
import { casoOu404, preparar, proibidoSeNaoPuder } from "@/mocks/handlers/comum";

const NOTA_MAX = 2000;

function invalido(mensagem: string) {
   return erro(422, "VALIDACAO", mensagem, { detalhes: [mensagem] });
}

function resumir(texto: string, max = 120): string {
   const t = texto.replace(/\s+/g, " ").trim();
   return t.length > max ? `${t.slice(0, max - 1)}…` : t;
}

export const handlersTimeline = [
   http.get(`${API}/casos/:casoId/timeline`, async ({ params, request }) => {
      await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const url = new URL(request.url);
      const filtro = lerFiltro(url.searchParams.get("filtro"));
      const eventos = eventosDoCaso(caso, () => valoresDoCaso(caso));
      return ok(paginarEventos(ordenarRecentesPrimeiro(filtrarEventos(eventos, filtro)), url.searchParams.get("cursor")));
   }),

   http.post(`${API}/casos/:casoId/notas`, async ({ params, request }) => {
      const ctx = await preparar();
      const caso = casoOu404(params.casoId);
      if (caso instanceof Response) return caso;
      const b = proibidoSeNaoPuder(caso, ctx, "ADICIONAR_NOTA");
      if (b) return b;
      const corpo = (await request.json()) as Partial<NovaNota>;
      const texto = typeof corpo.texto === "string" ? corpo.texto.trim() : "";
      if (!texto) return invalido("Escreva a nota antes de salvar");
      if (texto.length > NOTA_MAX) return invalido("Use no máximo 2.000 caracteres");
      // Só menciona quem existe; quem escreveu não se notifica.
      const mencoes = [...new Set(Array.isArray(corpo.mencoes) ? corpo.mencoes : [])].filter(
         id => typeof id === "string" && !!usuarioPorId(id),
      );

      const evento = registrarEvento(
         caso,
         {
            tipo: "nota.adicionada",
            categoria: "NOTA",
            em: ctx.agora.toISOString(),
            autor: { tipo: "PESSOA", id: ctx.usuario.id, nome: ctx.usuario.nome },
            titulo: "Nota interna",
            detalhe: texto,
            visivelAoCandidato: false,
            statusEntrega: null,
            dados: { mencoes },
         },
         () => valoresDoCaso(caso),
      );
      for (const id of mencoes) {
         if (id === ctx.usuario.id) continue;
         notificar(id, {
            tipo: "MENCAO",
            casoId: caso.id,
            titulo: `${ctx.usuario.nome} mencionou você numa nota`,
            detalhe: `${caso.candidato.nome}: ${resumir(texto)}`,
         });
      }
      return ok(evento, 201);
   }),
];
