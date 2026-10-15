/**
 * API PÚBLICA do slice `casos`: o caso (um processo de uma pessoa) e tudo que é comum às abas.
 *
 * - Domínio puro (máquina de estados, permissões, SLA, prioridade, parâmetros, próximo passo).
 * - Tipos Zod do contrato (caso, fila, funil, catálogos).
 * - Hooks de dados (fila, funil, caso, catálogos) e mutations do caso.
 * - Componentes da tela única (funil, fila, painel do caso, aba Dados, busca ⌘K).
 *
 * As outras features (análise, documentos, linha do tempo…) dependem daqui; `casos` não depende
 * delas: a página compõe as abas.
 */

// Domínio
export { FILAS, etapasDaFila, nomeDaFila, tomDaEtapa, tomDaAcao, type TomFila } from "@/features/casos/domain/filas";
export {
   PROCESSOS,
   ehProcesso,
   filasDoProcesso,
   processoDoTipo,
   tiposDoProcesso,
   type Processo,
   type TomProcesso,
} from "@/features/casos/domain/processos";
export { abasDoTipo } from "@/features/casos/domain/abas";
export { PareceresCoordenacao } from "@/features/casos/components/pareceres-coordenacao";
export {
   ACOES_DESTRUTIVAS,
   ETAPAS_PEGAR_PROXIMO,
   PAPEL_DONO_DA_ETAPA,
   ROTULO_ACAO,
   acaoDoCaso,
   podeNoCaso,
   type NomeAcao,
} from "@/features/casos/domain/acoes";
export {
   ErroTransicao,
   TRANSICOES,
   acoesDisponiveis,
   avaliarAcao,
   etapasDaJornada,
   precisaDocumentosExternos,
   transicionar,
   type AvaliacaoAcao,
   type Ator,
   type CasoMaquina,
   type ContextoTransicao,
   type ResultadoTransicao,
} from "@/features/casos/domain/caso.machine";
export { ABAS, ROTULO_ABA, abaPadrao, ehAba, type Aba } from "@/features/casos/domain/abas";
export {
   CALENDARIO_PADRAO,
   CICLOS_ATIVOS,
   DISTRIBUICAO,
   IA,
   METAS,
   REGRAS_ANALISE,
   REGUA,
   SLA_POR_ETAPA,
   UI,
   type Calendario,
   type RegraSla,
} from "@/features/casos/domain/parametros";
export {
   CAPACIDADES,
   MATRIZ,
   mascararCpf,
   pode,
   temCapacidade,
   type Capacidade,
   type EscopoCaso,
   type UsuarioPermissao,
} from "@/features/casos/domain/permissoes";
export { compararPrioridade, proximoCaso } from "@/features/casos/domain/prioridade";
export { calcularProximoPasso, rotuloPendencia, type AcaoPasso, type ProximoPasso } from "@/features/casos/domain/proximo-passo";
export { proximoLembreteDocumentos, proximoLembreteProposta, semRetornoEm } from "@/features/casos/domain/regua";
export { adicionarMinutosUteis, calcularPrazo, lerSla, rotuloSla, type EstadoSla, type LeituraSla } from "@/features/casos/domain/sla";

// Tipos (contrato)
export * from "@/features/casos/types/caso.schema";

// Dados
export { catalogoKeys, casosKeys, type FiltrosFila } from "@/features/casos/api/casos.keys";
export {
   invalidarCaso,
   invalidarTudoDoCaso,
   useAtribuir,
   useAtualizarFlags,
   useEditarCaso,
   useLembrarDocumentos,
   usePegarProximo,
   useRevelarDado,
   useTransicao,
} from "@/features/casos/api/casos.mutations";
export {
   useBuscaCasos,
   useCaso,
   useCasos,
   useCursos,
   useFunil,
   useInstituicoes,
   useMatrizes,
   useUsuarios,
   useVestibular,
   type Instituicao,
} from "@/features/casos/api/casos.queries";

// Componentes da tela única
export { BuscaGlobal } from "@/features/casos/components/busca-global";
export { FilaCasos } from "@/features/casos/components/fila/fila-casos";
export { FunilEtapas } from "@/features/casos/components/funil-etapas";
export { AbaDados } from "@/features/casos/components/painel/aba-dados";
export { PainelCaso, type RenderAba } from "@/features/casos/components/painel/painel-caso";
export { Prazo } from "@/features/casos/components/prazo";
export { StatusEtapa } from "@/features/casos/components/status-etapa";
export { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
