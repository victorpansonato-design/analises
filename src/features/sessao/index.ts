/**
 * API PÚBLICA do slice `sessao`: usuário logado, papéis e (com dados simulados) o papel simulado.
 */
export { sessaoKeys, useMe } from "@/features/sessao/api/sessao.queries";
export { usePapelSimuladoStore } from "@/features/sessao/stores/papel-simulado.store";
export {
   ACESSOS,
   MeSchema,
   PAPEIS,
   PAPEL_DO_ACESSO,
   PapelSchema,
   ROTULO_ACESSO,
   ROTULO_PAPEL,
   acessoDoPapel,
   type Acesso,
   type Me,
   type Papel,
} from "@/features/sessao/types/sessao.schema";
