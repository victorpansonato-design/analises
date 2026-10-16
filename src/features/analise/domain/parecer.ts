/**
 * Parecer da coordenação (decisão de 16/10/2026): o coordenador usa as mesmas siglas da equipe de
 * análises (Dispensa, DP, ADAP, Regular), sem texto explicativo. Ele já sabe o que cada uma significa.
 */
import { ROTULO_DECISAO, type DecisaoItem } from "@/features/casos";

import type { ItemAnalise } from "@/features/analise/types/analise.schema";

/** Texto que vai para as observações do protocolo. */
export function textoDoParecer(decisao: DecisaoItem, fundamento: string | null | undefined): string {
   const f = fundamento?.trim();
   return `${ROTULO_DECISAO[decisao]}.${f ? ` Fundamento: ${f}` : ""}`;
}

/** Sugestão que a analista mandou com a pergunta (ou a da pré-análise, se não houver). */
export function sugestaoDaPergunta(item: ItemAnalise): DecisaoItem {
   return item.pergunta?.decisaoSugerida ?? item.sugestao?.decisao ?? "DISPENSA";
}
