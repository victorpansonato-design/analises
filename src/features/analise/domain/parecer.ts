/**
 * Parecer da coordenação em linguagem de quem dá o parecer (decisão de 15/10/2026): o coordenador
 * decide com o fundamento técnico da área; a sigla fica entre parênteses para a equipe de análises.
 * A explicação é só orientação de leitura [VALIDAR com a Secretaria]: a regra de cada decisão é a do
 * regimento, não deste texto.
 */
import type { DecisaoItem } from "@/features/casos";

/** Ordem da tela: do "sim" ao "não". */
export const ORDEM_PARECER: readonly DecisaoItem[] = ["DISPENSA", "ADAP", "DP", "REGULAR"];

export const ROTULO_PARECER: Record<DecisaoItem, string> = {
   DISPENSA: "Aproveita (dispensa)",
   ADAP: "Aproveita com adaptação (ADAP)",
   DP: "Cursa como dependência (DP)",
   REGULAR: "Não aproveita: cursa a disciplina (regular)",
};

export const TITULO_PARECER: Record<DecisaoItem, string> = {
   DISPENSA: "Aproveita",
   ADAP: "Aproveita com adaptação",
   DP: "Cursa como dependência",
   REGULAR: "Não aproveita",
};

export const EXPLICACAO_PARECER: Record<DecisaoItem, string> = {
   DISPENSA: "Conteúdo e carga horária cobrem a disciplina. O aluno fica dispensado.",
   ADAP: "Cobre boa parte, mas falta conteúdo. O aluno complementa com uma adaptação.",
   DP: "O aluno precisa cursar a disciplina como dependência.",
   REGULAR: "Não há equivalência. O aluno cursa a disciplina normalmente.",
};

/** Texto que vai para as observações do protocolo. */
export function textoDoParecer(decisao: DecisaoItem, fundamento: string | null | undefined): string {
   const f = fundamento?.trim();
   return `${ROTULO_PARECER[decisao]}.${f ? ` Fundamento: ${f}` : ""}`;
}
