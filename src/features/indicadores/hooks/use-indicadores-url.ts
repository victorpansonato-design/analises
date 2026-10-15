/**
 * Estado do painel na URL (só as chaves desta feature): `ind_tipo`, `ind_curso`, `ind_modalidade` e
 * `metrica` (o MetricSheet aberto). `ciclo` é do integrador: aqui só é lido. O link colado no Teams
 * abre o mesmo recorte com o mesmo indicador aberto. `replace` para não poluir o histórico.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { ModalidadeSchema, TipoSchema } from "@/features/casos";
import type { FiltrosIndicadores } from "@/features/indicadores/types/indicadores.schema";

export type ChaveIndicadores = "ind_tipo" | "ind_curso" | "ind_modalidade" | "metrica";

export function useIndicadoresUrl() {
   const [params, setParams] = useSearchParams();
   const tipo = params.get("ind_tipo");
   const modalidade = params.get("ind_modalidade");
   const curso = params.get("ind_curso");
   const ciclo = params.get("ciclo");

   const filtros: FiltrosIndicadores = useMemo(
      () => ({
         ciclo: ciclo || null,
         tipo: TipoSchema.safeParse(tipo).success ? tipo : null,
         curso: curso || null,
         modalidade: ModalidadeSchema.safeParse(modalidade).success ? modalidade : null,
      }),
      [ciclo, tipo, curso, modalidade],
   );

   const definir = useCallback(
      (chave: ChaveIndicadores, valor: string | null) =>
         setParams(
            prev => {
               const p = new URLSearchParams(prev);
               if (valor === null || valor === "") p.delete(chave);
               else p.set(chave, valor);
               return p;
            },
            { replace: true },
         ),
      [setParams],
   );

   const limparRecorte = useCallback(
      () =>
         setParams(
            prev => {
               const p = new URLSearchParams(prev);
               for (const k of ["ind_tipo", "ind_curso", "ind_modalidade"]) p.delete(k);
               return p;
            },
            { replace: true },
         ),
      [setParams],
   );

   return { filtros, metrica: params.get("metrica"), definir, limparRecorte };
}
