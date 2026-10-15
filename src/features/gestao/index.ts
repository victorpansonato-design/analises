/**
 * API PÚBLICA do slice `gestao`: área da gestão comercial (indicadores, rendimento e metas da
 * equipe de vendas). Só quem tem `VER_GESTAO` entra.
 */
export * from "@/features/gestao/types/gestao.schema";
export { AreaGestao } from "@/features/gestao/components/area-gestao";
export { gestaoKeys } from "@/features/gestao/api/gestao.keys";
export {
   acumulado,
   avaliarMeta,
   carteiraAtiva,
   diasAteHoje,
   diasUteisDoMes,
   ehDiaUtil,
   mesDe,
   ordenarPorRendimento,
   progressoDoMes,
   totalDaEquipe,
   type LeituraMeta,
   type ProgressoMes,
} from "@/features/gestao/domain/metas";
