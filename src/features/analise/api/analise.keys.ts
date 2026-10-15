/**
 * Query keys da análise. Por convenção do projeto, toda chave de dado de um caso começa com o nome
 * da feature e CONTÉM o `casoId`: `invalidarTudoDoCaso` (casos) acha estas chaves sem conhecê-las.
 */
export const analiseKeys = {
   analise: (casoId: string) => ["analise", casoId] as const,
   previaMatriz: (casoId: string, matrizId: string) => ["analise", casoId, "previa-matriz", matrizId] as const,
   preAnalise: (casoId: string) => ["pre-analise", casoId] as const,
};

/** Escopo das mutations da análise: rodam em série para cada uma enviar a versão já atualizada pela anterior. */
export const escopoAnalise = (casoId: string) => ({ id: `analise-${casoId}` });
