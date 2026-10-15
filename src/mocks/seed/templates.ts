/**
 * Templates aprovados de WhatsApp (docs/08 §3). O backend real fala com o Blip; aqui o texto é
 * montado igual para a prévia ser fiel. Variáveis no padrão `{{n}}`, preenchidas a partir do caso.
 * O emoji do `proposta_pronta` (opcional, só para o candidato) fica de fora: a prévia aparece na
 * interface, e a interface não tem emoji.
 */
import type { TemplateMensagem } from "@/features/comunicacao";
import type { Papel } from "@/features/sessao";

export interface TemplateMock extends TemplateMensagem {
   corpo: string;
   botoes: string[];
   papeis: Papel[];
}

export const TEMPLATES: readonly TemplateMock[] = [
   {
      id: "protocolo_aberto",
      nome: "Protocolo aberto",
      descricao: "Confirma o pedido e lista os documentos que faltam.",
      variaveis: ["nome", "tipo", "curso", "documentos"],
      etapas: ["AGUARDANDO_DOCUMENTOS"],
      corpo: "Oi, {{1}}! Aqui é da UniAnchieta. Recebemos seu pedido de {{2}} para {{3}}.\nPara analisarmos o que você pode aproveitar, envie aqui mesmo uma foto ou PDF de:\n{{4}}\nLeva poucos minutos. Se tiver dúvida, é só responder esta mensagem.",
      botoes: [],
      papeis: ["CONSULTOR", "ANALISTA", "MATRICULA", "SUPORTE", "ADMIN"],
   },
   {
      id: "lembrete_documentos",
      nome: "Lembrete de documentos",
      descricao: "Lembra o candidato do que ainda falta enviar.",
      variaveis: ["nome", "documentos"],
      etapas: ["AGUARDANDO_DOCUMENTOS"],
      corpo: "{{1}}, sua análise está quase começando. Só falta: {{2}}.\nPode mandar por aqui mesmo, foto do celular serve.",
      botoes: ["Enviar agora", "Preciso de ajuda"],
      papeis: ["CONSULTOR", "ANALISTA", "MATRICULA", "SUPORTE", "ADMIN"],
   },
   {
      id: "documentos_completos",
      nome: "Documentos completos",
      descricao: "Avisa que a análise começou e o prazo de retorno.",
      variaveis: ["nome", "prazo"],
      etapas: ["PRE_ANALISE", "EM_ANALISE"],
      corpo: "Tudo certo, {{1}}! Recebemos todos os seus documentos. Agora nossa equipe vai analisar seu histórico.\nVocê recebe o resultado por aqui em até {{2}}.",
      botoes: [],
      papeis: ["CONSULTOR", "MATRICULA", "SUPORTE", "ADMIN"],
   },
   {
      id: "proposta_pronta",
      nome: "Proposta pronta",
      descricao: "Envia o resultado da análise concluída (resumo congelado).",
      variaveis: ["nome", "disciplinas", "horas", "curso", "semestres"],
      etapas: ["PRONTO_PARA_MATRICULA"],
      corpo: "{{1}}, sua análise ficou pronta!\nVocê aproveita {{2}} disciplinas ({{3}} horas) e a previsão é concluir {{4}} em {{5}} semestres.\nQuer que eu te explique os próximos passos e os valores?",
      botoes: ["Quero saber", "Falar depois"],
      papeis: ["MATRICULA", "ADMIN"],
   },
   {
      id: "lembrete_proposta",
      nome: "Lembrete da proposta",
      descricao: "Retoma o contato com quem ainda não respondeu.",
      variaveis: ["nome", "curso"],
      etapas: ["PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
      corpo: "Oi, {{1}}! Sua análise para {{2}} continua disponível. Posso tirar alguma dúvida?",
      botoes: ["Quero conversar", "Não tenho interesse"],
      papeis: ["CONSULTOR", "MATRICULA", "SUPORTE", "ADMIN"],
   },
   {
      id: "matricula_confirmada",
      nome: "Matrícula confirmada",
      descricao: "Boas-vindas com o RA.",
      variaveis: ["nome", "curso", "ra"],
      etapas: ["MATRICULADO"],
      corpo: "Bem-vindo(a) à UniAnchieta, {{1}}! Sua matrícula em {{2}} está confirmada.\nSeu RA é {{3}}. Nos próximos dias você recebe as orientações de início das aulas.",
      botoes: [],
      papeis: ["MATRICULA", "ADMIN"],
   },
   {
      id: "encerramento_porta_aberta",
      nome: "Encerramento com porta aberta",
      descricao: "Encerra o pedido deixando a retomada fácil.",
      variaveis: ["nome"],
      etapas: ["PERDIDO", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
      corpo: "{{1}}, vamos encerrar seu pedido por enquanto. Se quiser retomar, é só responder esta mensagem: sua análise fica guardada para o próximo período.",
      botoes: [],
      papeis: ["CONSULTOR", "MATRICULA", "ADMIN"],
   },
];

export function templatePorId(id: string): TemplateMock | null {
   return TEMPLATES.find(t => t.id === id) ?? null;
}

/** Substitui `{{n}}` pelos valores na ordem de `variaveis`. Vazio fica marcado para bloquear o envio. */
export function preencher(t: TemplateMock, valores: Record<string, string | null | undefined>): { texto: string; faltando: string[] } {
   const faltando: string[] = [];
   const texto = t.corpo.replace(/\{\{(\d+)\}\}/g, (_, n: string) => {
      const nome = t.variaveis[Number(n) - 1];
      const v = valores[nome];
      if (v === null || v === undefined || v === "") {
         faltando.push(nome);
         return `[${nome}]`;
      }
      return v;
   });
   return { texto, faltando };
}
