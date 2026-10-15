/**
 * Análise curricular (docs/06 e docs/07). Espelha `contracts/openapi.yaml` (Analise, ItemAnalise,
 * ItemOrigem, ResumoAnalise, PreAnalise). A IA SUGERE; só a pessoa DECIDE: `sugestao` e `decisao`
 * são campos separados e a interface nunca chama sugestão de decisão.
 */
import { z } from "zod";

import {
   ConfiancaSchema,
   DecisaoItemSchema,
   EstadoItemSchema,
   IsoDate,
   MatrizResumoSchema,
   OrigemDecisaoSchema,
   UsuarioResumoSchema,
   type DecisaoItem,
} from "@/features/casos";

export type Confianca = z.infer<typeof ConfiancaSchema>;
export type EstadoItem = z.infer<typeof EstadoItemSchema>;
export type OrigemDecisao = z.infer<typeof OrigemDecisaoSchema>;

export const MotivoAlteracaoSchema = z.enum(["CH_INSUFICIENTE", "CONTEUDO_DIVERGENTE", "NOTA_REPROVACAO", "PRAZO_VALIDADE", "OUTRO"]);
export type MotivoAlteracao = z.infer<typeof MotivoAlteracaoSchema>;

export const ROTULO_MOTIVO_ALTERACAO: Record<MotivoAlteracao, string> = {
   CH_INSUFICIENTE: "CH insuficiente",
   CONTEUDO_DIVERGENTE: "Conteúdo divergente",
   NOTA_REPROVACAO: "Nota ou reprovação",
   PRAZO_VALIDADE: "Prazo de validade",
   OUTRO: "Outro",
};

export const ROTULO_CONFIANCA: Record<Confianca, string> = { ALTA: "Alta", MEDIA: "Média", BAIXA: "Baixa", REGRA: "Regra" };
export const ROTULO_ORIGEM_DECISAO: Record<OrigemDecisao, string> = {
   IA: "sugestão da IA confirmada",
   REGRA: "regra de equivalência",
   ANALISTA: "analista",
   COORDENACAO: "coordenação",
};

export const SituacaoOrigemSchema = z.enum(["APROVADO", "REPROVADO", "CURSANDO", "DISPENSADO", "OUTRO"]);
export const ROTULO_SITUACAO_ORIGEM: Record<z.infer<typeof SituacaoOrigemSchema>, string> = {
   APROVADO: "Aprovado",
   REPROVADO: "Reprovado",
   CURSANDO: "Cursando",
   DISPENSADO: "Dispensado",
   OUTRO: "Outro",
};

export const ItemOrigemSchema = z.object({
   id: z.string(),
   /** EXTENSÃO [VALIDAR com o TI]: código da disciplina como aparece no histórico de origem. */
   codigo: z.string().nullable().optional(),
   nome: z.string(),
   ies: z.string().nullable(),
   ch: z.number(),
   nota: z.number().nullable(),
   ano: z.number().int().nullable(),
   semestre: z.number().int().nullable(),
   situacao: SituacaoOrigemSchema,
   confiancaExtracao: z.number().min(0).max(1).nullable(),
   usadaEm: z.array(z.string()),
});
export type ItemOrigem = z.infer<typeof ItemOrigemSchema>;

export const SugestaoSchema = z.object({
   decisao: DecisaoItemSchema,
   origemIds: z.array(z.string()),
   confianca: ConfiancaSchema,
   fonte: z.enum(["IA", "REGRA"]),
   justificativa: z.string().optional(),
   alertas: z.array(z.string()).optional(),
});
export type Sugestao = z.infer<typeof SugestaoSchema>;

export const DecisaoSchema = z.object({
   valor: DecisaoItemSchema,
   origemIds: z.array(z.string()),
   origem: OrigemDecisaoSchema,
   motivoAlteracao: MotivoAlteracaoSchema.nullable().optional(),
   por: UsuarioResumoSchema,
   em: IsoDate,
});
export type Decisao = z.infer<typeof DecisaoSchema>;

export const RespostaCoordenacaoSchema = z.object({
   decisao: DecisaoItemSchema,
   comentario: z.string().nullable(),
   usarComoRegra: z.boolean(),
   por: UsuarioResumoSchema,
   em: IsoDate,
});

export const PerguntaSchema = z.object({
   texto: z.string(),
   decisaoSugerida: DecisaoItemSchema,
   por: UsuarioResumoSchema,
   em: IsoDate,
   resposta: RespostaCoordenacaoSchema.nullable(),
});
export type Pergunta = z.infer<typeof PerguntaSchema>;

/** EXTENSÃO [VALIDAR com o TI]: contestação do aluno registrada na reabertura da análise. */
export const ContestacaoSchema = z.object({
   texto: z.string(),
   por: UsuarioResumoSchema,
   em: IsoDate,
});
export type Contestacao = z.infer<typeof ContestacaoSchema>;

export const ItemAnaliseSchema = z.object({
   id: z.string(),
   periodo: z.number().int().nullable(),
   disciplina: z.string(),
   codigo: z.string().optional(),
   ch: z.number(),
   estado: EstadoItemSchema,
   sugestao: SugestaoSchema.nullable(),
   decisao: DecisaoSchema.nullable(),
   pergunta: PerguntaSchema.nullable().optional(),
   /** Ementa resumida (para a comparação lado a lado). */
   ementa: z.string().nullable().optional(),
   contestacao: ContestacaoSchema.nullable().optional(),
});
export type ItemAnalise = z.infer<typeof ItemAnaliseSchema>;

const HorasSchema = z.object({ horas: z.number(), exigidas: z.number() });

export const ResumoAnaliseSchema = z.object({
   chTotalMatriz: z.number(),
   chDispensada: z.number(),
   contagem: z.object({
      dispensa: z.number().int(),
      regular: z.number().int(),
      dp: z.number().int(),
      adap: z.number().int(),
      pendentes: z.number().int(),
      perguntas: z.number().int(),
   }),
   periodoIngressoSugerido: z.number().int().nullable(),
   periodoIngresso: z.number().int().nullable(),
   /** Estimativa: sempre exibida com a palavra "estimativa". */
   previsaoSemestres: z.number().int().nullable(),
   atividadesComplementares: HorasSchema,
   praticaExtensionista: HorasSchema,
   bloqueios: z.array(z.object({ mensagem: z.string(), itemId: z.string().nullable() })),
});
export type ResumoAnalise = z.infer<typeof ResumoAnaliseSchema>;

export const AtividadeComplementarSchema = z.object({
   id: z.string(),
   atividade: z.string(),
   ch: z.number(),
   ano: z.number().int().nullable(),
   periodo: z.number().int().nullable(),
   inicio: z.string().nullable(),
   fim: z.string().nullable(),
});
export type AtividadeComplementar = z.infer<typeof AtividadeComplementarSchema>;

export const PraticaExtensionistaSchema = z.object({ id: z.string(), descricao: z.string().nullable(), ch: z.number() });
export type PraticaExtensionista = z.infer<typeof PraticaExtensionistaSchema>;

export const AnaliseSchema = z.object({
   matriz: MatrizResumoSchema,
   itens: z.array(ItemAnaliseSchema),
   origem: z.array(ItemOrigemSchema),
   atividadesComplementares: z.array(AtividadeComplementarSchema),
   praticaExtensionista: z.array(PraticaExtensionistaSchema),
   disciplinasPersonalizadasPos: z.array(z.object({ id: z.string(), nome: z.string() })),
   resumo: ResumoAnaliseSchema,
   versao: z.number().int(),
});
export type Analise = z.infer<typeof AnaliseSchema>;

export const ItemDecididoSchema = z.object({ item: ItemAnaliseSchema, resumo: ResumoAnaliseSchema, versao: z.number().int() });
export type ItemDecidido = z.infer<typeof ItemDecididoSchema>;

export const PreAnaliseSchema = z.object({
   status: z.enum(["PENDENTE", "PROCESSANDO", "CONCLUIDA", "FALHOU"]),
   iniciadaEm: IsoDate.nullable(),
   concluidaEm: IsoDate.nullable(),
   modelo: z.string().nullable(),
   cobertura: z.object({ sugeridos: z.number().int(), total: z.number().int() }),
   avisos: z.array(z.string()),
   erro: z.string().nullable(),
   /**
    * EXTENSÃO do contrato [VALIDAR com o TI]: itens sem decisão que ganharam sugestão nova na última
    * reexecução ("Há sugestões novas"). Decisões confirmadas nunca são sobrescritas.
    */
   sugestoesNovas: z.number().int().nullable().optional(),
});
export type PreAnalise = z.infer<typeof PreAnaliseSchema>;
export type StatusPreAnalise = PreAnalise["status"];

/**
 * Decisão em lote. `REVERTER` é EXTENSÃO do contrato [VALIDAR com o TI]: devolve os itens para
 * `SUGERIDO` (sem decisão) e sustenta o "Desfazer" de 10 s das ações em lote.
 */
export const ModoLoteSchema = z.enum(["ACEITAR_SUGESTOES_ALTA", "DEFINIR", "REVERTER"]);
export type ModoLote = z.infer<typeof ModoLoteSchema>;

export interface LoteEntrada {
   modo: ModoLote;
   itemIds?: string[];
   decisao?: DecisaoItem;
}

export interface PerguntaEntrada {
   texto: string;
   decisaoSugerida: DecisaoItem;
}

export interface RespostaEntrada {
   decisao: DecisaoItem;
   comentario?: string;
   usarComoRegra: boolean;
}

export interface AtividadeEntrada {
   atividadeId: string;
   ch: number;
   ano?: number;
   periodo?: number;
   inicio?: string;
   fim?: string;
}

export interface PraticaEntrada {
   ch: number;
   descricao?: string;
}

/** EXTENSÃO do contrato [VALIDAR com o TI]: prévia de "Trocar matriz" (GET .../analise/previa-matriz). */
export const PreviaMatrizSchema = z.object({
   mapeadas: z.number().int(),
   revisar: z.number().int(),
   semCorrespondencia: z.number().int(),
});
export type PreviaMatriz = z.infer<typeof PreviaMatrizSchema>;

/**
 * Catálogo de atividades complementares (`atividadeId` do contrato). [VALIDAR com a Secretaria]: a
 * lista real vem do sistema acadêmico; estes são os tipos que aparecem nas análises de hoje.
 */
export const ATIVIDADES_COMPLEMENTARES = [
   { id: "CURSO_LIVRE", nome: "Curso livre de extensão" },
   { id: "MONITORIA", nome: "Monitoria" },
   { id: "CONGRESSO", nome: "Congresso acadêmico" },
   { id: "VOLUNTARIADO", nome: "Voluntariado" },
   { id: "INICIACAO_CIENTIFICA", nome: "Iniciação científica" },
   { id: "ESTAGIO_NAO_OBRIGATORIO", nome: "Estágio não obrigatório" },
   { id: "OUTRA", nome: "Outra atividade" },
] as const;

export interface DecisaoEntrada {
   valor: DecisaoItem;
   origemIds?: string[];
   motivoAlteracao?: MotivoAlteracao;
}

/** Itens que contam como decididos para concluir a análise (RESPONDIDO conta, docs/06 §2). */
export function itemDecidido(item: Pick<ItemAnalise, "estado">): boolean {
   return item.estado === "DECIDIDO" || item.estado === "RESPONDIDO";
}
