/**
 * Estado compartilhável da aba Análise na URL (só as chaves desta feature): `filtro`, `item`,
 * `busca`, `imprimir`, `conferir` (conferência lado a lado aberta) e `acao=reabrir` (reabertura).
 * O link colado no Teams abre a mesma disciplina no mesmo filtro. Filtros
 * internos usam `replace` para não poluir o histórico do navegador.
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { ehFiltroAnalise, type FiltroAnalise } from "@/features/analise/domain/analise.domain";

export interface AnaliseUrl {
   /** `null` quando a URL não define: a aba escolhe o padrão (coordenação abre em "Para coordenação"). */
   filtro: FiltroAnalise | null;
   item: string | null;
   busca: string;
   imprimir: boolean;
   /** Conferência lado a lado aberta. */
   conferir: boolean;
   /** Ação pedida de fora da aba (ex.: "Reabrir análise" em Mais ações). */
   acao: string | null;
   setConferir: (aberta: boolean) => void;
   limparAcao: () => void;
   setFiltro: (f: FiltroAnalise) => void;
   setItem: (id: string | null) => void;
   setBusca: (q: string) => void;
   limparImprimir: () => void;
   solicitarImpressao: () => void;
   irPara: (aba: string) => void;
}

export function useAnaliseUrl(): AnaliseUrl {
   const [params, setParams] = useSearchParams();
   const bruto = params.get("filtro");

   const mudar = useCallback(
      (chave: string, valor: string | null) =>
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

   return {
      filtro: ehFiltroAnalise(bruto) ? bruto : null,
      item: params.get("item"),
      busca: params.get("busca") ?? "",
      imprimir: params.get("imprimir") === "1",
      conferir: params.get("conferir") === "1",
      acao: params.get("acao"),
      setConferir: useCallback((aberta: boolean) => mudar("conferir", aberta ? "1" : null), [mudar]),
      limparAcao: useCallback(() => mudar("acao", null), [mudar]),
      setFiltro: useCallback((f: FiltroAnalise) => mudar("filtro", f), [mudar]),
      setItem: useCallback((id: string | null) => mudar("item", id), [mudar]),
      setBusca: useCallback((q: string) => mudar("busca", q), [mudar]),
      limparImprimir: useCallback(() => mudar("imprimir", null), [mudar]),
      solicitarImpressao: useCallback(() => mudar("imprimir", "1"), [mudar]),
      // `aba` é chave do integrador: aqui só navegamos para ela (ex.: "Ir para Documentos").
      irPara: useCallback((aba: string) => mudar("aba", aba), [mudar]),
   };
}
