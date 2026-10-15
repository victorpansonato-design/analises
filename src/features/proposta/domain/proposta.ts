/**
 * Regras puras da aba Proposta (docs/05 §3.4, docs/03 ENVIAR_PROPOSTA/EFETIVAR_MATRICULA, docs/08).
 *
 * - A interface só mostra a ação que a API devolveu em `acoesDisponiveis`; desabilitada, explica o
 *   primeiro motivo em texto visível.
 * - "Efetivar matrícula" tem a guarda "aceite registrado", e o aceite é registrado no PRÓPRIO modal
 *   de efetivação (canal + data). Por isso o motivo de aceite não impede abrir o modal: o envio
 *   leva o aceite junto e o backend confere tudo.
 * - Guardas do envio da proposta ficam à vista no modal (opt-in, condição financeira, celular e
 *   variáveis da mensagem), para ninguém descobrir o bloqueio só depois de clicar.
 */
import type { ResumoAnalise } from "@/features/analise";
import { acaoDoCaso, type CasoDetalhe } from "@/features/casos";
import { digits, lista, ordinal, percent, phone, plural } from "@/lib/format";

import type { AcaoProposta } from "@/features/proposta/types/proposta.schema";

export const ROTULO_ACAO_PROPOSTA: Record<AcaoProposta, string> = {
   ENVIAR_PROPOSTA: "Enviar proposta",
   REGISTRAR_RESPOSTA: "Registrar resposta",
   EFETIVAR_MATRICULA: "Efetivar matrícula",
};

export const ACOES_PROPOSTA: readonly AcaoProposta[] = ["ENVIAR_PROPOSTA", "REGISTRAR_RESPOSTA", "EFETIVAR_MATRICULA"];

export interface BotaoProposta {
   acao: AcaoProposta;
   rotulo: string;
   habilitada: boolean;
   /** Primeiro motivo do bloqueio, para mostrar em texto. */
   motivo: string | null;
}

/** Estado do botão secundário da aba, ou `null` quando a API não devolveu a ação para este usuário. */
export function botaoDaProposta(caso: Pick<CasoDetalhe, "acoesDisponiveis">, acao: AcaoProposta): BotaoProposta | null {
   const a = acaoDoCaso(caso, acao);
   if (!a) return null;
   // O aceite chega junto com a efetivação (a máquina não desabilita por falta dele): a API decide.
   return {
      acao,
      rotulo: ROTULO_ACAO_PROPOSTA[acao],
      habilitada: a.habilitada,
      motivo: a.habilitada ? null : (a.motivos[0] ?? "Ação indisponível agora"),
   };
}

// ── Guardas do envio ───────────────────────────────────────────────────────────────────────────

export interface GuardaEnvio {
   id: "optIn" | "celular" | "financeiro" | "variaveis";
   ok: boolean;
   texto: string;
}

const ROTULO_VARIAVEL: Record<string, string> = {
   nome: "nome do candidato",
   disciplinas: "disciplinas aproveitadas",
   horas: "horas aproveitadas",
   curso: "curso de destino",
   semestres: "previsão de semestres",
};

export function rotuloVariavel(v: string): string {
   return ROTULO_VARIAVEL[v] ?? v;
}

export function celularValidoParaEnvio(celular: string | null): boolean {
   if (!celular || celular.includes("*")) return false;
   const d = digits(celular);
   return d.length === 10 || d.length === 11;
}

export interface EntradaGuardas {
   optInWhatsapp: boolean;
   celular: string | null;
   financeiroCarregado: boolean;
   /** `null` enquanto a prévia não chegou. */
   variaveisFaltando: readonly string[] | null;
}

export function guardasDoEnvio(e: EntradaGuardas): GuardaEnvio[] {
   const guardas: GuardaEnvio[] = [
      {
         id: "optIn",
         ok: e.optInWhatsapp,
         texto: e.optInWhatsapp
            ? "O candidato autorizou contato pelo WhatsApp"
            : "O candidato não autorizou contato pelo WhatsApp. Registre a autorização na aba Dados antes de enviar.",
      },
      {
         id: "celular",
         ok: celularValidoParaEnvio(e.celular),
         texto: celularValidoParaEnvio(e.celular)
            ? `Vai para o celular ${phone(e.celular ?? "")}`
            : "Celular ausente ou inválido. Corrija na aba Dados e tente de novo.",
      },
      {
         id: "financeiro",
         ok: e.financeiroCarregado,
         texto: e.financeiroCarregado ? "Condição financeira carregada" : "A condição financeira ainda não foi carregada",
      },
   ];
   if (e.variaveisFaltando && e.variaveisFaltando.length > 0) {
      guardas.push({ id: "variaveis", ok: false, texto: `Faltam dados na mensagem: ${lista(e.variaveisFaltando.map(rotuloVariavel))}` });
   }
   return guardas;
}

export function podeEnviar(guardas: readonly GuardaEnvio[]): boolean {
   return guardas.every(g => g.ok);
}

// ── Textos do resumo ───────────────────────────────────────────────────────────────────────────

/** Fração da carga horária do curso que foi dispensada (0..1); `null` sem denominador. */
export function fracaoAproveitamento(resumo: Pick<ResumoAnalise, "chDispensada" | "chTotalMatriz">): number | null {
   if (!resumo.chTotalMatriz) return null;
   return resumo.chDispensada / resumo.chTotalMatriz;
}

export function textoAproveitamento(resumo: Pick<ResumoAnalise, "chDispensada" | "chTotalMatriz">): string | null {
   const f = fracaoAproveitamento(resumo);
   return f === null ? null : percent(f);
}

/** Previsão é SEMPRE rotulada como estimativa (CLAUDE.md). */
export function textoPrevisao(semestres: number | null): string {
   return semestres
      ? `Previsão: ${plural(semestres, "semestre", "semestres")} (estimativa)`
      : "Previsão de semestres (estimativa): não calculada";
}

export function textoPeriodoIngresso(resumo: Pick<ResumoAnalise, "periodoIngresso" | "periodoIngressoSugerido">): string | null {
   const p = resumo.periodoIngresso ?? resumo.periodoIngressoSugerido;
   return p ? `${ordinal(p)} período` : null;
}

const ROTULO_CANAL_RESPOSTA: Record<string, string> = {
   WHATSAPP: "WhatsApp",
   REGISTRO_MANUAL: "registro manual",
   TELEFONE: "telefone",
   PRESENCIAL: "presencial",
   EMAIL: "e-mail",
};

export function rotuloCanalResposta(canal: string): string {
   return ROTULO_CANAL_RESPOSTA[canal] ?? canal.toLowerCase();
}

// ── Data e hora do aceite (input `datetime-local`, no relógio de quem registra) ───────────────

const dois = (n: number) => String(n).padStart(2, "0");

export function paraInputLocal(d: Date): string {
   return `${d.getFullYear()}-${dois(d.getMonth() + 1)}-${dois(d.getDate())}T${dois(d.getHours())}:${dois(d.getMinutes())}`;
}

export function deInputLocal(valor: string): string {
   return new Date(valor).toISOString();
}
