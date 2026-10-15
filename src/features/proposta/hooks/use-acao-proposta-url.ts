/**
 * O modal aberto da aba Proposta mora na URL (`?acao=`): o card "Próximo passo" navega para
 * `?aba=proposta&acao=ENVIAR_PROPOSTA` e a aba abre o modal; fechar remove o parâmetro. Assim o link
 * colado no Teams abre o mesmo ponto e o "voltar" do navegador não reabre nada (`replace`).
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import { AcaoPropostaSchema, type AcaoProposta } from "@/features/proposta/types/proposta.schema";

const CHAVE = "acao";

export function useAcaoPropostaUrl() {
   const [params, setParams] = useSearchParams();
   const lida = AcaoPropostaSchema.safeParse(params.get(CHAVE));
   const acao: AcaoProposta | null = lida.success ? lida.data : null;

   const abrir = useCallback(
      (nova: AcaoProposta) =>
         setParams(
            prev => {
               const p = new URLSearchParams(prev);
               p.set(CHAVE, nova);
               return p;
            },
            { replace: true },
         ),
      [setParams],
   );

   const fechar = useCallback(
      () =>
         setParams(
            prev => {
               if (!prev.has(CHAVE)) return prev;
               const p = new URLSearchParams(prev);
               p.delete(CHAVE);
               return p;
            },
            { replace: true },
         ),
      [setParams],
   );

   return { acao, abrir, fechar };
}
