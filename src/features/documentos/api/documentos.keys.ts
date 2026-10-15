/**
 * Query keys dos documentos. Toda chave carrega o `casoId` (convenção de `invalidarTudoDoCaso`).
 */
export const documentosKeys = {
   all: ["documentos"] as const,
   doCaso: (casoId: string) => [...documentosKeys.all, casoId] as const,
};
