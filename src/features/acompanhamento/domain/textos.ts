/**
 * Textos da página do aluno. Tom: acolhedor e direto, de quem está cuidando de um sonho. Sem jargão
 * interno (coordenação, matriz, pré-análise) e sem prometer prazo que a equipe não controla.
 * Linguagem neutra de gênero: nada de "bem-vindo(a)".
 */
import { ROTULO_TIPO_CANDIDATO, type Tipo } from "@/features/casos";

import type { AcompanhamentoPublico, EstadoPasso, PassoPublico } from "@/features/acompanhamento/types/acompanhamento.schema";

export interface Destaque {
   titulo: string;
   texto: string;
}

/** Saudação do topo: o nome e o que esse pedido significa. */
export function saudacao(d: Pick<AcompanhamentoPublico, "primeiroNome" | "tipo" | "situacao">): Destaque {
   const nome = d.primeiroNome;
   if (d.situacao === "MATRICULADO")
      return {
         titulo: `Parabéns, ${nome}! Sua matrícula foi efetivada.`,
         texto: "Agora é oficial: o sonho virou matrícula. Abaixo estão seus dados para o primeiro acesso.",
      };
   if (d.situacao === "CONCLUIDO")
      return {
         titulo: `Pronto, ${nome}! Seu aproveitamento foi concluído.`,
         texto: "As disciplinas aproveitadas já estão registradas no seu curso.",
      };
   if (d.situacao === "ENCERRADO")
      return {
         titulo: `${nome}, esta solicitação foi encerrada.`,
         texto: "Se o plano mudou de novo, tudo bem. Quando quiser retomar, a gente te ajuda a recomeçar de onde parou.",
      };
   const porTipo: Record<Tipo, Destaque> = {
      TRANSFERENCIA_EXTERNA: {
         titulo: `${nome}, seu próximo capítulo começa aqui.`,
         texto: "Você escolheu continuar sua graduação na UniAnchieta. Acompanhe cada passo até a matrícula.",
      },
      PORTADOR_DIPLOMA: {
         titulo: `${nome}, sua nova graduação já está a caminho.`,
         texto: "O que você já conquistou conta. Acompanhe cada passo até a matrícula.",
      },
      RETORNO: {
         titulo: `${nome}, que bom ter você de volta.`,
         texto: "Retomar é uma decisão corajosa. Acompanhe cada passo até a matrícula.",
      },
      TRANSFERENCIA_INTERNA: {
         titulo: `${nome}, um novo caminho dentro da UniAnchieta.`,
         texto: "Sua troca de curso está em andamento. Acompanhe cada passo até a matrícula.",
      },
      APROVEITAMENTO_ESTUDOS: {
         titulo: `${nome}, seus estudos contam.`,
         texto: "Estamos analisando o que você já cursou para aproveitar no seu curso.",
      },
   };
   return porTipo[d.tipo];
}

export const TITULO_PASSO: Record<PassoPublico, string> = {
   RECEBIDA: "Pedido recebido",
   DOCUMENTOS: "Documentos",
   ANALISE: "Análise do seu histórico",
   PROPOSTA: "Sua proposta",
   MATRICULA: "Matrícula",
   RESULTADO: "Resultado do aproveitamento",
};

/** Título do passo, com o ajuste do portador de diploma (é o diploma que a equipe analisa). */
export function tituloDoPasso(passo: PassoPublico, tipo: Tipo): string {
   if (passo === "ANALISE" && tipo === "PORTADOR_DIPLOMA") return "Análise do seu diploma e histórico";
   return TITULO_PASSO[passo];
}

/** Uma frase por passo e estado: o que aconteceu, o que está acontecendo ou o que vem. */
export function textoDoPasso(passo: PassoPublico, estado: EstadoPasso, d: Pick<AcompanhamentoPublico, "tipo" | "aguardandoAluno">): string {
   const feito = estado === "FEITO";
   const atual = estado === "ATUAL";
   if (estado === "INTERROMPIDO") return "A solicitação parou aqui.";
   switch (passo) {
      case "RECEBIDA":
         return `Recebemos seu pedido de ${ROTULO_TIPO_CANDIDATO[d.tipo]}. A partir daqui, é com a gente.`;
      case "DOCUMENTOS":
         if (feito) return "Documentos recebidos e conferidos.";
         if (atual && d.aguardandoAluno) return "Falta pouco: precisamos de alguns documentos seus. Enviamos a lista pelo WhatsApp.";
         if (atual) return "Estamos organizando seu pedido e os documentos.";
         return "Vamos conferir os documentos que você enviar.";
      case "ANALISE":
         if (feito) return "Análise concluída.";
         if (atual) return "Estamos olhando cada disciplina que você já cursou para aproveitar ao máximo o que você conquistou.";
         return "Vamos conferir as disciplinas que você já cursou.";
      case "PROPOSTA":
         if (feito) return "Proposta combinada.";
         if (atual && d.aguardandoAluno) return "Sua proposta chegou! Confira os detalhes no WhatsApp e fale com a gente para seguir.";
         if (atual) return "Estamos preparando sua proposta com as disciplinas aproveitadas e as condições.";
         return "Você recebe a proposta com as disciplinas aproveitadas e as condições.";
      case "MATRICULA":
         if (feito) return "Matrícula efetivada. Boas-vindas à UniAnchieta!";
         return "O último passo antes das aulas.";
      case "RESULTADO":
         if (feito) return "Aproveitamento concluído e registrado no seu curso.";
         return "Você recebe o resultado com as disciplinas aproveitadas.";
   }
}

/** Rótulo curto do momento, para o selo do andamento. */
export function rotuloSituacao(d: Pick<AcompanhamentoPublico, "situacao" | "aguardandoAluno" | "passos" | "tipo">): string {
   switch (d.situacao) {
      case "MATRICULADO":
         return "Matrícula efetivada";
      case "CONCLUIDO":
         return "Concluído";
      case "PAUSADO":
         return "Pausado";
      case "ENCERRADO":
         return "Encerrado";
      case "EM_ANDAMENTO": {
         if (d.aguardandoAluno) return "Aguardando você";
         const atual = d.passos.find(p => p.estado === "ATUAL");
         return atual ? tituloDoPasso(atual.passo, d.tipo) : "Em andamento";
      }
   }
}
