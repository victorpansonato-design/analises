/**
 * Código do curso por modalidade. O curso tem um código base (o presencial) e as outras
 * modalidades somam um deslocamento: Administração é 8 no presencial, 2008 no híbrido e 7008 no
 * EAD. [VALIDAR com a TI] regra informada pelo negócio; se o sistema acadêmico tiver exceções,
 * o código passa a vir do backend em vez de ser calculado.
 */
import type { ModalidadeMatriz } from "@/features/matriz-curricular/types/matriz.schema";

/** Deslocamento somado ao código base [parâmetro, docs/15]. */
export const DESLOCAMENTO_CODIGO: Record<ModalidadeMatriz, number> = { PRESENCIAL: 0, HIBRIDO: 2000, EAD: 7000 };

export function codigoDoCurso(base: number, modalidade: ModalidadeMatriz): number {
   return base + DESLOCAMENTO_CODIGO[modalidade];
}
