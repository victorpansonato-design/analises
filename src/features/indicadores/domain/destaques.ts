/**
 * O que o topo do painel da gestão mostra, derivado da MESMA resposta de `/indicadores` (o destaque
 * não tem como discordar dos cartões). Puro e testado.
 */
import type { Etapa, Funil } from "@/features/casos";

import type { Indicador, Indicadores } from "@/features/indicadores/types/indicadores.schema";

export const GRUPOS_PROTOCOLO = ["analise", "matricula", "matriculados", "encerrados"] as const;
export type GrupoProtocolo = (typeof GRUPOS_PROTOCOLO)[number];

export const ROTULO_GRUPO_PROTOCOLO: Record<GrupoProtocolo, string> = {
   analise: "Em análise",
   matricula: "Em matrícula",
   matriculados: "Matriculados",
   encerrados: "Encerrados",
};

const ETAPAS_DO_GRUPO: Record<GrupoProtocolo, readonly Etapa[]> = {
   analise: ["RASCUNHO", "AGUARDANDO_DOCUMENTOS", "PRE_ANALISE", "EM_ANALISE", "AGUARDANDO_COORDENACAO", "AJUSTE_POS_COORDENACAO"],
   matricula: ["PRONTO_PARA_MATRICULA", "PROPOSTA_ENVIADA", "EM_NEGOCIACAO"],
   matriculados: ["MATRICULADO"],
   encerrados: ["PERDIDO", "CANCELADO"],
};

export interface DistribuicaoProtocolos {
   grupos: { grupo: GrupoProtocolo; total: number; fracao: number }[];
   total: number;
   /** Adiados ficam fora: não estão em andamento nem encerrados. */
   adiados: number;
}

/** Onde estão os protocolos do recorte: quatro partes que somam ao total (sem os adiados). */
export function distribuicaoProtocolos(funil: Funil): DistribuicaoProtocolos {
   const porEtapa = new Map(funil.etapas.map(e => [e.etapa, e.total]));
   const somar = (etapas: readonly Etapa[]) => etapas.reduce((s, e) => s + (porEtapa.get(e) ?? 0), 0);
   const totais = GRUPOS_PROTOCOLO.map(grupo => ({ grupo, total: somar(ETAPAS_DO_GRUPO[grupo]) }));
   const total = totais.reduce((s, g) => s + g.total, 0);
   return {
      grupos: totais.map(g => ({ ...g, fracao: total > 0 ? g.total / total : 0 })),
      total,
      adiados: porEtapa.get("ADIADO") ?? 0,
   };
}

/** Indicador pelo id, em qualquer grupo. */
export function indicadorPorId(dados: Indicadores, id: string): Indicador | null {
   for (const g of [dados.fluxo, dados.resultado, dados.esforco, dados.experiencia, dados.ia]) {
      const achado = g.find(i => i.id === id);
      if (achado) return achado;
   }
   return null;
}

/** Variação entre o primeiro e o último ponto da série (mesma unidade do indicador). */
export function variacaoDaSerie(i: Pick<Indicador, "serie">): number | null {
   if (i.serie.length < 2) return null;
   return i.serie[i.serie.length - 1].valor - i.serie[0].valor;
}
