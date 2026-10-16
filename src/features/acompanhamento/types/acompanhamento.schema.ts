/**
 * Acompanhamento público do aluno (`GET /publico/acompanhamento/{token}`), sem login.
 * EXTENSÃO [VALIDAR com o TI]: a API devolve só o que o aluno precisa ver. Nada de etapa interna,
 * responsável, CPF, contato ou nome completo; o RA aparece só depois da matrícula.
 */
import { z } from "zod";

import { IsoDate, ModalidadeSchema, TipoSchema, TurnoSchema } from "@/features/casos";

/** Passos que o aluno enxerga. `RESULTADO` substitui proposta e matrícula no aproveitamento de estudos. */
export const PASSOS_PUBLICOS = ["RECEBIDA", "DOCUMENTOS", "ANALISE", "PROPOSTA", "MATRICULA", "RESULTADO"] as const;
export const PassoPublicoSchema = z.enum(PASSOS_PUBLICOS);
export type PassoPublico = z.infer<typeof PassoPublicoSchema>;

export const EstadoPassoSchema = z.enum(["FEITO", "ATUAL", "PROXIMO", "INTERROMPIDO"]);
export type EstadoPasso = z.infer<typeof EstadoPassoSchema>;

export const SituacaoPublicaSchema = z.enum(["EM_ANDAMENTO", "PAUSADO", "MATRICULADO", "CONCLUIDO", "ENCERRADO"]);
export type SituacaoPublica = z.infer<typeof SituacaoPublicaSchema>;

export const AcompanhamentoPublicoSchema = z.object({
   protocolo: z.string(),
   primeiroNome: z.string(),
   tipo: TipoSchema,
   curso: z.object({
      nome: z.string(),
      modalidade: ModalidadeSchema,
      turno: TurnoSchema,
      ciclo: z.string(),
   }),
   situacao: SituacaoPublicaSchema,
   /** A vez é do aluno: documentos pendentes ou proposta enviada esperando resposta. */
   aguardandoAluno: z.boolean(),
   passos: z.array(
      z.object({
         passo: PassoPublicoSchema,
         estado: EstadoPassoSchema,
         em: IsoDate.nullable(),
      }),
   ),
   /** Só depois da matrícula efetivada. */
   ra: z.string().nullable(),
   atualizadoEm: IsoDate,
});
export type AcompanhamentoPublico = z.infer<typeof AcompanhamentoPublicoSchema>;
