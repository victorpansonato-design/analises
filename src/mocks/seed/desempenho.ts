/**
 * Desempenho FICTÍCIO da equipe de vendas, mês a mês (semente determinística por consultor e mês).
 * A semente de casos tem poucas matrículas por pessoa para sustentar metas mensais, então o volume
 * do mês vem daqui; a carteira ativa de cada consultor continua vindo dos casos simulados.
 *
 * Cada consultor tem um perfil (forte, regular, oscilante ou abaixo) que decide o quanto da meta
 * costuma entregar: a tela de metas precisa mostrar todas as situações, não só a média.
 */
import { diasUteisDoMes } from "@/features/gestao";

import { criarPrng } from "@/mocks/lib/prng";

type Perfil = "FORTE" | "REGULAR" | "OSCILANTE" | "ABAIXO";

interface PerfilConsultor {
   perfil: Perfil;
   metaBase: number;
}

/** Perfil por consultor da semente (`seed/usuarios.ts`). */
const PERFIS: Record<string, PerfilConsultor> = {
   "u-con-1": { perfil: "FORTE", metaBase: 12 },
   "u-con-2": { perfil: "REGULAR", metaBase: 10 },
   "u-con-3": { perfil: "OSCILANTE", metaBase: 10 },
   "u-con-4": { perfil: "ABAIXO", metaBase: 9 },
   "u-con-5": { perfil: "REGULAR", metaBase: 8 },
};

const ENTREGA: Record<Perfil, [number, number]> = {
   FORTE: [1.1, 1.35],
   REGULAR: [0.92, 1.1],
   OSCILANTE: [0.7, 1.2],
   ABAIXO: [0.55, 0.8],
};

const CONVERSAO: Record<Perfil, [number, number]> = {
   FORTE: [0.34, 0.42],
   REGULAR: [0.26, 0.34],
   OSCILANTE: [0.22, 0.36],
   ABAIXO: [0.17, 0.25],
};

const CONTATO_HORAS: Record<Perfil, [number, number]> = {
   FORTE: [0.6, 1.4],
   REGULAR: [1.1, 2.2],
   OSCILANTE: [1.2, 3.4],
   ABAIXO: [2.2, 4.6],
};

export interface DesempenhoMes {
   metaSemente: number;
   /** Matrículas por dia de calendário do mês inteiro. */
   porDia: number[];
   protocolosAbertos: number;
   propostasEnviadas: number;
   analisesConcluidas: number;
   primeiroContatoHoras: number;
}

function perfilDe(consultorId: string): PerfilConsultor {
   return PERFIS[consultorId] ?? { perfil: "REGULAR", metaBase: 8 };
}

function entre(r: ReturnType<typeof criarPrng>, [min, max]: [number, number]): number {
   return min + r.next() * (max - min);
}

/** O mês inteiro de um consultor (a leitura parcial corta `porDia` até hoje). */
export function desempenhoDoMes(consultorId: string, mes: string): DesempenhoMes {
   const { perfil, metaBase } = perfilDe(consultorId);
   const r = criarPrng(`desempenho-${consultorId}-${mes}`);
   const metaSemente = Math.max(4, metaBase + r.int(-1, 1));
   const total = Math.round(metaSemente * entre(r, ENTREGA[perfil]));
   const [ano, m] = mes.split("-").map(Number);
   const diasNoMes = new Date(Date.UTC(ano, m, 0)).getUTCDate();
   const uteis = diasUteisDoMes(mes).map(d => Number(d.slice(8)) - 1);
   const porDia = Array.from({ length: diasNoMes }, () => 0);
   for (let i = 0; i < total && uteis.length > 0; i++) porDia[uteis[Math.floor(r.next() * uteis.length)]] += 1;
   const conversao = entre(r, CONVERSAO[perfil]);
   const analisesConcluidas = Math.max(total, Math.round(total / conversao));
   return {
      metaSemente,
      porDia,
      analisesConcluidas,
      propostasEnviadas: Math.round(total + (analisesConcluidas - total) * entre(r, [0.45, 0.75])),
      protocolosAbertos: Math.round(analisesConcluidas * entre(r, [1.3, 1.7])),
      primeiroContatoHoras: Math.round(entre(r, CONTATO_HORAS[perfil]) * 10) / 10,
   };
}
