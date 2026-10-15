/**
 * API PÚBLICA do slice `indicadores`: painel de indicadores e MetricSheet.
 */
export * from "@/features/indicadores/types/indicadores.schema";
export { PainelIndicadores } from "@/features/indicadores/components/painel-indicadores";
export { indicadoresKeys } from "@/features/indicadores/api/indicadores.keys";
export { useIndicadores } from "@/features/indicadores/api/indicadores.queries";
export { niceScale, passoRedondo, thin, type Escala } from "@/features/indicadores/domain/escala";
