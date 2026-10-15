/**
 * Acesso aos dados de um caso. Análise, documentos e histórico são gerados na primeira leitura (a
 * partir da semente do caso) e depois mudam só pelas ações de quem usa.
 */
import { IA } from "@/features/casos";
import type { EventoTimeline } from "@/features/timeline";
import type { ItemChecklist } from "@/features/documentos";
import type { Notificacao } from "@/features/notificacoes";

import { db, novoId } from "@/mocks/db/estado";
import { calcularResumo, gerarAnalise } from "@/mocks/db/analise";
import { gerarChecklist } from "@/mocks/db/documentos";
import { gerarEventosBase } from "@/mocks/db/timeline";
import type { AnaliseRegistro, CasoRegistro } from "@/mocks/db/tipos";

const SEM_ANALISE = new Set(["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "PRE_ANALISE"]);

export function casoPorId(id: string): CasoRegistro | null {
   return db.casos.get(id) ?? null;
}

/** Análise do caso; `null` enquanto a pré-análise não terminou. */
export function analiseDoCaso(caso: CasoRegistro): AnaliseRegistro | null {
   const existente = db.analises.get(caso.id);
   if (existente) return existente;
   const passouDaAnalise = caso.jornada.some(p => p.etapa === "EM_ANALISE");
   if (SEM_ANALISE.has(caso.etapa) && !passouDaAnalise) return null;
   if ((caso.etapa === "CANCELADO" || caso.etapa === "PERDIDO") && !passouDaAnalise) return null;
   const nova = gerarAnalise(caso, caso.destino.matrizId ?? `${caso.destino.cursoId}-20262`, new Date(caso.etapaDesde));
   db.analises.set(caso.id, nova);
   if (caso.resumoCongeladoEm && !caso.resumoCongelado) caso.resumoCongelado = calcularResumo(nova);
   caso.preAnalise.cobertura = { sugeridos: nova.itens.filter(i => i.sugestao).length, total: nova.itens.length };
   if (nova.origem.some(o => (o.confiancaExtracao ?? 1) < IA.conferirExtracaoAbaixo))
      caso.preAnalise.avisos = ["Parte do histórico com baixa legibilidade: confira CH e notas destacadas."];
   return nova;
}

export function documentosDoCaso(caso: CasoRegistro): ItemChecklist[] {
   const existente = db.documentos.get(caso.id);
   if (existente) return existente;
   const novos = gerarChecklist(caso, db.iniciadoEm);
   db.documentos.set(caso.id, novos);
   return novos;
}

export function eventosDoCaso(caso: CasoRegistro, valores: () => Record<string, string | null>): EventoTimeline[] {
   const existente = db.eventos.get(caso.id);
   if (existente) return existente;
   const base = gerarEventosBase(caso, valores()).map((e, i) => ({ ...e, id: `${caso.id}-e${i + 1}` }));
   db.eventos.set(caso.id, base);
   return base;
}

/** Grava um evento de domínio na linha do tempo do caso. */
export function registrarEvento(
   caso: CasoRegistro,
   evento: Omit<EventoTimeline, "id" | "em"> & { em?: string },
   valores: () => Record<string, string | null>,
): EventoTimeline {
   const lista = eventosDoCaso(caso, valores);
   const novo: EventoTimeline = { ...evento, id: novoId("ev"), em: evento.em ?? new Date().toISOString() };
   lista.push(novo);
   return novo;
}

/** Notificação in-app para um usuário (o sino). */
export function notificar(usuarioId: string | null, n: Omit<Notificacao, "id" | "em" | "lida">): void {
   if (!usuarioId) return;
   const lista = db.notificacoes.get(usuarioId) ?? [];
   lista.unshift({ ...n, id: novoId("nt"), em: new Date().toISOString(), lida: false });
   db.notificacoes.set(usuarioId, lista);
}
