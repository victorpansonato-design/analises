/**
 * Abas do painel do caso (docs/05 §3.4) e a aba padrão por papel e etapa. Ao trocar de caso, a aba
 * volta à padrão do papel NA etapa: quem abre um caso cai onde vai trabalhar.
 */
import type { Papel } from "@/features/sessao";

import { terminaNaAnalise, type Etapa, type Tipo } from "@/features/casos/types/caso.schema";

export const ABAS = ["analise", "documentos", "dados", "proposta"] as const;
export type Aba = (typeof ABAS)[number];

export const ROTULO_ABA: Record<Aba, string> = {
   analise: "Análise",
   documentos: "Documentos",
   dados: "Dados",
   proposta: "Proposta",
};

const MATRICULA_EM_DIANTE: readonly Etapa[] = ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO", "MATRICULADO"];

export function abaPadrao(_papeis: readonly Papel[], etapa: Etapa): Aba {
   if (etapa === "AGUARDANDO_DOCUMENTOS" || etapa === "RASCUNHO") return "documentos";
   return MATRICULA_EM_DIANTE.includes(etapa) ? "proposta" : "analise";
}

/** Abas do caso conforme o tipo: aproveitamento de estudos não tem proposta (termina na análise). */
export function abasDoTipo(tipo: Tipo): readonly Aba[] {
   return terminaNaAnalise(tipo) ? ABAS.filter(a => a !== "proposta") : ABAS;
}

export function ehAba(valor: string | null): valor is Aba {
   return !!valor && (ABAS as readonly string[]).includes(valor);
}
