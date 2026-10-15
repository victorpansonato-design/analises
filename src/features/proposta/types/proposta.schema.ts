/**
 * Proposta (docs/05 §3.4 aba Proposta e docs/03 ENVIAR_PROPOSTA/EFETIVAR_MATRICULA). O resumo é o
 * CONGELADO em `CONCLUIR_ANALISE`: nenhum número chega ao candidato antes disso.
 */
import { z } from "zod";

import { ResumoAnaliseSchema } from "@/features/analise";
import { CanalAceiteSchema, IsoDate, UsuarioResumoSchema } from "@/features/casos";

export const TipoRespostaSchema = z.enum(["INTERESSE", "SEM_INTERESSE", "DUVIDA"]);
export type TipoResposta = z.infer<typeof TipoRespostaSchema>;

export const ROTULO_TIPO_RESPOSTA: Record<TipoResposta, string> = {
   INTERESSE: "Tem interesse",
   DUVIDA: "Tem dúvidas",
   SEM_INTERESSE: "Sem interesse",
};

export const FinanceiroSchema = z.object({
   mensalidade: z.number(),
   descontoPercentual: z.number().nullable(),
   bolsa: z.string().nullable(),
   parcelas: z.number().int().nullable(),
   validadeAte: z.string().nullable(),
   observacao: z.string().nullable(),
});
export type Financeiro = z.infer<typeof FinanceiroSchema>;

export const PropostaSchema = z.object({
   resumo: ResumoAnaliseSchema.nullable(),
   congeladoEm: IsoDate.nullable(),
   /** `null` quando ainda não carregou ou quando o papel não pode ver (docs/04 §3). */
   financeiro: FinanceiroSchema.nullable(),
   pendenciaFinanceiraAnterior: z.boolean().nullable(),
   resposta: z.object({ tipo: TipoRespostaSchema, em: IsoDate, canal: z.string() }).nullable(),
   aceite: z.object({ canal: z.string(), em: IsoDate, por: UsuarioResumoSchema }).nullable(),
   pdfUrl: z.string().nullable(),
   enviadaEm: IsoDate.nullable().optional(),
});
export type Proposta = z.infer<typeof PropostaSchema>;

// ── Ações da aba (abrem pela URL `?acao=`, docs do integrador) ────────────────────────────────
export const AcaoPropostaSchema = z.enum(["ENVIAR_PROPOSTA", "REGISTRAR_RESPOSTA", "EFETIVAR_MATRICULA"]);
export type AcaoProposta = z.infer<typeof AcaoPropostaSchema>;

/** Prévia do template (contrato `POST /casos/{id}/mensagens/previa`). */
export const PreviaPropostaSchema = z.object({
   texto: z.string(),
   variaveisFaltando: z.array(z.string()),
   botoes: z.array(z.string()).optional(),
});
export type PreviaProposta = z.infer<typeof PreviaPropostaSchema>;

// ── Formulários (RHF + Zod) ────────────────────────────────────────────────────────────────────
export const RespostaFormSchema = z.object({
   tipo: TipoRespostaSchema.nullable().refine(v => v !== null, "Escolha a resposta do candidato"),
   texto: z.string().trim().max(500, "Use no máximo 500 caracteres"),
});
export type RespostaForm = z.output<typeof RespostaFormSchema>;
export type RespostaFormEntrada = z.input<typeof RespostaFormSchema>;

/**
 * Aceite: canal + quando o candidato aceitou. A data não pode ser futura (é registro de algo que já
 * aconteceu). `agora` entra por parâmetro para o teste não depender do relógio.
 */
export function aceiteFormSchema(agora: () => Date = () => new Date()) {
   return z.object({
      canal: CanalAceiteSchema.nullable().refine(v => v !== null, "Escolha por onde o candidato aceitou"),
      em: z
         .string()
         .refine(v => !Number.isNaN(new Date(v).getTime()), "Informe data e hora do aceite")
         .refine(v => new Date(v).getTime() <= agora().getTime() + 60_000, "O aceite não pode estar no futuro"),
   });
}
export type AceiteForm = z.output<ReturnType<typeof aceiteFormSchema>>;
export type AceiteFormEntrada = z.input<ReturnType<typeof aceiteFormSchema>>;
