/**
 * API PÚBLICA do slice `protocolo`: drawer "Novo protocolo" com lookup por CPF.
 */
export * from "@/features/protocolo/types/protocolo.schema";
export { NovoProtocoloDrawer, type NovoProtocoloDrawerProps } from "@/features/protocolo/components/novo-protocolo-drawer";
export { protocoloKeys, useLookupPessoa } from "@/features/protocolo/api/protocolo.queries";
export { CICLO_PROTOCOLO, mascaraCpf, sugerirTipo } from "@/features/protocolo/domain/protocolo";
export { useRascunhoProtocoloStore } from "@/features/protocolo/stores/rascunho-protocolo.store";
