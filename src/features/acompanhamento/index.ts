/**
 * API PÚBLICA do slice `acompanhamento`: o link que o aluno recebe para acompanhar o pedido, do
 * protocolo à matrícula, sem login.
 *
 * - Domínio puro: etapas internas → passos que o aluno entende (usado também pelo backend simulado).
 * - Página pública (`/acompanhe/:token`) e o bloco "Link do aluno" da faixa azul do caso.
 */
export * from "@/features/acompanhamento/types/acompanhamento.schema";
export {
   ATUALIZAR_ACOMPANHAMENTO_MS,
   CONTATO_ALUNO,
   linkWhatsapp,
   montarAcompanhamento,
   passoDaEtapa,
   passosDoTipo,
   urlAcompanhamento,
   type EntradaAcompanhamento,
} from "@/features/acompanhamento/domain/acompanhamento";
export { rotuloSituacao, saudacao, textoDoPasso, tituloDoPasso } from "@/features/acompanhamento/domain/textos";
export { acompanhamentoKeys } from "@/features/acompanhamento/api/acompanhamento.queries";
export { AcompanhamentoAluno } from "@/features/acompanhamento/components/acompanhamento-aluno";
export { LinkAluno } from "@/features/acompanhamento/components/link-aluno";
