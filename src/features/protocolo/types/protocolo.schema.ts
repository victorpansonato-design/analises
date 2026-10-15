/**
 * Novo protocolo (docs/05 §4): uma tela, meta de menos de 1 minuto. O CPF puxa o que já se sabe da
 * pessoa e detecta o tipo provável e caso duplicado. Espelha `NovoProtocolo` e `LookupPessoa`.
 */
import { z } from "zod";

import { CasoResumoSchema, DestinoSchema, ModalidadeSchema, SubtipoRetornoSchema, TipoSchema, TurnoSchema } from "@/features/casos";

/** Dígito verificador do CPF (valida o formato; não diz se o CPF existe). */
export function cpfValido(valor: string): boolean {
   const d = valor.replace(/\D/g, "");
   if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
   const calc = (n: number) => {
      let soma = 0;
      for (let i = 0; i < n; i++) soma += Number(d[i]) * (n + 1 - i);
      const resto = (soma * 10) % 11;
      return resto === 10 ? 0 : resto;
   };
   return calc(9) === Number(d[9]) && calc(10) === Number(d[10]);
}

/** Celular brasileiro com DDD (10 ou 11 dígitos). */
export function celularValido(valor: string): boolean {
   const d = valor.replace(/\D/g, "");
   return d.length === 11 || d.length === 10;
}

export const VinculoSchema = z.enum(["NENHUM", "ALUNO_ATIVO", "EX_ALUNO", "FORMADO"]);
export type Vinculo = z.infer<typeof VinculoSchema>;

export const LookupPessoaSchema = z.object({
   encontrada: z.boolean(),
   pessoa: z
      .object({
         pessoaId: z.string(),
         nome: z.string(),
         celular: z.string().nullable(),
         email: z.string().nullable(),
         ra: z.string().nullable(),
      })
      .nullable(),
   vinculo: VinculoSchema,
   tipoSugerido: TipoSchema.nullable(),
   casosAtivos: z.array(CasoResumoSchema),
   dadosVestibular: z.record(z.string(), z.unknown()).nullable(),
});
export type LookupPessoa = z.infer<typeof LookupPessoaSchema>;

/** Formulário do drawer (RHF + Zod). */
export const NovoProtocoloFormSchema = z
   .object({
      cpf: z.string().refine(cpfValido, "CPF inválido. Confira os 11 dígitos."),
      nome: z.string().trim().min(3, "Informe o nome completo"),
      celular: z.string().refine(celularValido, "Informe o celular com DDD"),
      email: z.union([z.literal(""), z.email("E-mail inválido")]),
      optInWhatsapp: z.boolean(),
      tipo: TipoSchema,
      subtipo: SubtipoRetornoSchema.nullable(),
      estudouForaNoPeriodo: z.boolean().nullable(),
      cursoId: z.string().min(1, "Escolha o curso de destino"),
      turno: TurnoSchema.nullable(),
      modalidade: ModalidadeSchema.nullable(),
      /** IES escolhida no autocomplete (`null` quando digitada à mão). */
      iesId: z.string().nullable().optional(),
      iesNome: z.string(),
      cursoOrigemNome: z.string(),
   })
   .superRefine((v, ctx) => {
      if (!v.turno) ctx.addIssue({ code: "custom", path: ["turno"], message: "Escolha o turno" });
      if (!v.modalidade) ctx.addIssue({ code: "custom", path: ["modalidade"], message: "Escolha a modalidade" });
      const precisaOrigem = v.tipo === "TRANSFERENCIA_EXTERNA" || v.tipo === "PORTADOR_DIPLOMA" || v.tipo === "APROVEITAMENTO_ESTUDOS";
      if (precisaOrigem && v.iesNome.trim().length < 2)
         ctx.addIssue({ code: "custom", path: ["iesNome"], message: "Informe a instituição de origem" });
      if (v.tipo === "RETORNO" && !v.subtipo)
         ctx.addIssue({ code: "custom", path: ["subtipo"], message: "Diga se o retorno é com ou sem vínculo" });
   });
export type NovoProtocoloForm = z.infer<typeof NovoProtocoloFormSchema>;

/** Corpo do `POST /casos` (contrato `NovoProtocolo`). */
export const NovoProtocoloSchema = z.object({
   cpf: z.string().regex(/^\d{11}$/),
   nome: z.string(),
   celular: z.string(),
   email: z.string().nullable(),
   optInWhatsapp: z.boolean(),
   tipo: TipoSchema,
   subtipo: SubtipoRetornoSchema.nullable(),
   estudouForaNoPeriodo: z.boolean().nullable(),
   destino: DestinoSchema,
   origem: z.object({ iesId: z.string().nullable(), iesNome: z.string().nullable(), cursoNome: z.string().nullable() }),
   enviar: z.boolean(),
});
export type NovoProtocolo = z.infer<typeof NovoProtocoloSchema>;
