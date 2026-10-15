/** Query keys dos indicadores: o recorte inteiro entra na chave (cada recorte é um cache). */
import type { FiltrosIndicadores } from "@/features/indicadores/types/indicadores.schema";

export const indicadoresKeys = {
   all: ["indicadores"] as const,
   painel: (f: FiltrosIndicadores) => [...indicadoresKeys.all, "painel", f] as const,
};
