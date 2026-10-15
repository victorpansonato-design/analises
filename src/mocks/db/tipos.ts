/**
 * Registros internos do backend simulado. Guardam o dado "cru" (CPF completo, ids de responsáveis);
 * os handlers montam o contrato (mascarado conforme o papel) a partir deles.
 */
import type { AtividadeComplementar, ItemAnalise, ItemOrigem, PraticaExtensionista, PreAnalise, ResumoAnalise } from "@/features/analise";
import type { Destino, Etapa, PendenciaExterna, SubtipoRetorno, Tipo } from "@/features/casos";
import type { ItemChecklist } from "@/features/documentos";
import type { Notificacao } from "@/features/notificacoes";
import type { Financeiro, TipoResposta } from "@/features/proposta";
import type { EventoTimeline } from "@/features/timeline";

export interface PassoRegistro {
   etapa: Etapa;
   entrouEm: string;
   saiuEm: string | null;
   porId: string | null;
}

export interface CasoRegistro {
   id: string;
   protocolo: string;
   tipo: Tipo;
   subtipo: SubtipoRetorno | null;
   etapa: Etapa;
   etapaAnterior: Etapa | null;
   etapaDesde: string;
   criadoEm: string;
   atualizadoEm: string;
   versao: number;
   matriculado: boolean;
   ultimoAutorId: string | null;
   candidato: {
      pessoaId: string;
      nome: string;
      ra: string | null;
      outroRa: string | null;
      cpf: string;
      celular: string;
      email: string | null;
      optInWhatsapp: boolean;
   };
   destino: Destino;
   origem: { iesNome: string | null; cursoNome: string | null; estudouForaNoPeriodo: boolean | null };
   ingresso: { ano: number | null; semestre: number | null };
   responsaveis: { consultorId: string | null; analistaId: string | null; coordenadorId: string | null; matriculaId: string | null };
   sla: { venceEm: string | null; alertaEm: string | null };
   pendencia: PendenciaExterna | null;
   retomarEm: string | null;
   flags: { ouvidoria: boolean; escalado: boolean; preAnaliseFalhou: boolean };
   reanalises: number;
   jornada: PassoRegistro[];
   resumoCongeladoEm: string | null;
   resumoCongelado: ResumoAnalise | null;
   noGed: boolean;
   preAnalise: PreAnalise;
   proposta: {
      financeiro: Financeiro | null;
      pendenciaFinanceiraAnterior: boolean | null;
      resposta: { tipo: TipoResposta; em: string; canal: string } | null;
      aceite: { canal: string; em: string; porId: string } | null;
      enviadaEm: string | null;
   };
   motivoEncerramento: string | null;
   dadosVestibular: Record<string, string | number> | null;
   /** Semente estável do caso: gera análise, documentos e histórico sob demanda. */
   semente: number;
   /** Roteiro especial dos casos de demonstração (análise de 45 itens, perguntas à coordenação…). */
   roteiro: RoteiroDemo | null;
   /** Caso de teste (motivo de cancelamento TESTE): fora dos indicadores. */
   teste: boolean;
}

export type RoteiroDemo = "ANALISE_45" | "COORDENACAO_2" | "AJUSTE" | "MATRICULA" | "DOCUMENTOS_1" | "NEGOCIACAO";

export interface AnaliseRegistro {
   matrizId: string;
   itens: ItemAnalise[];
   origem: ItemOrigem[];
   atividades: AtividadeComplementar[];
   pratica: PraticaExtensionista[];
   personalizadas: { id: string; nome: string }[];
   periodoIngresso: number | null;
   versao: number;
}

export interface EstadoDb {
   iniciadoEm: Date;
   casos: Map<string, CasoRegistro>;
   analises: Map<string, AnaliseRegistro>;
   /** Análise anterior a um ALTERAR_DESTINO: as decisões são reaproveitadas por disciplina. */
   analisesArquivadas: Map<string, AnaliseRegistro>;
   documentos: Map<string, ItemChecklist[]>;
   eventos: Map<string, EventoTimeline[]>;
   notificacoes: Map<string, Notificacao[]>;
   /** Metas mensais definidas pela gestão, por `consultorId|AAAA-MM`. Sem registro, vale a semente. */
   metas: Map<string, MetaRegistro>;
   sequencia: number;
}

export interface MetaRegistro {
   meta: number;
   versao: number;
   atualizadoPorId: string;
}
