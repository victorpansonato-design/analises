/**
 * Regras puras do envio de templates (docs/08 §4). A interface e o backend simulado usam as mesmas
 * funções: o motivo que bloqueia o botão é o mesmo texto do 422.
 *
 * Ordem do bloqueio (o primeiro que valer explica): template fora da etapa → sem autorização de
 * WhatsApp → variável vazia. Variável vazia nunca vira texto "em branco" para o candidato.
 */
import { lista } from "@/lib/format";

import { ROTULO_ETAPA, type Etapa } from "@/features/casos";

import type { TemplateMensagem } from "@/features/comunicacao/types/comunicacao.schema";

/** Nome de cada variável como a equipe entende ("Falta: documentos pendentes"). */
export const ROTULO_VARIAVEL: Record<string, string> = {
   nome: "nome do candidato",
   tipo: "tipo do pedido",
   curso: "curso de destino",
   documentos: "documentos pendentes",
   prazo: "prazo de retorno",
   disciplinas: "disciplinas aproveitadas",
   horas: "horas aproveitadas",
   semestres: "previsão de semestres",
   ra: "RA",
};

/** De onde vem a variável, para quem está bloqueado saber o que fazer. */
export const ORIGEM_VARIAVEL: Record<string, string> = {
   documentos: "Não há documento obrigatório pendente no checklist: não há o que lembrar.",
   disciplinas: "Os números saem do resumo congelado, que nasce ao concluir a análise.",
   horas: "Os números saem do resumo congelado, que nasce ao concluir a análise.",
   semestres: "A previsão sai do resumo congelado, que nasce ao concluir a análise.",
   ra: "O RA existe só depois da matrícula efetivada.",
   curso: "Defina o curso de destino na aba Dados.",
   nome: "Preencha o nome do candidato na aba Dados.",
};

export function rotuloVariavel(v: string): string {
   return ROTULO_VARIAVEL[v] ?? v;
}

/** `Falta: documentos pendentes` · `null` quando nada falta. */
export function explicarFaltando(variaveis: readonly string[]): string | null {
   if (variaveis.length === 0) return null;
   return `Falta: ${lista([...new Set(variaveis)].map(rotuloVariavel))}`;
}

/** Frases de origem das variáveis que faltam, sem repetição. */
export function origemDoQueFalta(variaveis: readonly string[]): string[] {
   return [...new Set(variaveis.map(v => ORIGEM_VARIAVEL[v]).filter((t): t is string => !!t))];
}

/** O template serve à etapa atual? `null` = serve. */
export function motivoTemplateForaDaEtapa(template: Pick<TemplateMensagem, "etapas">, etapa: Etapa): string | null {
   if (!template.etapas || template.etapas.length === 0 || template.etapas.includes(etapa)) return null;
   const nomes = lista(
      template.etapas.map(e => ROTULO_ETAPA[e]),
      "ou",
   );
   return template.etapas.length > 1 ? `Serve às etapas ${nomes}` : `Serve à etapa ${nomes}`;
}

export const SEM_OPT_IN = "O candidato não autorizou contato pelo WhatsApp";

export interface CondicoesEnvio {
   template: Pick<TemplateMensagem, "etapas">;
   etapa: Etapa;
   optInWhatsapp: boolean;
   variaveisFaltando: readonly string[];
}

/** Por que este envio não pode sair agora (`null` = pode). */
export function motivoBloqueioEnvio({ template, etapa, optInWhatsapp, variaveisFaltando }: CondicoesEnvio): string | null {
   return motivoTemplateForaDaEtapa(template, etapa) ?? (optInWhatsapp ? null : SEM_OPT_IN) ?? explicarFaltando(variaveisFaltando);
}

export interface TrechoPrevia {
   texto: string;
   /** Nome da variável quando o trecho é um `[variavel]` que ficou vazio. */
   faltando: string | null;
}

/**
 * Quebra a prévia em trechos para destacar as variáveis vazias (`[documentos]`). Só vira destaque
 * o marcador que a API apontou como faltando: colchete no texto do template continua texto.
 */
export function segmentarPrevia(texto: string, faltando: readonly string[]): TrechoPrevia[] {
   if (faltando.length === 0) return [{ texto, faltando: null }];
   const trechos: TrechoPrevia[] = [];
   const re = /\[([a-z_]+)\]/g;
   let ultimo = 0;
   for (const m of texto.matchAll(re)) {
      const nome = m[1];
      if (!faltando.includes(nome) || m.index === undefined) continue;
      if (m.index > ultimo) trechos.push({ texto: texto.slice(ultimo, m.index), faltando: null });
      trechos.push({ texto: m[0], faltando: nome });
      ultimo = m.index + m[0].length;
   }
   if (ultimo < texto.length) trechos.push({ texto: texto.slice(ultimo), faltando: null });
   return trechos;
}
