/**
 * API PÚBLICA do slice `proposta`: resumo congelado, condição financeira, envio, resposta e aceite.
 */
export * from "@/features/proposta/types/proposta.schema";
export { PropostaTab, type PropostaTabProps } from "@/features/proposta/components/proposta-tab";
export { propostaKeys, useProposta } from "@/features/proposta/api/proposta.queries";
export {
   botaoDaProposta,
   guardasDoEnvio,
   ROTULO_ACAO_PROPOSTA,
   type BotaoProposta,
   type GuardaEnvio,
} from "@/features/proposta/domain/proposta";
