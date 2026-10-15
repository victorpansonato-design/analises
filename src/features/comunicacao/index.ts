/**
 * API PÚBLICA do slice `comunicacao`: mensagens ao candidato por templates aprovados (via backend).
 *
 * - `MensagemCandidato`: escolha do template, prévia exata, bloqueios explicados e envio.
 * - `BolhaWhatsapp`: a mensagem como o candidato vê (prévias e linha do tempo).
 * - `usePreviaMensagem`: prévia de um template para o caso (a proposta reutiliza).
 * - Regras puras do envio (a interface e o backend simulado usam as mesmas).
 */
export * from "@/features/comunicacao/types/comunicacao.schema";

export { comunicacaoKeys } from "@/features/comunicacao/api/comunicacao.keys";
export { useEnviarMensagem } from "@/features/comunicacao/api/comunicacao.mutations";
export { usePreviaMensagem, useTemplates } from "@/features/comunicacao/api/comunicacao.queries";
export { BolhaWhatsapp } from "@/features/comunicacao/components/bolha-whatsapp";
export { MensagemCandidato, type MensagemCandidatoProps } from "@/features/comunicacao/components/mensagem-candidato";
export {
   ORIGEM_VARIAVEL,
   ROTULO_VARIAVEL,
   SEM_OPT_IN,
   explicarFaltando,
   motivoBloqueioEnvio,
   motivoTemplateForaDaEtapa,
   origemDoQueFalta,
   rotuloVariavel,
   segmentarPrevia,
   type CondicoesEnvio,
   type TrechoPrevia,
} from "@/features/comunicacao/domain/mensagem";
