/**
 * Mensagem automática de documento recusado (template `documento_recusado`, docs/08 §2 e §3).
 * Puro e compartilhado: a prévia do modal de recusa e o backend simulado montam o MESMO texto, então
 * quem recusa vê exatamente o que o candidato vai receber.
 *
 *    {{1}}, recebemos o arquivo {{2}}, mas {{3}}. Pode enviar de novo?
 *    Dica: {{4}}
 */
import type { MotivoRecusa } from "@/features/documentos/types/documento.schema";

export const TEMPLATE_RECUSA = "documento_recusado";

/** Texto livre da recusa (vira a dica ao candidato). */
export const TEXTO_RECUSA_MAX = 300;

interface Explicacao {
   /** `{{3}}`: o que aconteceu, no tom do candidato. */
   problema: (documento: string) => string;
   /** `{{4}}`: a dica padrão quando quem recusa não escreve uma. */
   dica: string;
}

/** [VALIDAR com Marketing] redação final junto com o template. */
export const EXPLICACAO_RECUSA: Record<MotivoRecusa, Explicacao> = {
   ILEGIVEL: { problema: () => "a imagem ficou difícil de ler", dica: "fotografe com boa luz e o documento inteiro na tela." },
   INCOMPLETO: { problema: () => "faltam páginas ou partes do documento", dica: "envie todas as páginas, frente e verso." },
   DOCUMENTO_ERRADO: {
      problema: documento => `não é o documento que pedimos (${documento.toLowerCase()})`,
      dica: "confira o nome do documento na lista que enviamos.",
   },
   SEM_ASSINATURA_OU_CARIMBO: {
      problema: () => "falta a assinatura ou o carimbo da instituição",
      dica: "peça à secretaria da sua instituição uma via assinada ou carimbada.",
   },
   VENCIDO: { problema: () => "o documento está fora da validade", dica: "envie uma versão emitida recentemente." },
   OUTRO: { problema: () => "ele precisa de um ajuste", dica: "responda esta mensagem se tiver dúvida." },
};

/** "Outro" exige explicação: sem ela o candidato não sabe o que corrigir. */
export function motivoRecusaInvalido(motivo: MotivoRecusa | undefined | null, texto?: string | null): string | null {
   if (!motivo) return "Escolha o motivo da recusa";
   const t = texto?.trim() ?? "";
   if (motivo === "OUTRO" && !t) return "Explique o que o candidato precisa corrigir";
   if (t.length > TEXTO_RECUSA_MAX) return `Use no máximo ${TEXTO_RECUSA_MAX} caracteres`;
   return null;
}

export interface DadosRecusa {
   /** Primeiro nome do candidato. */
   nome: string;
   /** Nome do arquivo recusado. */
   arquivo: string;
   /** Nome do item do checklist. */
   documento: string;
   motivo: MotivoRecusa;
   texto?: string | null;
}

export function textoRecusa({ nome, arquivo, documento, motivo, texto }: DadosRecusa): string {
   const e = EXPLICACAO_RECUSA[motivo];
   const dica = texto?.trim() || e.dica;
   return `${nome}, recebemos o arquivo ${arquivo}, mas ${e.problema(documento)}. Pode enviar de novo?\nDica: ${dica}`;
}
