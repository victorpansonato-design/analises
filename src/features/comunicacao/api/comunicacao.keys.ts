/**
 * Query keys da comunicação. A prévia depende do caso (variáveis vêm dele): a chave carrega o
 * `casoId` para `invalidarTudoDoCaso` recalcular depois de qualquer mudança no caso.
 */
export const comunicacaoKeys = {
   all: ["comunicacao"] as const,
   templates: () => [...comunicacaoKeys.all, "templates"] as const,
   previa: (casoId: string, templateId: string | null) => [...comunicacaoKeys.all, casoId, "previa", templateId] as const,
};
