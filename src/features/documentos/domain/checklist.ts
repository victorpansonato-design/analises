/**
 * Regras puras do checklist de documentos (docs/05 §3.4, docs/15 §4). A interface e o backend
 * simulado usam AS MESMAS funções: o motivo que desabilita um botão é o mesmo texto do 422.
 *
 * - "Completo" = todo obrigatório aceito (ou dispensado). Só então o caso vai sozinho à pré-análise.
 * - Aceitar e recusar só fazem sentido com arquivo recebido; dispensar, só para opcional.
 * - O histórico interno não é anexado à mão: vem do sistema acadêmico ("Migrar histórico interno").
 */
import type { StatusTone } from "@/components/core/status";

import type { CasoDetalhe } from "@/features/casos";

import type { ItemChecklist, StatusDocumento } from "@/features/documentos/types/documento.schema";

export const ID_HISTORICO_INTERNO = "historico-interno";

/** Status como ponto + palavra (DS §12): aceito fica em silêncio, recusado é o único vermelho. */
export const TOM_STATUS_DOCUMENTO: Record<StatusDocumento, StatusTone> = {
   ACEITO: "ok",
   RECEBIDO: "info",
   PENDENTE: "neutral",
   RECUSADO: "crit",
   DISPENSADO: "muted",
};

/** Leitura automática de legibilidade: só aparece quando pede atenção. É sinal, não decisão. */
export const AVISO_LEGIBILIDADE: Record<"DUVIDOSA" | "RUIM", { tom: StatusTone; texto: string }> = {
   DUVIDOSA: { tom: "warn", texto: "Legibilidade duvidosa" },
   RUIM: { tom: "crit", texto: "Legibilidade ruim" },
};

/**
 * Anexo feito pela equipe. [VALIDAR com TI] tamanho máximo e formatos aceitos pelo GED; até lá,
 * PDF e imagem de até 20 MB (o que o WhatsApp entrega).
 */
export const ANEXO = {
   aceitar: "application/pdf,image/*",
   tamanhoMaximoMb: 20,
} as const;

export interface ContagemChecklist {
   obrigatorios: number;
   /** Obrigatórios aceitos ou dispensados (mesma conta do contador do caso). */
   obrigatoriosOk: number;
   /** Recebidos esperando conferência (qualquer item). */
   aConferir: number;
   /** Obrigatórios que o candidato ainda precisa mandar (pendentes ou recusados). */
   faltando: number;
   completo: boolean;
}

const resolvido = (s: StatusDocumento) => s === "ACEITO" || s === "DISPENSADO";

export function contarChecklist(itens: readonly ItemChecklist[]): ContagemChecklist {
   const obrigatorios = itens.filter(i => i.obrigatorio);
   const obrigatoriosOk = obrigatorios.filter(i => resolvido(i.status)).length;
   return {
      obrigatorios: obrigatorios.length,
      obrigatoriosOk,
      aConferir: itens.filter(i => i.status === "RECEBIDO").length,
      faltando: obrigatorios.filter(i => i.status === "PENDENTE" || i.status === "RECUSADO").length,
      completo: obrigatoriosOk === obrigatorios.length,
   };
}

/** O que entra no "Lembrar agora": obrigatório pendente ou recusado (o candidato precisa reenviar). */
export function itensParaLembrar(itens: readonly ItemChecklist[]): ItemChecklist[] {
   return itens.filter(i => i.obrigatorio && (i.status === "PENDENTE" || i.status === "RECUSADO"));
}

export type AvaliacaoStatus = "ACEITO" | "RECUSADO" | "DISPENSADO";

/** Por que não dá para aceitar / recusar / dispensar este item agora (`null` = pode). */
export function motivoNaoAvaliar(item: ItemChecklist, status: AvaliacaoStatus): string | null {
   if (status === "DISPENSADO") {
      if (item.obrigatorio) return "Documento obrigatório não pode ser dispensado";
      if (item.status === "DISPENSADO") return "Este documento já foi dispensado";
      if (item.status === "ACEITO") return "Este documento já foi aceito";
      return null;
   }
   if (item.status === "DISPENSADO") return "Este documento foi dispensado";
   if (item.arquivos.length === 0) return "Ainda não chegou arquivo para conferir";
   if (status === "ACEITO" && item.status === "ACEITO") return "Este documento já foi aceito";
   if (status === "RECUSADO" && item.status === "RECUSADO") return "Já recusado: aguarde o novo envio do candidato";
   return null;
}

/** Por que a equipe não pode anexar arquivo a este item (`null` = pode). */
export function motivoNaoAnexar(item: ItemChecklist): string | null {
   if (item.id === ID_HISTORICO_INTERNO) return "O histórico interno vem do sistema acadêmico: use Migrar histórico interno";
   if (item.status === "ACEITO") return "Documento já aceito";
   if (item.status === "DISPENSADO") return "Documento dispensado";
   return null;
}

/** Validação do arquivo escolhido ou arrastado (antes de enviar). */
export function motivoArquivoInvalido(arquivo: { type: string; size: number }): string | null {
   const tipoOk = arquivo.type === "application/pdf" || arquivo.type.startsWith("image/");
   if (!tipoOk) return "Envie PDF ou imagem (foto do documento)";
   if (arquivo.size > ANEXO.tamanhoMaximoMb * 1024 * 1024)
      return `Arquivo maior que ${ANEXO.tamanhoMaximoMb} MB. Reduza a resolução ou divida o PDF`;
   if (arquivo.size === 0) return "Arquivo vazio. Escolha outro";
   return null;
}

/** Transferência interna e retorno usam o histórico do próprio sistema acadêmico. */
export function usaHistoricoInterno(tipo: CasoDetalhe["tipo"]): boolean {
   return tipo === "TRANSFERENCIA_INTERNA" || tipo === "RETORNO";
}
