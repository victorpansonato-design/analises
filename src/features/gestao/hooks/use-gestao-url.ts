/**
 * Estado da área de gestão na URL: `aba` (indicadores | equipe), `mes` (AAAA-MM) e `consultor` (o
 * detalhe aberto). O link colado no Teams abre o mesmo mês com o mesmo consultor. `replace` nas
 * trocas de mês e de detalhe para não poluir o histórico; troca de aba entra no histórico.
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { AbaGestaoSchema, MesSchema, type AbaGestao } from "@/features/gestao/types/gestao.schema";

export function useGestaoUrl() {
   const [params, setParams] = useSearchParams();
   const aba: AbaGestao = AbaGestaoSchema.catch("indicadores").parse(params.get("aba") ?? undefined);
   const mesBruto = params.get("mes");
   const mes = MesSchema.safeParse(mesBruto).success ? mesBruto : null;

   const definir = useCallback(
      (chave: "aba" | "mes" | "consultor", valor: string | null, replace = true) =>
         setParams(
            prev => {
               const p = new URLSearchParams(prev);
               if (valor === null || valor === "") p.delete(chave);
               else p.set(chave, valor);
               return p;
            },
            { replace },
         ),
      [setParams],
   );

   return { aba, mes, consultor: params.get("consultor"), definir };
}
