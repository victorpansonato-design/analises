/**
 * API PÚBLICA do slice `matriz-curricular`: consulta das matrizes por curso, modalidade e turno,
 * com as disciplinas por período e os grupos sem série obrigatória.
 */
export * from "@/features/matriz-curricular/types/matriz.schema";

// Tela (a página compõe)
export { MatrizCurricular } from "@/features/matriz-curricular/components/matriz-curricular";

// Dados
export { matrizKeys, useBuscaMatrizes, useCurriculo } from "@/features/matriz-curricular/api/matriz.queries";

// Domínio puro (também usado pelo backend simulado)
export { DESLOCAMENTO_CODIGO, codigoDoCurso } from "@/features/matriz-curricular/domain/codigo";
export { MINIMO_LETRAS_BUSCA, buscarOfertas, consultaValida, ehBuscaPorCodigo } from "@/features/matriz-curricular/domain/busca";
export { chDoGrupo, disciplinasPorPeriodo, regraDoGrupo, rotuloPeriodo, somaCh } from "@/features/matriz-curricular/domain/curriculo";
