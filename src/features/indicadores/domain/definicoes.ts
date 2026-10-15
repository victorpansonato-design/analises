/**
 * Definição de cada indicador (docs/10 §2–§5 e docs/07 §4), mostrada no `Hint` do cartão: nenhuma
 * métrica ambígua fica sem definição e nenhuma definição ocupa espaço permanente (DS §10.16).
 */
import type { Indicador } from "@/features/indicadores/types/indicadores.schema";

export const DEFINICAO: Record<string, string> = {
   "lead-time":
      "Mediana do tempo entre o protocolo e a análise concluída (chegada a Pronto para matrícula), sobre os casos com análise concluída.",
   "tempo-etapa": "Mediana do tempo que os casos passaram em cada etapa até sair dela, sem pausas. O cartão mostra a etapa mais lenta.",
   "sla-cumprido":
      "Saídas de etapa dentro do prazo da etapa ÷ saídas de etapa. A pré-análise fica fora: é automação, medida no grupo da IA.",
   "atrasados-agora": "Casos ativos com o prazo da etapa estourado agora ÷ casos ativos. É a mesma conta do funil.",
   "idade-ativos": "Mediana do tempo desde a abertura dos casos ativos, com a distribuição por faixa de idade.",
   "documentos-completos": "Mediana do tempo entre a abertura do caso e os documentos completos.",
   "primeiro-contato": "Mediana do tempo entre a análise concluída e a proposta enviada (primeiro contato da matrícula).",
   conversao:
      "Matriculados ÷ casos que chegaram a Pronto para matrícula, por coorte de conclusão da análise. Nunca matrículas da semana ÷ prontos da semana.",
   "conversao-tipo": "Conversão análise → matrícula separada por tipo de solicitação. Mesma coorte do indicador geral.",
   "conversao-curso": "Conversão análise → matrícula separada por curso de destino. Mesma coorte do indicador geral.",
   "conversao-responsavel": "Conversão análise → matrícula separada pela pessoa da matrícula responsável pelo caso.",
   perdas: "Perdidos ÷ casos encerrados com desfecho (matriculados e perdidos), com a distribuição dos motivos de perda registrados.",
   reanalise: "Casos com pelo menos uma reanálise ÷ análises concluídas.",
   aproveitamento: "Carga horária dispensada ÷ carga horária das matrizes, somadas sobre as análises concluídas.",
   "toques-consultor": "Ações manuais do consultor (mensagens, notas, ligações, documentos) ÷ casos com análise concluída.",
   "toques-humanos": "Ações de pessoas da equipe até a análise concluída ÷ casos com análise concluída.",
   transferencias: "Trocas de responsável depois da primeira atribuição ÷ casos com análise concluída.",
   "perguntas-coordenacao": "Itens enviados à coordenação ÷ casos com análise concluída.",
   lembretes: "Lembretes de documentos enviados ao candidato ÷ casos com documentos completos.",
   "recusas-documento": "Documentos recusados na avaliação, por motivo de recusa.",
   "taxa-resposta": "Respostas ÷ pesquisas enviadas no dia seguinte à matrícula.",
   ces: 'Respostas 4 ou 5 ÷ respostas à pergunta "quão fácil foi enviar seus documentos e entender sua análise?" (1 a 5).',
   csat: 'Respostas 4 ou 5 ÷ respostas à pergunta "como avalia o atendimento até a matrícula?" (1 a 5).',
   "o-que-facilitar": 'Comentários da pergunta aberta "o que poderia ter sido mais fácil?", categorizados.',
   "ia-aceite": "Sugestões com decisão final igual à sugerida ÷ sugestões já decididas.",
   "ia-alteracao": "Sugestões alteradas na análise ÷ sugestões decididas, por motivo da alteração.",
   "ia-cobertura": "Itens da matriz com sugestão (IA ou regra da base) ÷ itens das matrizes analisadas.",
   "ia-tempo": "Mediana da duração das execuções da pré-análise.",
   "ia-falhas": "Execuções da pré-análise que falharam ÷ execuções.",
};

export function definicaoDe(i: Pick<Indicador, "id" | "numeradorRotulo" | "denominadorRotulo">): string {
   const conhecida = DEFINICAO[i.id];
   if (conhecida) return conhecida;
   if (i.numeradorRotulo && i.denominadorRotulo) return `${i.numeradorRotulo} ÷ ${i.denominadorRotulo}.`;
   return i.denominadorRotulo ? `Calculado sobre ${i.denominadorRotulo}.` : "Sem definição publicada.";
}
