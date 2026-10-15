export const gestaoKeys = {
   all: ["gestao"] as const,
   equipe: (mes: string | null) => [...gestaoKeys.all, "equipe", mes] as const,
};
