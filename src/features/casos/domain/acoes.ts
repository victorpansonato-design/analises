/**
 * Ações de um caso como a interface as enxerga. A API devolve em `caso.acoesDisponiveis` TODAS as
 * ações que fazem sentido para o usuário naquele caso: as transições da máquina (caso.machine.ts),
 * as capacidades sem mudança de etapa (permissoes.ts) e `ASSUMIR` (atribuir a mim). Cada uma vem
 * com `habilitada` e `motivos` prontos: a interface desenha e explica, o backend decide.
 */
import type { Papel } from "@/features/sessao";

import type { Capacidade } from "@/features/casos/domain/permissoes";
import type { AcaoDisponivel, AcaoTransicao, Etapa } from "@/features/casos/types/caso.schema";

export type NomeAcao = AcaoTransicao | Capacidade | "ASSUMIR";

export const ROTULO_ACAO: Record<NomeAcao, string> = {
   ENVIAR_PROTOCOLO: "Enviar protocolo",
   DOCUMENTOS_COMPLETOS: "Marcar documentos completos",
   CONCLUIR_PRE_ANALISE: "Concluir pré-análise",
   FALHAR_PRE_ANALISE: "Registrar falha da pré-análise",
   ENVIAR_COORDENACAO: "Enviar para coordenação",
   RESPONDER_COORDENACAO: "Devolver para a analista",
   CONCLUIR_ANALISE: "Concluir análise",
   ENVIAR_PROPOSTA: "Enviar proposta",
   REGISTRAR_RESPOSTA: "Registrar resposta",
   EFETIVAR_MATRICULA: "Efetivar matrícula",
   MARCAR_SEM_RETORNO: "Marcar sem retorno",
   ENCERRAR_PERDIDO: "Encerrar como perdido",
   CANCELAR: "Cancelar caso",
   ADIAR: "Adiar",
   RETOMAR: "Retomar agora",
   SOLICITAR_REANALISE: "Reabrir análise",
   REABRIR: "Reabrir",
   ALTERAR_DESTINO: "Alterar destino",
   ASSUMIR: "Assumir caso",
   NOVO_PROTOCOLO: "Nova análise para este candidato",
   EDITAR_DADOS: "Editar dados",
   SOLICITAR_DOCUMENTO: "Solicitar documento",
   AVALIAR_DOCUMENTO: "Avaliar documento",
   REEXECUTAR_PRE_ANALISE: "Reexecutar pré-análise",
   ATRIBUIR: "Atribuir responsável",
   PEGAR_PROXIMO: "Pegar próximo",
   DECIDIR_ITEM: "Decidir disciplina",
   PERGUNTAR_COORDENACAO: "Perguntar à coordenação",
   RESPONDER_ITEM_COORDENACAO: "Responder coordenação",
   CRIAR_EQUIVALENCIA: "Criar regra de equivalência",
   ENVIAR_MENSAGEM: "Mensagem ao candidato",
   ADICIONAR_NOTA: "Adicionar nota",
   MARCAR_OUVIDORIA: "Marcar ouvidoria",
   ESCALAR: "Escalar",
   REGISTRAR_PENDENCIA: "Registrar pendência externa",
   VER_GESTAO: "Ver gestão comercial",
   VER_INDICADORES_POR_PESSOA: "Ver indicadores por pessoa",
   EXPORTAR: "Imprimir análise",
   REVELAR_CPF: "Mostrar CPF",
   VER_DOCUMENTO_IDENTIDADE: "Ver documento de identidade",
   VER_FINANCEIRO: "Ver condição financeira",
   EDITAR_PARAMETROS: "Editar parâmetros",
};

/** Ações que encerram ou desfazem trabalho: pedem confirmação explícita com motivo. */
export const ACOES_DESTRUTIVAS: readonly NomeAcao[] = ["ENCERRAR_PERDIDO", "CANCELAR"];

/** Papel que é dono de cada etapa (docs/03 §1). `null`: candidato, sistema ou etapa final. */
export const PAPEL_DONO_DA_ETAPA: Record<Etapa, Papel | null> = {
   RASCUNHO: "CONSULTOR",
   AGUARDANDO_DOCUMENTOS: "CONSULTOR",
   PRE_ANALISE: null,
   EM_ANALISE: "ANALISTA",
   AGUARDANDO_COORDENACAO: "COORDENADOR",
   AJUSTE_POS_COORDENACAO: "ANALISTA",
   PRONTO_PARA_MATRICULA: "MATRICULA",
   PROPOSTA_ENVIADA: "MATRICULA",
   EM_NEGOCIACAO: "MATRICULA",
   ADIADO: null,
   MATRICULADO: null,
   CONCLUIDO: null,
   PERDIDO: null,
   CANCELADO: null,
};

/** Etapas do "Pegar próximo" por papel (docs/05 §2.4). */
export const ETAPAS_PEGAR_PROXIMO: Partial<Record<Papel, readonly Etapa[]>> = {
   ANALISTA: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO"],
   MATRICULA: ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
   ADMIN: ["EM_ANALISE", "AJUSTE_POS_COORDENACAO", "PRONTO_PARA_MATRICULA"],
};

/** A ação como a API devolveu para este caso e usuário, ou `null` se não existe para ele. */
export function acaoDoCaso(caso: { acoesDisponiveis: readonly AcaoDisponivel[] }, nome: NomeAcao): AcaoDisponivel | null {
   return caso.acoesDisponiveis.find(a => a.acao === nome) ?? null;
}

/** Atalho: a ação existe e está habilitada agora. */
export function podeNoCaso(caso: { acoesDisponiveis: readonly AcaoDisponivel[] }, nome: NomeAcao): boolean {
   return acaoDoCaso(caso, nome)?.habilitada ?? false;
}
