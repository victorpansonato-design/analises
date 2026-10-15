/**
 * Gestão comercial: rendimento e metas da equipe de vendas num mês (`GET /gestao/equipe?mes=`).
 * EXTENSÃO do contrato [VALIDAR com o TI]: ainda não está em contracts/openapi.yaml.
 *
 * - `matriculasPorDia` tem um valor por dia do mês até hoje (mês corrente) ou até o fim (mês fechado).
 * - Conversão sempre com denominador: matrículas ÷ análises concluídas no mês.
 * - `versao` da meta protege a edição concorrente (`If-Match`): duas gestoras não se sobrescrevem.
 */
import { z } from "zod";

import { EtapaSchema, IsoDate } from "@/features/casos";

export const MesSchema = z.string().regex(/^\d{4}-\d{2}$/);

export const ConsultorDesempenhoSchema = z.object({
   id: z.string(),
   nome: z.string(),
   meta: z.number().int().nonnegative(),
   versaoMeta: z.number().int(),
   matriculas: z.number().int().nonnegative(),
   matriculasPorDia: z.array(z.number().int().nonnegative()),
   protocolosAbertos: z.number().int().nonnegative(),
   propostasEnviadas: z.number().int().nonnegative(),
   analisesConcluidas: z.number().int().nonnegative(),
   /** Mediana em horas úteis entre a análise concluída e a proposta enviada. */
   primeiroContatoHoras: z.number().nullable(),
   carteira: z.array(z.object({ etapa: EtapaSchema, total: z.number().int().nonnegative() })),
   historico: z.array(z.object({ mes: MesSchema, meta: z.number().int(), matriculas: z.number().int() })),
});
export type ConsultorDesempenho = z.infer<typeof ConsultorDesempenhoSchema>;

export const EquipeSchema = z.object({
   mes: MesSchema,
   /** Meses que a API aceita, do mais recente ao mais antigo. */
   mesesDisponiveis: z.array(MesSchema).min(1),
   consultores: z.array(ConsultorDesempenhoSchema),
   geradoEm: IsoDate,
});
export type Equipe = z.infer<typeof EquipeSchema>;

export const MetaEntradaSchema = z.object({
   consultorId: z.string(),
   mes: MesSchema,
   meta: z.number().int().min(0).max(200),
   versao: z.number().int(),
});
export type MetaEntrada = z.infer<typeof MetaEntradaSchema>;

export const ABAS_GESTAO = ["indicadores", "equipe"] as const;
export const AbaGestaoSchema = z.enum(ABAS_GESTAO);
export type AbaGestao = z.infer<typeof AbaGestaoSchema>;

export const SITUACOES_META = ["ATINGIDA", "NO_RITMO", "ATENCAO", "ABAIXO", "NAO_ATINGIDA", "SEM_META"] as const;
export type SituacaoMeta = (typeof SITUACOES_META)[number];

export const ROTULO_SITUACAO: Record<SituacaoMeta, string> = {
   ATINGIDA: "Meta atingida",
   NO_RITMO: "No ritmo",
   ATENCAO: "Atenção",
   ABAIXO: "Abaixo do ritmo",
   NAO_ATINGIDA: "Meta não atingida",
   SEM_META: "Sem meta",
};
