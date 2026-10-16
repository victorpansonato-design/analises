/**
 * Fonte única de tipos do domínio de casos (padrão do template: Zod primeiro, tipos derivados).
 * Espelha `contracts/openapi.yaml`. Se o contrato mudar, mude aqui junto.
 * Sem `enum` do TypeScript (o template usa `erasableSyntaxOnly`): listas `as const` + `z.enum`.
 */
import { z } from "zod";

import { PapelSchema } from "@/features/sessao";

// ── Etapas ─────────────────────────────────────────────────────────────────────────────────────
export const ETAPAS = [
   "RASCUNHO",
   "AGUARDANDO_DOCUMENTOS",
   "PRE_ANALISE",
   "EM_ANALISE",
   "AGUARDANDO_COORDENACAO",
   "AJUSTE_POS_COORDENACAO",
   "PRONTO_PARA_MATRICULA",
   "PROPOSTA_ENVIADA",
   "EM_NEGOCIACAO",
   "ADIADO",
   "MATRICULADO",
   "CONCLUIDO",
   "PERDIDO",
   "CANCELADO",
] as const;
export const EtapaSchema = z.enum(ETAPAS);
export type Etapa = z.infer<typeof EtapaSchema>;

/** `CONCLUIDO`: fim do aproveitamento de estudos (o aluno já é aluno; não há matrícula). */
export const ETAPAS_FINAIS = ["MATRICULADO", "CONCLUIDO", "PERDIDO", "CANCELADO"] as const satisfies readonly Etapa[];
/** Etapas que não são finais (inclui RASCUNHO e ADIADO). */
export const ETAPAS_ABERTAS = ETAPAS.filter(e => !(ETAPAS_FINAIS as readonly Etapa[]).includes(e));
/** Etapas que aparecem no funil e na fila (sem RASCUNHO e sem ADIADO). */
export const ETAPAS_DO_FUNIL = [
   "RASCUNHO",
   "AGUARDANDO_DOCUMENTOS",
   "PRE_ANALISE",
   "EM_ANALISE",
   "AGUARDANDO_COORDENACAO",
   "AJUSTE_POS_COORDENACAO",
   "PRONTO_PARA_MATRICULA",
   "PROPOSTA_ENVIADA",
   "EM_NEGOCIACAO",
   "ADIADO",
   "MATRICULADO",
   "CONCLUIDO",
   "PERDIDO",
   "CANCELADO",
] as const satisfies readonly Etapa[];

export const ROTULO_ETAPA: Record<Etapa, string> = {
   RASCUNHO: "Rascunho",
   AGUARDANDO_DOCUMENTOS: "Documentos",
   PRE_ANALISE: "Pré-análise",
   EM_ANALISE: "Em análise",
   AGUARDANDO_COORDENACAO: "Coordenação",
   AJUSTE_POS_COORDENACAO: "Ajuste",
   PRONTO_PARA_MATRICULA: "Pronto p/ matrícula",
   PROPOSTA_ENVIADA: "Proposta enviada",
   EM_NEGOCIACAO: "Em conversa",
   ADIADO: "Adiado",
   MATRICULADO: "Matriculado",
   CONCLUIDO: "Concluído",
   PERDIDO: "Perdido",
   CANCELADO: "Cancelado",
};

// ── Tipos de solicitação ───────────────────────────────────────────────────────────────────────
export const TIPOS = ["TRANSFERENCIA_EXTERNA", "PORTADOR_DIPLOMA", "TRANSFERENCIA_INTERNA", "RETORNO", "APROVEITAMENTO_ESTUDOS"] as const;
export const TipoSchema = z.enum(TIPOS);
export type Tipo = z.infer<typeof TipoSchema>;

export const ROTULO_TIPO: Record<Tipo, string> = {
   TRANSFERENCIA_EXTERNA: "Transf. externa",
   PORTADOR_DIPLOMA: "Portador de diploma",
   TRANSFERENCIA_INTERNA: "Transf. interna",
   RETORNO: "Retorno",
   APROVEITAMENTO_ESTUDOS: "Aproveitamento",
};

/** Tipos que terminam na análise concluída, sem proposta nem matrícula (decisão de 14/10/2026). */
export const TIPOS_SEM_MATRICULA = ["APROVEITAMENTO_ESTUDOS"] as const satisfies readonly Tipo[];

export function terminaNaAnalise(tipo: Tipo): boolean {
   return (TIPOS_SEM_MATRICULA as readonly Tipo[]).includes(tipo);
}

export const SubtipoRetornoSchema = z.enum(["SEM_VINCULO", "COM_VINCULO_ALTERACAO_CURRICULAR"]);
export type SubtipoRetorno = z.infer<typeof SubtipoRetornoSchema>;

// ── Ações (transições e ações sem mudança de etapa) ───────────────────────────────────────────
export const ACOES_DE_TRANSICAO = [
   "ENVIAR_PROTOCOLO",
   "DOCUMENTOS_COMPLETOS",
   "CONCLUIR_PRE_ANALISE",
   "FALHAR_PRE_ANALISE",
   "ENVIAR_COORDENACAO",
   "RESPONDER_COORDENACAO",
   "CONCLUIR_ANALISE",
   "ENVIAR_PROPOSTA",
   "REGISTRAR_RESPOSTA",
   "EFETIVAR_MATRICULA",
   "MARCAR_SEM_RETORNO",
   "ENCERRAR_PERDIDO",
   "CANCELAR",
   "ADIAR",
   "RETOMAR",
   "SOLICITAR_REANALISE",
   "REABRIR",
   "ALTERAR_DESTINO",
] as const;
export const AcaoTransicaoSchema = z.enum(ACOES_DE_TRANSICAO);
export type AcaoTransicao = z.infer<typeof AcaoTransicaoSchema>;

// ── Motivos padronizados ───────────────────────────────────────────────────────────────────────
export const MotivoPerdaSchema = z.enum([
   "FECHOU_OUTRA_IES",
   "FINANCEIRO",
   "APROVEITAMENTO_ABAIXO_DO_ESPERADO",
   "PRAZO_DE_CONCLUSAO",
   "HORARIO_TURNO",
   "MODALIDADE",
   "DESISTIU_DO_CURSO",
   "MUDANCA_DE_CIDADE",
   "SEM_RETORNO",
   "DOCUMENTACAO_INCOMPLETA",
   "NAO_ELEGIVEL",
   "INSATISFACAO_ATENDIMENTO",
   "OUTRO",
]);
export const MotivoCancelamentoSchema = z.enum(["DUPLICADO", "ABERTO_POR_ENGANO", "TESTE", "PEDIDO_DO_CANDIDATO_ANTES_DA_ANALISE"]);
export const MotivoReanaliseSchema = z.enum([
   "CANDIDATO_CONTESTOU_DISCIPLINA",
   "DOCUMENTO_NOVO",
   "MUDANCA_CURSO_TURNO",
   "ERRO_NA_ANALISE",
   "DECISAO_COORDENACAO_REVISTA",
   "OUTRO",
]);
export const MotivoAdiamentoSchema = z.enum(["PROXIMO_CICLO", "AGUARDANDO_RECURSO_FINANCEIRO", "AGUARDANDO_DOCUMENTO_IES_ORIGEM", "OUTRO"]);
export const TipoPendenciaSchema = z.enum(["EDITAL_DP", "VAGA", "DOCUMENTO_IES_ORIGEM", "DECISAO_ACADEMICA"]);

// ── Análise ────────────────────────────────────────────────────────────────────────────────────
export const DecisaoItemSchema = z.enum(["DISPENSA", "REGULAR", "DP", "ADAP"]);
export type DecisaoItem = z.infer<typeof DecisaoItemSchema>;
export const ConfiancaSchema = z.enum(["ALTA", "MEDIA", "BAIXA", "REGRA"]);
export const OrigemDecisaoSchema = z.enum(["IA", "REGRA", "ANALISTA", "COORDENACAO"]);
export const EstadoItemSchema = z.enum(["SUGERIDO", "DECIDIDO", "PERGUNTA_ABERTA", "RESPONDIDO"]);

// ── Documentos ─────────────────────────────────────────────────────────────────────────────────
export const StatusDocumentoSchema = z.enum(["PENDENTE", "RECEBIDO", "ACEITO", "RECUSADO", "DISPENSADO"]);
export const CanalDocumentoSchema = z.enum(["WHATSAPP", "LINK", "INTERNO", "CONSULTOR"]);

// ── Peças compartilhadas ───────────────────────────────────────────────────────────────────────
export const IsoDate = z.iso.datetime({ offset: true });

export const UsuarioResumoSchema = z.object({
   id: z.string(),
   nome: z.string(),
   papeis: z.array(PapelSchema).optional(),
});
export type UsuarioResumo = z.infer<typeof UsuarioResumoSchema>;

export const SlaSchema = z.object({
   venceEm: IsoDate.nullable(),
   alertaEm: IsoDate.nullable(),
   pausadoAte: IsoDate.nullable(),
});
export type Sla = z.infer<typeof SlaSchema>;

export const PendenciaExternaSchema = z.object({
   tipo: TipoPendenciaSchema,
   descricao: z.string().optional(),
   revisarEm: IsoDate,
});

export const TurnoSchema = z.enum(["MATUTINO", "VESPERTINO", "NOTURNO", "INTEGRAL"]);
export type Turno = z.infer<typeof TurnoSchema>;
export const ModalidadeSchema = z.enum(["PRESENCIAL", "SEMIPRESENCIAL", "EAD"]);
export type Modalidade = z.infer<typeof ModalidadeSchema>;

export const DestinoSchema = z.object({
   cursoId: z.string(),
   cursoNome: z.string(),
   turno: TurnoSchema,
   modalidade: ModalidadeSchema,
   matrizId: z.string().nullable(),
   ciclo: z.string(), // ex.: "2027.1"
});

// ── Linha da fila ──────────────────────────────────────────────────────────────────────────────
export const CasoResumoSchema = z.object({
   id: z.string(),
   protocolo: z.string(),
   tipo: TipoSchema,
   subtipo: SubtipoRetornoSchema.nullable(),
   etapa: EtapaSchema,
   etapaDesde: IsoDate,
   criadoEm: IsoDate,
   matriculado: z.boolean(),
   liberadoMatriculaEm: IsoDate.nullable(),
   candidato: z.object({ nome: z.string(), ra: z.string().nullable() }),
   destino: DestinoSchema,
   responsavel: UsuarioResumoSchema.nullable(),
   sla: SlaSchema,
   pendencia: PendenciaExternaSchema.nullable(),
   flags: z.object({
      ouvidoria: z.boolean(),
      escalado: z.boolean(),
      preAnaliseFalhou: z.boolean(),
   }),
   reanalises: z.number().int().nonnegative(),
   versao: z.number().int(),
});
export type CasoResumo = z.infer<typeof CasoResumoSchema>;

// ── Detalhe do caso ────────────────────────────────────────────────────────────────────────────
export const AcaoDisponivelSchema = z.object({
   acao: z.string(), // AcaoTransicao ou ação sem transição (ATRIBUIR, ADICIONAR_NOTA…)
   habilitada: z.boolean(),
   motivos: z.array(z.string()), // por que está desabilitada (texto pronto para a UI)
   exigeMotivo: z.boolean(),
});
export type AcaoDisponivel = z.infer<typeof AcaoDisponivelSchema>;

export const PassoJornadaSchema = z.object({
   etapa: EtapaSchema,
   entrouEm: IsoDate,
   saiuEm: IsoDate.nullable(),
   por: UsuarioResumoSchema.nullable(),
});

export const CasoDetalheSchema = CasoResumoSchema.extend({
   etapaAnterior: EtapaSchema.nullable(),
   candidato: z.object({
      pessoaId: z.string(),
      nome: z.string(),
      ra: z.string().nullable(),
      outroRa: z.string().nullable(),
      cpfMascarado: z.string(), // "***.123.456-**"
      celular: z.string().nullable(), // já mascarado pela API quando o papel não pode ver
      email: z.string().nullable(),
      optInWhatsapp: z.boolean(),
   }),
   origem: z.object({
      iesNome: z.string().nullable(),
      cursoNome: z.string().nullable(),
      estudouForaNoPeriodo: z.boolean().nullable(), // retorno sem vínculo
   }),
   ingresso: z.object({
      ano: z.number().int().nullable(),
      semestre: z.number().int().nullable(),
      periodo: z.number().int().nullable(),
   }),
   responsaveis: z.object({
      consultor: UsuarioResumoSchema.nullable(),
      analista: UsuarioResumoSchema.nullable(),
      coordenador: UsuarioResumoSchema.nullable(),
      matricula: UsuarioResumoSchema.nullable(),
   }),
   contadores: z.object({
      documentosObrigatorios: z.number().int(),
      documentosAceitos: z.number().int(),
      itensMatriz: z.number().int(),
      itensSemDecisao: z.number().int(),
      perguntasAbertas: z.number().int(),
   }),
   resumoCongeladoEm: IsoDate.nullable(),
   noGed: z.boolean(),
   jornada: z.array(PassoJornadaSchema),
   acoesDisponiveis: z.array(AcaoDisponivelSchema),
   /**
    * EXTENSÃO [VALIDAR com o TI]: token do link público de acompanhamento do aluno, gerado junto com
    * o protocolo (`/acompanhe/{token}`). Aleatório e não adivinhável; não é o id nem o protocolo.
    */
   tokenAcompanhamento: z.string().optional(),
   criadoEm: IsoDate,
   atualizadoEm: IsoDate,
});
export type CasoDetalhe = z.infer<typeof CasoDetalheSchema>;

// ── Funil ──────────────────────────────────────────────────────────────────────────────────────
export const FunilSchema = z.object({
   etapas: z.array(
      z.object({
         etapa: EtapaSchema,
         total: z.number().int(),
         atrasados: z.number().int(),
         emAtencao: z.number().int(),
      }),
   ),
   /**
    * EXTENSÃO [VALIDAR com o TI]: contagem por processo no mesmo recorte (ciclo e visão), sem o filtro
    * de processo, para as abas de processo. `emAndamento` exclui os encerrados.
    */
   processos: z
      .array(z.object({ processo: z.string(), total: z.number().int(), emAndamento: z.number().int(), atrasados: z.number().int() }))
      .optional(),
   atualizadoEm: IsoDate,
});
export type Funil = z.infer<typeof FunilSchema>;

// ── Fila (lista paginada por cursor) ───────────────────────────────────────────────────────────
export const VISOES = ["MINHA_VEZ", "EQUIPE", "TODOS"] as const;
export const VisaoSchema = z.enum(VISOES);
export type Visao = z.infer<typeof VisaoSchema>;

export const ROTULO_VISAO: Record<Visao, string> = { MINHA_VEZ: "Minha vez", EQUIPE: "Equipe", TODOS: "Todos" };

export const ORDENS = ["PRIORIDADE", "MAIS_ANTIGOS", "SLA", "NOME"] as const;
export const OrdemSchema = z.enum(ORDENS);
export type Ordem = z.infer<typeof OrdemSchema>;

export const ROTULO_ORDEM: Record<Ordem, string> = { PRIORIDADE: "Prioridade", MAIS_ANTIGOS: "Mais antigos", SLA: "Prazo", NOME: "Nome" };

export const PaginaCasosSchema = z.object({
   itens: z.array(CasoResumoSchema),
   total: z.number().int(),
   atrasados: z.number().int(),
   proximoCursor: z.string().nullable(),
});
export type PaginaCasos = z.infer<typeof PaginaCasosSchema>;

// ── Rótulos de exibição ────────────────────────────────────────────────────────────────────────
export const ROTULO_TURNO: Record<Turno, string> = {
   MATUTINO: "Matutino",
   VESPERTINO: "Vespertino",
   NOTURNO: "Noturno",
   INTEGRAL: "Integral",
};
export const SIGLA_TURNO: Record<Turno, string> = { MATUTINO: "M", VESPERTINO: "V", NOTURNO: "N", INTEGRAL: "I" };
export const ROTULO_MODALIDADE: Record<Modalidade, string> = { PRESENCIAL: "Presencial", SEMIPRESENCIAL: "Híbrido", EAD: "EAD" };

/** `{{2}}` dos templates enviados ao candidato (docs/08 §3). */
export const ROTULO_TIPO_CANDIDATO: Record<Tipo, string> = {
   TRANSFERENCIA_EXTERNA: "transferência",
   PORTADOR_DIPLOMA: "aproveitamento do seu diploma",
   TRANSFERENCIA_INTERNA: "troca de curso",
   RETORNO: "retorno ao curso",
   APROVEITAMENTO_ESTUDOS: "aproveitamento de estudos",
};

export const ROTULO_TIPO_COMPLETO: Record<Tipo, string> = {
   TRANSFERENCIA_EXTERNA: "Transferência externa",
   PORTADOR_DIPLOMA: "Portador de diploma",
   TRANSFERENCIA_INTERNA: "Transferência interna",
   RETORNO: "Retorno ao curso",
   APROVEITAMENTO_ESTUDOS: "Aproveitamento de estudos",
};

export const ROTULO_SUBTIPO_RETORNO: Record<SubtipoRetorno, string> = {
   SEM_VINCULO: "Sem vínculo",
   COM_VINCULO_ALTERACAO_CURRICULAR: "Com vínculo (alteração curricular)",
};

export type MotivoPerda = z.infer<typeof MotivoPerdaSchema>;
export type MotivoCancelamento = z.infer<typeof MotivoCancelamentoSchema>;
export type MotivoReanalise = z.infer<typeof MotivoReanaliseSchema>;
export type MotivoAdiamento = z.infer<typeof MotivoAdiamentoSchema>;
export type TipoPendencia = z.infer<typeof TipoPendenciaSchema>;
export type PendenciaExterna = z.infer<typeof PendenciaExternaSchema>;
export type Destino = z.infer<typeof DestinoSchema>;
export type PassoJornada = z.infer<typeof PassoJornadaSchema>;

export const ROTULO_MOTIVO_PERDA: Record<MotivoPerda, string> = {
   FECHOU_OUTRA_IES: "Fechou com outra instituição",
   FINANCEIRO: "Financeiro",
   APROVEITAMENTO_ABAIXO_DO_ESPERADO: "Aproveitamento abaixo do esperado",
   PRAZO_DE_CONCLUSAO: "Prazo de conclusão",
   HORARIO_TURNO: "Horário ou turno",
   MODALIDADE: "Modalidade",
   DESISTIU_DO_CURSO: "Desistiu do curso",
   MUDANCA_DE_CIDADE: "Mudança de cidade",
   SEM_RETORNO: "Sem retorno do candidato",
   DOCUMENTACAO_INCOMPLETA: "Documentação incompleta",
   NAO_ELEGIVEL: "Não elegível",
   INSATISFACAO_ATENDIMENTO: "Insatisfação com o atendimento",
   OUTRO: "Outro",
};

export const ROTULO_MOTIVO_CANCELAMENTO: Record<MotivoCancelamento, string> = {
   DUPLICADO: "Caso duplicado",
   ABERTO_POR_ENGANO: "Aberto por engano",
   TESTE: "Teste",
   PEDIDO_DO_CANDIDATO_ANTES_DA_ANALISE: "Pedido do candidato antes da análise",
};

export const ROTULO_MOTIVO_REANALISE: Record<MotivoReanalise, string> = {
   CANDIDATO_CONTESTOU_DISCIPLINA: "Candidato contestou disciplina",
   DOCUMENTO_NOVO: "Documento novo",
   MUDANCA_CURSO_TURNO: "Mudança de curso ou turno",
   ERRO_NA_ANALISE: "Erro na análise",
   DECISAO_COORDENACAO_REVISTA: "Decisão da coordenação revista",
   OUTRO: "Outro",
};

export const ROTULO_MOTIVO_ADIAMENTO: Record<MotivoAdiamento, string> = {
   PROXIMO_CICLO: "Próximo ciclo",
   AGUARDANDO_RECURSO_FINANCEIRO: "Aguardando recurso financeiro",
   AGUARDANDO_DOCUMENTO_IES_ORIGEM: "Aguardando documento da IES de origem",
   OUTRO: "Outro",
};

export const ROTULO_PENDENCIA: Record<TipoPendencia, string> = {
   EDITAL_DP: "Aguardando edital de DP",
   VAGA: "Aguardando confirmação de vaga",
   DOCUMENTO_IES_ORIGEM: "IES de origem ainda não emitiu o histórico",
   DECISAO_ACADEMICA: "Aguardando decisão acadêmica",
};

export const ROTULO_DECISAO: Record<DecisaoItem, string> = { DISPENSA: "Dispensa", REGULAR: "Regular", DP: "DP", ADAP: "ADAP" };

// ── Entradas de mutação ────────────────────────────────────────────────────────────────────────
export const CanalAceiteSchema = z.enum(["WHATSAPP", "TELEFONE", "PRESENCIAL", "EMAIL"]);
export type CanalAceite = z.infer<typeof CanalAceiteSchema>;
export const ROTULO_CANAL_ACEITE: Record<CanalAceite, string> = {
   WHATSAPP: "WhatsApp",
   TELEFONE: "Telefone",
   PRESENCIAL: "Presencial",
   EMAIL: "E-mail",
};

/**
 * Reabertura da análise (SOLICITAR_REANALISE): volta para a equipe de análises ou direto para a
 * coordenação do curso, com as disciplinas que o aluno contestou (decisão de 15/10/2026).
 */
export const DESTINOS_REANALISE = ["ANALISE", "COORDENACAO"] as const;
export type DestinoReanalise = (typeof DESTINOS_REANALISE)[number];
export const ROTULO_DESTINO_REANALISE: Record<DestinoReanalise, string> = {
   ANALISE: "Equipe de análises",
   COORDENACAO: "Coordenação do curso",
};

export interface EntradaTransicao {
   acao: AcaoTransicao;
   motivo?: string;
   texto?: string;
   retomarEm?: string;
   aceite?: { canal: CanalAceite; em: string };
   novoDestino?: Destino;
   /** EXTENSÃO [VALIDAR com o TI]: destino da reabertura e disciplinas contestadas. */
   destinoReanalise?: DestinoReanalise;
   itemIds?: string[];
}

export const EdicaoCasoSchema = z.object({
   nome: z.string().min(3, "Informe o nome completo").optional(),
   celular: z.string().optional(),
   email: z.union([z.literal(""), z.email("E-mail inválido")]).optional(),
   optInWhatsapp: z.boolean().optional(),
   outroRa: z.string().optional(),
   origem: z.object({ iesId: z.string().optional(), iesNome: z.string().optional(), cursoNome: z.string().optional() }).optional(),
   ingresso: z.object({ ano: z.number().int().optional(), semestre: z.number().int().optional() }).optional(),
});
export type EdicaoCaso = z.infer<typeof EdicaoCasoSchema>;

export const FlagsEntradaSchema = z.object({
   ouvidoria: z.boolean().optional(),
   escalado: z.boolean().optional(),
   pendencia: PendenciaExternaSchema.nullable().optional(),
   justificativa: z.string().optional(),
});
export type FlagsEntrada = z.infer<typeof FlagsEntradaSchema>;

// ── Catálogos ──────────────────────────────────────────────────────────────────────────────────
export const CursoSchema = z.object({
   id: z.string(),
   nome: z.string(),
   turnos: z.array(TurnoSchema),
   modalidades: z.array(ModalidadeSchema),
   coordenador: UsuarioResumoSchema,
   vagasDisponiveis: z.number().int().nullable(),
});
export type Curso = z.infer<typeof CursoSchema>;

export const MatrizResumoSchema = z.object({
   id: z.string(),
   cursoId: z.string(),
   codigo: z.string(),
   vigente: z.boolean(),
   chTotal: z.number(),
   periodos: z.number().int(),
   atividadesComplementaresExigidas: z.number(),
   praticaExtensionistaExigida: z.number(),
});
export type MatrizResumo = z.infer<typeof MatrizResumoSchema>;
