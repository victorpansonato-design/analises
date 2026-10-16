/**
 * Conferência lado a lado (decisão de 15/10/2026): histórico escolar à esquerda, matriz à direita.
 * Puro e testado. Responde duas perguntas da tela:
 *
 * 1. Quais documentos de histórico existem? Um por instituição de origem (aba à esquerda).
 * 2. Ao selecionar uma disciplina da matriz, o que a IA grifa no histórico e com que tom?
 *    - "duvida": a sugestão é de confiança média ou baixa, ou tem alertas: grifo âmbar + nota da IA.
 *    - "correspondencia": decisão ou sugestão confiante com origem: grifo azul, sem alarde.
 *    - "sem-origem": a IA não achou disciplina correspondente: nada a grifar, nota explica.
 * A decisão da pessoa manda: com decisão confirmada, grifa as origens da decisão.
 */
import type { ItemAnalise, ItemOrigem } from "@/features/analise/types/analise.schema";

export interface DocumentoHistorico {
   id: string;
   instituicao: string;
   itens: ItemOrigem[];
   /** Primeiro e último semestre cursado, quando o histórico informa. */
   periodo: { de: string; ate: string } | null;
}

export type TomGrifo = "duvida" | "correspondencia" | "sem-origem";

export interface Grifo {
   origemIds: string[];
   tom: TomGrifo;
   /** O que a IA diz (justificativa e alertas), pronto para a nota ao lado do grifo. */
   nota: string | null;
}

const semestre = (o: ItemOrigem) => (o.ano === null ? null : `${o.ano}/${o.semestre ?? 1}`);
const ordem = (o: ItemOrigem) => (o.ano ?? 9999) * 10 + (o.semestre ?? 1);

/** Um documento por instituição, disciplinas na ordem em que foram cursadas. */
export function documentosDoHistorico(origem: readonly ItemOrigem[], instituicaoPadrao = "Instituição de origem"): DocumentoHistorico[] {
   const porIes = new Map<string, ItemOrigem[]>();
   for (const o of origem) {
      const k = o.ies ?? instituicaoPadrao;
      porIes.set(k, [...(porIes.get(k) ?? []), o]);
   }
   return [...porIes.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .map(([instituicao, itens], i) => {
         const ordenados = [...itens].sort((a, b) => ordem(a) - ordem(b));
         const datas = ordenados.map(semestre).filter((x): x is string => x !== null);
         return {
            id: `doc-${i + 1}`,
            instituicao,
            itens: ordenados,
            periodo: datas.length ? { de: datas[0], ate: datas[datas.length - 1] } : null,
         };
      });
}

function tituloSemestre(chave: string): string {
   const [ano, sem] = chave.split("/");
   return `${sem}º semestre de ${ano}`;
}

/** Agrupa as linhas de um documento por semestre cursado, como no papel. */
export function semestresDoDocumento(doc: DocumentoHistorico): { chave: string; titulo: string; itens: ItemOrigem[] }[] {
   const grupos = new Map<string, ItemOrigem[]>();
   for (const o of doc.itens) {
      const k = semestre(o) ?? "sem-data";
      grupos.set(k, [...(grupos.get(k) ?? []), o]);
   }
   return [...grupos.entries()].map(([chave, itens]) => ({
      chave,
      titulo: chave === "sem-data" ? "Sem semestre informado" : tituloSemestre(chave),
      itens,
   }));
}

/** A IA tem dúvida: confiança média ou baixa, ou algum alerta. Decisão da pessoa encerra a dúvida. */
export function iaEmDuvida(item: ItemAnalise): boolean {
   const s = item.sugestao;
   if (!s || item.decisao) return false;
   return s.confianca === "MEDIA" || s.confianca === "BAIXA" || (s.alertas?.length ?? 0) > 0;
}

export function grifoDoItem(item: ItemAnalise): Grifo {
   const s = item.sugestao;
   const origemIds = item.decisao?.origemIds.length ? item.decisao.origemIds : (s?.origemIds ?? []);
   const nota = s ? [s.justificativa, ...(s.alertas ?? [])].filter(Boolean).join(" · ") || null : null;
   if (origemIds.length === 0) return { origemIds: [], tom: "sem-origem", nota: nota ?? "Nenhuma disciplina correspondente no histórico." };
   return { origemIds, tom: iaEmDuvida(item) ? "duvida" : "correspondencia", nota };
}

/** Documento em que está a primeira origem grifada (a tela troca de aba sozinha). */
export function documentoDoGrifo(docs: readonly DocumentoHistorico[], grifo: Grifo): string | null {
   const alvo = grifo.origemIds[0];
   if (!alvo) return null;
   return docs.find(d => d.itens.some(o => o.id === alvo))?.id ?? null;
}

/** Próxima disciplina que atende ao critério, a partir da atual (dá a volta; a atual só se for a única). */
export function proximaQue(
   itens: readonly ItemAnalise[],
   atualId: string | null,
   criterio: (item: ItemAnalise) => boolean,
   passo: 1 | -1 = 1,
): string | null {
   const i = itens.findIndex(x => x.id === atualId);
   for (let k = 1; k <= itens.length; k++) {
      const c = itens[(i + passo * k + itens.length * 2) % itens.length];
      if (c && criterio(c)) return c.id;
   }
   return null;
}

/** Próxima disciplina em que a IA tem dúvida, a partir da atual (dá a volta). */
export function proximaDuvida(itens: readonly ItemAnalise[], atualId: string | null, passo: 1 | -1 = 1): string | null {
   return proximaQue(itens, atualId, iaEmDuvida, passo);
}

/** Pergunta da analista que ainda espera o parecer da coordenação. */
export const perguntaAberta = (item: ItemAnalise): boolean => item.estado === "PERGUNTA_ABERTA";
