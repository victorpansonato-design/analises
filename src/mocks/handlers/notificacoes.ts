/**
 * Handlers simulados: notificações (sino), telemetria de UI e eventos.
 *
 * - As notificações de prazo (SLA em atenção/estourado) nascem NA LEITURA, de forma idempotente:
 *   o id é derivado do caso, do tipo e da passagem pela etapa, então o polling de 30 s nunca duplica
 *   o aviso e um caso que volta a atrasar numa etapa nova avisa de novo.
 * - `/eventos/stream` (SSE) não existe nos mocks: o front usa polling (contrato, tag Eventos).
 * - Telemetria só registra no console, sem dado pessoal (docs/10 §6).
 */
import { http } from "msw";

import { ROTULO_ETAPA, lerSla } from "@/features/casos";
import type { Notificacao } from "@/features/notificacoes";

import { montarResumo, responsavelId, usuarioAtual } from "@/mocks/db/casos";
import { db } from "@/mocks/db/estado";
import type { CasoRegistro } from "@/mocks/db/tipos";
import { API, erro, ok, vazio } from "@/mocks/lib/http";
import { hash } from "@/mocks/lib/prng";
import { preparar } from "@/mocks/handlers/comum";

/** Id estável do aviso de prazo: um por caso, tipo e passagem pela etapa. */
export function idNotificacaoSla(caso: Pick<CasoRegistro, "id" | "etapa" | "etapaDesde">, tipo: "SLA_ATENCAO" | "SLA_ESTOURADO"): string {
   return `nt-sla-${tipo === "SLA_ATENCAO" ? "a" : "e"}-${caso.id}-${hash(`${caso.etapa}|${caso.etapaDesde}`).toString(36)}`;
}

/**
 * Avisos de prazo que faltam para o usuário (só os NOVOS; quem chama acrescenta à lista).
 * Considera os casos em que ele é o responsável da etapa e cujo prazo cruzou o limiar agora.
 */
export function notificacoesDeSla(
   casos: Iterable<CasoRegistro>,
   usuarioId: string,
   existentes: readonly Notificacao[],
   agora: Date,
): Notificacao[] {
   const ids = new Set(existentes.map(n => n.id));
   const novas: Notificacao[] = [];
   for (const caso of casos) {
      if (caso.teste || responsavelId(caso) !== usuarioId) continue;
      const sla = montarResumo(caso).sla;
      const leitura = lerSla(sla, agora);
      if (leitura.estado !== "ATENCAO" && leitura.estado !== "ESTOURADO") continue;
      const tipo = leitura.estado === "ESTOURADO" ? "SLA_ESTOURADO" : "SLA_ATENCAO";
      const id = idNotificacaoSla(caso, tipo);
      if (ids.has(id)) continue;
      ids.add(id);
      const etapa = ROTULO_ETAPA[caso.etapa];
      novas.push({
         id,
         tipo,
         casoId: caso.id,
         titulo: tipo === "SLA_ESTOURADO" ? `Prazo estourado em ${etapa}` : `Prazo de ${etapa} perto do fim`,
         detalhe: `${caso.candidato.nome} · ${caso.destino.cursoNome}`,
         // O aviso "aconteceu" quando o limiar foi cruzado, não quando o sino perguntou.
         em: (tipo === "SLA_ESTOURADO" ? sla.venceEm : sla.alertaEm) ?? agora.toISOString(),
         lida: false,
      });
   }
   return novas;
}

const ordenar = (lista: Notificacao[]) => lista.sort((a, b) => Date.parse(b.em) - Date.parse(a.em));

/** Campos que nunca entram na telemetria, mesmo se a tela mandar por engano. */
const CAMPOS_PESSOAIS = /nome|cpf|email|e-mail|celular|telefone|ra$|^ra|protocolo/i;

interface EventoTelemetria {
   nome?: unknown;
   em?: unknown;
   dados?: Record<string, unknown>;
}

export const handlersNotificacoes = [
   http.get(`${API}/notificacoes`, async () => {
      const ctx = await preparar();
      const lista = db.notificacoes.get(ctx.usuario.id) ?? [];
      const novas = notificacoesDeSla(db.casos.values(), ctx.usuario.id, lista, ctx.agora);
      const atual = ordenar([...novas, ...lista]);
      db.notificacoes.set(ctx.usuario.id, atual);
      return ok(atual);
   }),

   http.post(`${API}/notificacoes/:id\\:lida`, async ({ params }) => {
      await preparar();
      const usuario = usuarioAtual();
      const lista = db.notificacoes.get(usuario.id) ?? [];
      const alvo = lista.find(n => n.id === params.id);
      if (!alvo) return erro(404, "NAO_ENCONTRADO", "Notificação não encontrada. Ela pode ter sido removida.");
      alvo.lida = true;
      return vazio();
   }),

   http.post(`${API}/telemetria`, async ({ request }) => {
      const corpo = (await request.json().catch(() => [])) as unknown;
      const eventos = Array.isArray(corpo) ? (corpo as EventoTelemetria[]) : [];
      const limpos = eventos.map(e => ({
         nome: String(e.nome ?? ""),
         em: typeof e.em === "string" ? e.em : null,
         dados: Object.fromEntries(Object.entries(e.dados ?? {}).filter(([k]) => !CAMPOS_PESSOAIS.test(k))),
      }));
      console.debug("[telemetria]", limpos);
      return vazio();
   }),
];
