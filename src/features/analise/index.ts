/**
 * API PÚBLICA do slice `analise`: workspace da análise curricular (grade, lote, coordenação, resumo).
 */
export * from "@/features/analise/types/analise.schema";

// Componente da aba (o integrador compõe no painel do caso)
export { AnaliseTab } from "@/features/analise/components/analise-tab";

// Dados
export { analiseKeys } from "@/features/analise/api/analise.keys";
export { useAnalise, usePreAnalise, usePreviaMatriz } from "@/features/analise/api/analise.queries";
export {
   useDecidirItem,
   useDecidirLote,
   useDefinirIngresso,
   useInserirAtividade,
   useInserirPratica,
   usePerguntar,
   useReexecutarPreAnalise,
   useRemoverAtividade,
   useResponderItem,
   useRetirarPergunta,
} from "@/features/analise/api/analise.mutations";

// Domínio puro
export {
   FILTROS_ANALISE,
   ROTULO_FILTRO_ANALISE,
   aceitavelEmLote,
   agruparPorPeriodo,
   compararCh,
   contarFiltros,
   divergente,
   filtrarItens,
   paraCoordenacao,
   pendente,
   type FiltroAnalise,
   type GrupoPeriodo,
} from "@/features/analise/domain/analise.domain";
export { textoDoParecer } from "@/features/analise/domain/parecer";
