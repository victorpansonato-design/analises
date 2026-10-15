/**
 * Regras puras da linha do tempo: filtro por categoria, ordem (mais recente primeiro) e paginação
 * por cursor. O backend simulado usa estas mesmas funções, então "Carregar mais" nunca repete nem
 * pula evento.
 */
import type { StatusTone } from "@/components/core/status";

import {
   FILTROS_TIMELINE,
   type CategoriaEvento,
   type EventoTimeline,
   type FiltroTimeline,
   type StatusEntrega,
} from "@/features/timeline/types/timeline.schema";

/** Eventos por página ("Carregar mais"). */
export const TIMELINE_PAGINA = 30;

export const CATEGORIA_DO_FILTRO: Record<FiltroTimeline, CategoriaEvento | null> = {
   TUDO: null,
   NOTAS: "NOTA",
   MENSAGENS: "MENSAGEM",
   SISTEMA: "SISTEMA",
   DECISOES: "DECISAO",
};

/** Valor da URL (`?hist=`) para filtro válido; qualquer outra coisa vira "Tudo". */
export function lerFiltro(valor: string | null | undefined): FiltroTimeline {
   return (FILTROS_TIMELINE as readonly string[]).includes(valor ?? "") ? (valor as FiltroTimeline) : "TUDO";
}

export function filtrarEventos<T extends Pick<EventoTimeline, "categoria">>(eventos: readonly T[], filtro: FiltroTimeline): T[] {
   const categoria = CATEGORIA_DO_FILTRO[filtro];
   return categoria ? eventos.filter(e => e.categoria === categoria) : [...eventos];
}

/** Mais recente primeiro; no mesmo instante, o registrado por último vem antes (ordem estável). */
export function ordenarRecentesPrimeiro<T extends Pick<EventoTimeline, "em">>(eventos: readonly T[]): T[] {
   return eventos
      .map((e, i) => ({ e, i, t: Date.parse(e.em) }))
      .sort((a, b) => b.t - a.t || b.i - a.i)
      .map(x => x.e);
}

/** Página a partir do cursor (posição na lista já filtrada e ordenada). */
export function paginarEventos<T>(
   eventos: readonly T[],
   cursor: string | null | undefined,
   tamanho = TIMELINE_PAGINA,
): { itens: T[]; proximoCursor: string | null } {
   const inicio = Math.max(0, Number(cursor ?? 0) || 0);
   const fim = inicio + tamanho;
   return { itens: eventos.slice(inicio, fim), proximoCursor: fim < eventos.length ? String(fim) : null };
}

/** Mensagem trocada com o candidato pelo WhatsApp (entrada ou saída): vira bolha. */
export function ehMensagemWhatsapp(e: Pick<EventoTimeline, "categoria" | "visivelAoCandidato" | "detalhe">): boolean {
   return e.categoria === "MENSAGEM" && e.visivelAoCandidato && !!e.detalhe;
}

export function direcaoMensagem(e: Pick<EventoTimeline, "autor">): "ENTRADA" | "SAIDA" {
   return e.autor.tipo === "CANDIDATO" ? "ENTRADA" : "SAIDA";
}

/** Botões de resposta rápida gravados com a mensagem enviada. */
export function botoesDoEvento(e: Pick<EventoTimeline, "dados">): string[] {
   const b = e.dados?.botoes;
   return Array.isArray(b) ? b.filter((x): x is string => typeof x === "string") : [];
}

export const TOM_STATUS_ENTREGA: Record<StatusEntrega, StatusTone> = {
   ENFILEIRADA: "info",
   ENVIADA: "neutral",
   ENTREGUE: "ok",
   LIDA: "ok",
   FALHOU: "crit",
};

/** Quem fez: uma pessoa, o sistema, a IA ou o próprio candidato. */
export function rotuloAutor(autor: EventoTimeline["autor"]): string {
   switch (autor.tipo) {
      case "PESSOA":
         return autor.nome ?? "Equipe";
      case "SISTEMA":
         return "Sistema";
      case "IA":
         return `${autor.nome ?? "IA"} (sugestão automática)`;
      case "CANDIDATO":
         return autor.nome ? `${autor.nome} (candidato)` : "Candidato";
   }
}
