/**
 * Valores de negócio configuráveis (docs/15-parametros.md). Nenhum número de regra fica solto no
 * código: tudo vem daqui (e, no futuro, de GET /parametros).
 * Comentário [proposta] = sugestão de CX ainda não validada.
 */

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
export interface Expediente {
   inicio: string; // "08:00"
   fim: string; // "18:00"
}
export interface Calendario {
   /** Deslocamento fixo em minutos em relação ao UTC. São Paulo: -180 (sem horário de verão desde 2019). */
   offsetMinutos: number;
   expediente: Record<DiaSemana, Expediente | null>;
   /** Datas "AAAA-MM-DD" sem expediente. */
   feriados: readonly string[];
}

export type TipoCalendario = "UTEIS" | "CORRIDAS";
export interface RegraSla {
   minutos: number;
   calendario: TipoCalendario;
   /** Fração do prazo em que o caso entra em "atenção" (0 a 1). */
   alertaEm: number;
}

export const CALENDARIO_PADRAO: Calendario = {
   offsetMinutos: -180,
   expediente: {
      0: null,
      1: { inicio: "08:00", fim: "18:00" },
      2: { inicio: "08:00", fim: "18:00" },
      3: { inicio: "08:00", fim: "18:00" },
      4: { inicio: "08:00", fim: "18:00" },
      5: { inicio: "08:00", fim: "18:00" },
      6: { inicio: "08:00", fim: "12:00" }, // [proposta] confirmar sábado
   },
   feriados: [], // vem da API; nos mocks, preencher com feriados nacionais
};

const H = 60;
const D = 24 * H;

export const SLA_POR_ETAPA = {
   AGUARDANDO_DOCUMENTOS: { minutos: 7 * D, calendario: "CORRIDAS", alertaEm: 0.7 }, // [proposta]
   PRE_ANALISE: { minutos: 15, calendario: "CORRIDAS", alertaEm: 1 }, // [proposta]
   EM_ANALISE: { minutos: 8 * H, calendario: "UTEIS", alertaEm: 0.8 }, // [proposta]
   AGUARDANDO_COORDENACAO: { minutos: 24 * H, calendario: "CORRIDAS", alertaEm: 0.8 }, // 24 h definido; [VALIDAR] úteis ou corridas
   AJUSTE_POS_COORDENACAO: { minutos: 4 * H, calendario: "UTEIS", alertaEm: 0.8 }, // [proposta]
   PRONTO_PARA_MATRICULA: { minutos: 2 * H, calendario: "UTEIS", alertaEm: 0.8 }, // [proposta] 1º contato
   EM_NEGOCIACAO: { minutos: 2 * H, calendario: "UTEIS", alertaEm: 0.8 }, // [proposta]
} as const satisfies Record<string, RegraSla>;

export const REGUA = {
   documentos: { lembretesDias: [1, 3, 5], hora: "09:00", tarefaConsultorDia: 7, encerrarDia: 15 }, // [proposta]
   proposta: { lembretesDias: [1, 3], hora: "10:00", semRetornoDias: 7 }, // [proposta]
   limitePorDia: 1,
   janela: { inicio: "08:00", fim: "20:00", domingos: false, feriados: false },
   pesquisaPosMatricula: { dia: 1, hora: "10:00" },
} as const;

export const REGRAS_ANALISE = {
   chMinimaPercentual: 0.75, // [VALIDAR com Regimento] — NÃO é regra confirmada da UniAnchieta
   notaMinima: "DA_IES_DE_ORIGEM", // [VALIDAR] usa a média de aprovação informada no histórico
   validadeDisciplinaAnos: null as number | null, // [VALIDAR] null = sem limite
   chMaximaPorPeriodo: "PERIODO_CHEIO_DA_MATRIZ", // heurística do período de ingresso sugerido
   permitirSomaDeOrigens: true,
   permitirOrigemRepetida: false,
   atividadeComplementarMaxHoras: 60, // regra já existente no sistema atual
   dpAdapPorSemestre: 2, // heurística de previsão
} as const;

export const IA = {
   limiarAlta: 0.85, // [proposta] calibrar
   limiarMedia: 0.6, // [proposta]
   loteSomente: ["ALTA", "REGRA"] as const,
   auditoriaAmostral: 0.05, // [proposta]
   /** Abaixo desta confiança de extração, CH e nota ficam destacadas para conferir no documento (docs/07 §3.5). */
   conferirExtracaoAbaixo: 0.75, // [proposta]
} as const;

export const DISTRIBUICAO = {
   analise: "MENOR_CARGA",
   matricula: "MENOR_CARGA",
   capacidadeMaxAtiva: 25, // [proposta]
} as const;

/**
 * Metas da equipe de vendas (gestão comercial). Meta mensal de matrículas por consultor, definida
 * pela gestora; o ritmo compara o realizado com a fração da meta esperada para os dias úteis já
 * passados. Projeção é estimativa (ritmo atual estendido até o fim do mês), nunca promessa.
 */
export const METAS = {
   metaPadraoMensal: 8, // [proposta] matrículas por consultor quando a gestora ainda não definiu
   noRitmoAPartirDe: 0.95, // [proposta] realizado ÷ esperado até hoje
   atencaoAPartirDe: 0.75, // [proposta] abaixo disso, "abaixo do ritmo"
   diasUteis: [1, 2, 3, 4, 5] as readonly number[], // [VALIDAR] sábado conta para vendas?
   mesesDeHistorico: 6,
} as const;

export const UI = {
   pollingMs: 30_000,
   desfazerMs: 10_000,
   paginaFila: 50,
} as const;

/** Ciclos de ingresso abertos para captação [TI: virá de GET /parametros]. O primeiro é o atual. */
export const CICLOS_ATIVOS = ["2027.1", "2026.2"] as const;
