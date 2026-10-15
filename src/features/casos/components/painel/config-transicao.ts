/**
 * O que cada transição diz ANTES de confirmar e o que ela pede (motivo em lista fechada, texto,
 * data, novo destino). Motivos padronizados de docs/03 §4.
 */
import {
   ROTULO_MOTIVO_ADIAMENTO,
   ROTULO_MOTIVO_CANCELAMENTO,
   ROTULO_MOTIVO_PERDA,
   ROTULO_MOTIVO_REANALISE,
   type AcaoTransicao,
} from "@/features/casos/types/caso.schema";

export interface ConfigTransicao {
   titulo: string;
   descricao: string;
   confirmar: string;
   sucesso: string;
   perigo?: boolean;
   motivos?: Record<string, string>;
   /** Motivo único implícito (a máquina exige motivo, mas não há lista fechada). */
   motivoFixo?: string;
   texto?: "obrigatorio" | "se-outro" | "opcional";
   textoRotulo?: string;
   data?: boolean;
   destino?: boolean;
   aviso?: string;
}

export const CONFIG_TRANSICAO: Partial<Record<AcaoTransicao, ConfigTransicao>> = {
   ENVIAR_PROTOCOLO: {
      titulo: "Enviar protocolo",
      descricao:
         "O caso sai do rascunho. Quando há documentos externos, o candidato recebe a lista pelo WhatsApp; senão, a pré-análise começa sozinha.",
      confirmar: "Enviar protocolo",
      sucesso: "Protocolo enviado",
   },
   DOCUMENTOS_COMPLETOS: {
      titulo: "Marcar documentos como completos",
      descricao: "Use só quando a conferência foi feita fora do sistema. A pré-análise começa em seguida.",
      confirmar: "Marcar como completos",
      sucesso: "Documentos marcados como completos",
      motivoFixo: "CONFERENCIA_MANUAL",
      texto: "obrigatorio",
      textoRotulo: "Justificativa",
   },
   ENVIAR_COORDENACAO: {
      titulo: "Enviar para coordenação",
      descricao: "A coordenação do curso recebe só as perguntas, com link direto para elas. Prazo de resposta: 24 horas.",
      confirmar: "Enviar para coordenação",
      sucesso: "Perguntas enviadas à coordenação",
   },
   RESPONDER_COORDENACAO: {
      titulo: "Devolver para a analista",
      descricao: "A analista recebe as respostas e ajusta a análise. Respostas marcadas como regra passam a valer para os próximos casos.",
      confirmar: "Devolver para a analista",
      sucesso: "Devolvido para a analista",
   },
   CONCLUIR_ANALISE: {
      titulo: "Concluir análise",
      descricao:
         "O resumo fica congelado e vai para a matrícula fazer o primeiro contato. Nenhum número chega ao candidato antes da proposta.",
      confirmar: "Concluir análise",
      sucesso: "Análise concluída",
   },
   RETOMAR: {
      titulo: "Retomar agora",
      descricao: "O caso volta para a etapa em que estava e o prazo volta a contar.",
      confirmar: "Retomar",
      sucesso: "Caso retomado",
   },
   ENCERRAR_PERDIDO: {
      titulo: "Encerrar como perdido",
      descricao: "O caso sai da fila. Dá para reabrir depois, com motivo.",
      confirmar: "Encerrar como perdido",
      sucesso: "Caso encerrado como perdido",
      perigo: true,
      motivos: ROTULO_MOTIVO_PERDA,
      texto: "se-outro",
   },
   CANCELAR: {
      titulo: "Cancelar caso",
      descricao: "Para protocolos abertos por engano, duplicados ou de teste. Caso de teste fica fora dos indicadores.",
      confirmar: "Cancelar caso",
      sucesso: "Caso cancelado",
      perigo: true,
      motivos: ROTULO_MOTIVO_CANCELAMENTO,
      texto: "opcional",
      aviso: "Duplicado e teste não geram mensagem ao candidato.",
   },
   ADIAR: {
      titulo: "Adiar caso",
      descricao: "O prazo pausa até a data escolhida. No dia, o caso volta sozinho para a etapa em que estava.",
      confirmar: "Adiar",
      sucesso: "Caso adiado",
      motivos: ROTULO_MOTIVO_ADIAMENTO,
      texto: "se-outro",
      data: true,
   },
   SOLICITAR_REANALISE: {
      titulo: "Solicitar reanálise",
      descricao: "O caso volta para a mesma analista, com o motivo e o contador de reanálises. O resumo enviado deixa de valer.",
      confirmar: "Solicitar reanálise",
      sucesso: "Reanálise solicitada",
      motivos: ROTULO_MOTIVO_REANALISE,
      texto: "se-outro",
   },
   REABRIR: {
      titulo: "Reabrir caso",
      descricao:
         "O caso volta para onde parou: matrícula, se a análise do ciclo ainda vale; análise, se os documentos estão completos; senão, documentos.",
      confirmar: "Reabrir",
      sucesso: "Caso reaberto",
      motivoFixo: "REABERTURA",
      texto: "obrigatorio",
      textoRotulo: "Motivo da reabertura",
   },
   ALTERAR_DESTINO: {
      titulo: "Alterar destino",
      descricao: "As decisões atuais vão para o histórico e a pré-análise roda de novo para o novo destino.",
      confirmar: "Alterar destino",
      sucesso: "Destino alterado. A pré-análise vai rodar de novo.",
      motivoFixo: "ALTERACAO_DESTINO",
      texto: "obrigatorio",
      textoRotulo: "Motivo da alteração",
      destino: true,
   },
};

export function temDialogoDeTransicao(acao: string): acao is AcaoTransicao {
   return acao in CONFIG_TRANSICAO;
}
