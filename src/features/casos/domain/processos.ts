/**
 * Processos: o primeiro recorte da tela de análises (decisão de 14/10/2026). Cada processo junta
 * tipos de solicitação que a equipe trata do mesmo jeito; as filas de etapa ficam dentro dele.
 *
 * - Ingresso: transferência externa, portador de diploma e retorno ao curso, juntos.
 * - Transferência interna: troca de curso de quem já é aluno.
 * - Aproveitamento de estudos: dispensa para quem já é aluno; termina na análise (sem matrícula),
 *   por isso a fila "Liberadas matrícula" não existe nele.
 */
import { FILAS } from "@/features/casos/domain/filas";
import { TIPOS, terminaNaAnalise, type Tipo } from "@/features/casos/types/caso.schema";

export const PROCESSOS = [
   {
      id: "INGRESSO",
      nome: "Ingresso",
      detalhe: "Externa, portador de diploma e retorno",
      tom: "ingresso",
      tipos: ["TRANSFERENCIA_EXTERNA", "PORTADOR_DIPLOMA", "RETORNO"],
   },
   {
      id: "TRANSFERENCIA_INTERNA",
      nome: "Transferência interna",
      detalhe: "Troca de curso de quem já é aluno",
      tom: "interna",
      tipos: ["TRANSFERENCIA_INTERNA"],
   },
   {
      id: "APROVEITAMENTO",
      nome: "Aproveitamento de estudos",
      detalhe: "Dispensas para quem já é aluno",
      tom: "aproveitamento",
      tipos: ["APROVEITAMENTO_ESTUDOS"],
   },
] as const satisfies readonly { id: string; nome: string; detalhe: string; tom: string; tipos: readonly Tipo[] }[];

export type Processo = (typeof PROCESSOS)[number]["id"];
export type TomProcesso = (typeof PROCESSOS)[number]["tom"] | "todos";

export function ehProcesso(valor: string | null | undefined): valor is Processo {
   return PROCESSOS.some(p => p.id === valor);
}

/** Tipos do processo; sem processo, todos. */
export function tiposDoProcesso(processo: string | null): readonly Tipo[] {
   return PROCESSOS.find(p => p.id === processo)?.tipos ?? TIPOS;
}

export function processoDoTipo(tipo: Tipo): Processo {
   return PROCESSOS.find(p => (p.tipos as readonly Tipo[]).includes(tipo))?.id ?? "INGRESSO";
}

/** Filas de etapa que fazem sentido no processo: sem matrícula, some "Liberadas matrícula". */
export function filasDoProcesso(processo: string | null) {
   const semMatricula = tiposDoProcesso(processo).every(terminaNaAnalise);
   return FILAS.filter(f => !(semMatricula && f.id === "LIBERADAS"));
}
