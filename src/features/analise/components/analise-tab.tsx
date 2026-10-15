/**
 * Aba "Análise" do painel do caso (componente público da feature). Decide o estado antes do
 * workspace:
 *
 * - Antes dos documentos completos (RASCUNHO, AGUARDANDO_DOCUMENTOS): explica por que ainda não há
 *   análise e leva à aba Documentos.
 * - Pré-análise rodando (PRE_ANALISE): skeleton com a geometria da grade e "Lendo histórico… cerca
 *   de 1 min"; acompanha a cada 4 s e, ao terminar, atualiza o caso (a etapa muda sozinha).
 * - Carregando e erro via `AsyncState`; 404 `ANALISE_INDISPONIVEL` é estado esperado, não erro.
 * - Modo coordenação quando a API devolve `RESPONDER_ITEM_COORDENACAO` e a etapa é
 *   AGUARDANDO_COORDENACAO: abre filtrado em "Para coordenação".
 */
import { useQueryClient } from "@tanstack/react-query";
import { FileText, Hourglass, TriangleAlert } from "lucide-react";
import { useEffect, useRef } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { acaoDoCaso, invalidarCaso, type CasoDetalhe } from "@/features/casos";
import { lerErroApi } from "@/services/api-erro";

import { analiseKeys } from "@/features/analise/api/analise.keys";
import { analiseIndisponivel, useAnalise, usePreAnalise } from "@/features/analise/api/analise.queries";
import { AnaliseSkeleton } from "@/features/analise/components/analise-skeleton";
import { WorkspaceAnalise } from "@/features/analise/components/workspace-analise";
import { useAnaliseUrl } from "@/features/analise/hooks/use-analise-url";

const ANTES_DOS_DOCUMENTOS = new Set(["RASCUNHO", "AGUARDANDO_DOCUMENTOS"]);

export function AnaliseTab({ caso }: { caso: CasoDetalhe }) {
   const queryClient = useQueryClient();
   const { irPara } = useAnaliseUrl();
   const antes = ANTES_DOS_DOCUMENTOS.has(caso.etapa);
   const emPreAnalise = caso.etapa === "PRE_ANALISE";
   const pre = usePreAnalise(caso.id, { enabled: !antes, acompanhar: emPreAnalise });
   const analise = useAnalise(caso.id, !antes && !emPreAnalise);

   // Pré-análise terminou (inicial ou reexecução): o caso muda de etapa/contadores e a grade ganha sugestões.
   const status = pre.data?.status;
   const anterior = useRef(status);
   useEffect(() => {
      const terminou = !!status && status !== "PROCESSANDO" && (anterior.current === "PROCESSANDO" || emPreAnalise);
      anterior.current = status;
      if (!terminou) return;
      invalidarCaso(queryClient, caso.id);
      void queryClient.invalidateQueries({ queryKey: analiseKeys.analise(caso.id) });
   }, [status, emPreAnalise, queryClient, caso.id]);

   if (antes) {
      return (
         <EmptyPanel
            icon={FileText}
            title="A análise começa quando os documentos estiverem completos"
            message="Com o checklist completo, a pré-análise lê o histórico e a grade aparece aqui com as sugestões para você confirmar."
            action={<Button onClick={() => irPara("documentos")}>Ver documentos</Button>}
         />
      );
   }

   if (emPreAnalise) return <AnaliseSkeleton mensagem="Lendo histórico… cerca de 1 min" />;

   const modoCoordenacao = !!acaoDoCaso(caso, "RESPONDER_ITEM_COORDENACAO") && caso.etapa === "AGUARDANDO_COORDENACAO";
   const indisponivel = analise.isError && analiseIndisponivel(analise.error);

   return (
      <AsyncState
         isLoading={analise.isLoading}
         isError={analise.isError}
         loading={<AnaliseSkeleton />}
         error={
            indisponivel ? (
               <EmptyPanel
                  icon={Hourglass}
                  title="A análise começa depois da pré-análise"
                  message="Este caso ainda não passou pela pré-análise, então não há grade para decidir."
               />
            ) : (
               <EmptyPanel
                  tone="crit"
                  icon={TriangleAlert}
                  title="Não foi possível carregar a análise"
                  message={lerErroApi(analise.error).message}
                  action={<Button onClick={() => void analise.refetch()}>Tentar de novo</Button>}
               />
            )
         }
      >
         {analise.data ? (
            <WorkspaceAnalise caso={caso} analise={analise.data} preAnalise={pre.data} modoCoordenacao={modoCoordenacao} />
         ) : null}
      </AsyncState>
   );
}
