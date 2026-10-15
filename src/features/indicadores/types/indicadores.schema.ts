/**
 * Indicadores (docs/10). Nenhuma taxa sem denominador; o funil e o painel vêm da MESMA fonte para
 * não discordarem; dado de demonstração se declara. Espelha `Indicador`/`Indicadores` do contrato.
 */
import { z } from "zod";

import { FunilSchema, IsoDate } from "@/features/casos";

export const UnidadeSchema = z.enum(["PERCENTUAL", "HORAS", "DIAS", "CONTAGEM", "MINUTOS"]);
export type Unidade = z.infer<typeof UnidadeSchema>;

export const IndicadorSchema = z.object({
   id: z.string(),
   rotulo: z.string(),
   valor: z.number().nullable(),
   unidade: UnidadeSchema,
   numerador: z.number().nullable(),
   numeradorRotulo: z.string().nullable(),
   denominador: z.number().nullable(),
   denominadorRotulo: z.string().nullable(),
   /**
    * Do que o número é feito. As linhas somam ao total (numerador, ou denominador quando o indicador
    * é uma distribuição). Com `denominador` na linha, `percentual` é a taxa da linha (valor ÷
    * denominador) e os denominadores das linhas somam ao do indicador.
    */
   composicao: z.array(
      z.object({ rotulo: z.string(), valor: z.number(), percentual: z.number().nullable(), denominador: z.number().nullable().optional() }),
   ),
   serie: z.array(z.object({ em: z.string(), valor: z.number() })),
   comoLer: z.string(),
   /** Meta proposta (docs/10), quando existe. */
   meta: z.string().nullable().optional(),
   /** Leitura secundária curta (ex.: "p90 9,5 d"). */
   detalhe: z.string().nullable().optional(),
});
export type Indicador = z.infer<typeof IndicadorSchema>;

export const GRUPOS_INDICADORES = ["fluxo", "resultado", "esforco", "experiencia", "ia"] as const;
export type GrupoIndicadores = (typeof GRUPOS_INDICADORES)[number];

export const ROTULO_GRUPO: Record<GrupoIndicadores, string> = {
   fluxo: "Fluxo",
   resultado: "Resultado",
   esforco: "Esforço",
   experiencia: "Experiência do candidato",
   ia: "Pré-análise com IA",
};

export const IndicadoresSchema = z.object({
   funil: FunilSchema,
   fluxo: z.array(IndicadorSchema),
   resultado: z.array(IndicadorSchema),
   esforco: z.array(IndicadorSchema),
   experiencia: z.array(IndicadorSchema),
   ia: z.array(IndicadorSchema),
   geradoEm: IsoDate,
});
export type Indicadores = z.infer<typeof IndicadoresSchema>;

/** Indicador de conversão por pessoa: só a gestão comercial (`GESTAO`) recebe (docs/04, `VER_INDICADORES_POR_PESSOA`). */
export const ID_CONVERSAO_POR_RESPONSAVEL = "conversao-responsavel";

export interface FiltrosIndicadores {
   ciclo: string | null;
   tipo: string | null;
   curso: string | null;
   modalidade: string | null;
}
