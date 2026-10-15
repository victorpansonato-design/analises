/**
 * Matriz curricular: cada curso é oferecido em uma ou mais modalidades (a "oferta", com código
 * próprio) e cada oferta tem currículos. Só os ativos aparecem na busca; o detalhe traz as
 * disciplinas seriadas (por período) e os grupos sem série obrigatória (estágio, eletivas, TCC e
 * práticas extensionistas), que variam de currículo para currículo.
 */
import { z } from "zod";

export const MODALIDADES_MATRIZ = ["PRESENCIAL", "HIBRIDO", "EAD"] as const;
export const ModalidadeMatrizSchema = z.enum(MODALIDADES_MATRIZ);
export type ModalidadeMatriz = z.infer<typeof ModalidadeMatrizSchema>;

/** Só o presencial tem turno; híbrido e EAD não. */
export const TURNOS_MATRIZ = ["DIURNO", "NOTURNO"] as const;
export const TurnoMatrizSchema = z.enum(TURNOS_MATRIZ);
export type TurnoMatriz = z.infer<typeof TurnoMatrizSchema>;

export const TIPOS_GRUPO = ["ESTAGIO", "ELETIVAS", "TCC", "EXTENSAO"] as const;
export const TipoGrupoSchema = z.enum(TIPOS_GRUPO);
export type TipoGrupo = z.infer<typeof TipoGrupoSchema>;

export const ROTULO_MODALIDADE_MATRIZ: Record<ModalidadeMatriz, string> = { PRESENCIAL: "Presencial", HIBRIDO: "Híbrido", EAD: "EAD" };
export const ROTULO_TURNO_MATRIZ: Record<TurnoMatriz, string> = { DIURNO: "Diurno", NOTURNO: "Noturno" };
export const ROTULO_GRUPO: Record<TipoGrupo, string> = {
   ESTAGIO: "Estágio obrigatório",
   ELETIVAS: "Eletivas",
   TCC: "Trabalho de conclusão de curso",
   EXTENSAO: "Práticas extensionistas",
};

const IsoDia = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const DisciplinaCurriculoSchema = z.object({
   codigo: z.string(),
   nome: z.string(),
   ch: z.number().int().nonnegative(),
});
export type DisciplinaCurriculo = z.infer<typeof DisciplinaCurriculoSchema>;

export const DisciplinaSeriadaSchema = DisciplinaCurriculoSchema.extend({ periodo: z.number().int().positive() });
export type DisciplinaSeriada = z.infer<typeof DisciplinaSeriadaSchema>;

export const GrupoDisciplinasSchema = z.object({
   id: z.string(),
   tipo: TipoGrupoSchema,
   /** Primeiro período em que o aluno pode cursar o grupo; `null` quando não há restrição. */
   aPartirDoPeriodo: z.number().int().positive().nullable(),
   /** CH a cumprir dentro do grupo (eletivas: escolher entre as opções); `null` quando são todas. */
   chExigida: z.number().int().positive().nullable(),
   disciplinas: z.array(DisciplinaCurriculoSchema),
});
export type GrupoDisciplinas = z.infer<typeof GrupoDisciplinasSchema>;

export const CurriculoResumoSchema = z.object({
   id: z.string(),
   codigo: z.string(),
   /** Ex.: "Matriz 2026.1". */
   rotulo: z.string(),
   turno: TurnoMatrizSchema.nullable(),
   vigenciaInicio: IsoDia,
   ativo: z.boolean(),
   chTotal: z.number().int().nonnegative(),
   totalDisciplinas: z.number().int().nonnegative(),
});
export type CurriculoResumo = z.infer<typeof CurriculoResumoSchema>;

export const OfertaBaseSchema = z.object({
   id: z.string(),
   curso: z.string(),
   modalidade: ModalidadeMatrizSchema,
   /** Código do curso na modalidade (ver `codigoDoCurso`). */
   codigo: z.number().int().positive(),
});
export type OfertaBase = z.infer<typeof OfertaBaseSchema>;

export const OfertaMatrizSchema = OfertaBaseSchema.extend({
   /** Só currículos ativos. */
   curriculos: z.array(CurriculoResumoSchema),
   /** Quantos currículos inativos ficaram de fora. */
   inativos: z.number().int().nonnegative(),
});
export type OfertaMatriz = z.infer<typeof OfertaMatrizSchema>;

export const CurriculoSchema = CurriculoResumoSchema.extend({
   oferta: OfertaBaseSchema,
   periodos: z.number().int().positive(),
   horas: z.object({
      extensao: z.number().int().nonnegative(),
      complementares: z.number().int().nonnegative(),
      eletivas: z.number().int().nonnegative(),
   }),
   disciplinas: z.array(DisciplinaSeriadaSchema),
   grupos: z.array(GrupoDisciplinasSchema),
});
export type Curriculo = z.infer<typeof CurriculoSchema>;

export interface FiltroMatriz {
   q: string;
   modalidade: ModalidadeMatriz | null;
   /** Só vale com a modalidade presencial. */
   turno: TurnoMatriz | null;
}
