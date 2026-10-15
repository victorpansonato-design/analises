/**
 * Aba Proposta (docs/05 §3.4): resumo para o candidato, condição financeira, situação e as ações de
 * matrícula (enviar, registrar resposta, efetivar).
 *
 * - Antes de `CONCLUIR_ANALISE` não há proposta: nenhum número de aproveitamento chega ao candidato
 *   antes de a análise ser concluída e congelada (princípio 7). A aba nem busca dados.
 * - As ações são secundárias aqui; a primária do caso vive no card "Próximo passo", que navega para
 *   `?aba=proposta&acao=…`. Esta aba abre o modal correspondente e remove o parâmetro ao fechar.
 * - Ação que a API não devolveu não aparece; desabilitada mostra o motivo em texto.
 */
import { FileClock, RotateCcw } from "lucide-react";
import { useEffect } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgora } from "@/hooks/use-agora";

import { podeNoCaso, type CasoDetalhe } from "@/features/casos";

import { useProposta } from "@/features/proposta/api/proposta.queries";
import { CondicaoFinanceira } from "@/features/proposta/components/condicao-financeira";
import { EfetivarMatriculaModal } from "@/features/proposta/components/efetivar-matricula-modal";
import { EnviarPropostaModal } from "@/features/proposta/components/enviar-proposta-modal";
import { RegistrarRespostaModal } from "@/features/proposta/components/registrar-resposta-modal";
import { ResumoCongelado } from "@/features/proposta/components/resumo-congelado";
import { SituacaoProposta } from "@/features/proposta/components/situacao-proposta";
import { ACOES_PROPOSTA, botaoDaProposta, type BotaoProposta } from "@/features/proposta/domain/proposta";
import { useAcaoPropostaUrl } from "@/features/proposta/hooks/use-acao-proposta-url";

export interface PropostaTabProps {
   caso: CasoDetalhe;
}

function Carregando() {
   return (
      <div className="space-y-4" aria-busy="true" aria-label="Carregando a proposta">
         <Skeleton className="h-52 w-full rounded-xl" />
         <Skeleton className="h-32 w-full rounded-xl" />
         <Skeleton className="h-36 w-full rounded-xl" />
      </div>
   );
}

export function PropostaTab({ caso }: PropostaTabProps) {
   const agora = useAgora();
   const congelado = !!caso.resumoCongeladoEm;
   const proposta = useProposta(caso.id, congelado);
   const { acao, abrir, fechar } = useAcaoPropostaUrl();

   const botoes = ACOES_PROPOSTA.map(a => botaoDaProposta(caso, a)).filter((b): b is BotaoProposta => b !== null);
   const botaoDe = (a: string) => botoes.find(b => b.acao === a) ?? null;
   const aberto = acao ? botaoDe(acao) : null;

   // `?acao=` de uma ação que não existe ou não pode agora (link antigo, papel errado): limpa a URL.
   // O botão da aba continua explicando o motivo.
   const acaoInvalida = !!acao && !aberto?.habilitada;
   useEffect(() => {
      if (acaoInvalida) fechar();
   }, [acaoInvalida, fechar]);

   if (!congelado) {
      return (
         <EmptyPanel
            icon={FileClock}
            title="A proposta aparece quando a análise for concluída"
            message="Nenhum número de aproveitamento chega ao candidato antes disso. Quando a analista concluir, o resumo é congelado e a proposta fica pronta aqui."
         />
      );
   }

   const enviar = botaoDe("ENVIAR_PROPOSTA");
   const responder = botaoDe("REGISTRAR_RESPOSTA");
   const efetivar = botaoDe("EFETIVAR_MATRICULA");

   return (
      <>
         <AsyncState
            isLoading={proposta.isLoading}
            isError={proposta.isError}
            loading={<Carregando />}
            error={
               <EmptyPanel
                  tone="crit"
                  title="Não foi possível carregar a proposta"
                  message="O resumo e a condição financeira não chegaram. Tente de novo; se continuar, avise o suporte."
                  action={
                     <Button size="xs" icon={<RotateCcw />} onClick={() => void proposta.refetch()}>
                        Tentar de novo
                     </Button>
                  }
               />
            }
         >
            {proposta.data ? (
               <div className="space-y-4">
                  <ResumoCongelado
                     resumo={proposta.data.resumo}
                     congeladoEm={proposta.data.congeladoEm ?? caso.resumoCongeladoEm}
                     agora={agora}
                  />
                  <CondicaoFinanceira
                     podeVer={podeNoCaso(caso, "VER_FINANCEIRO")}
                     financeiro={proposta.data.financeiro}
                     pendenciaFinanceiraAnterior={proposta.data.pendenciaFinanceiraAnterior}
                  />
                  <SituacaoProposta caso={caso} proposta={proposta.data} botoes={botoes} onAcao={abrir} agora={agora} />
               </div>
            ) : null}
         </AsyncState>

         <EnviarPropostaModal
            caso={caso}
            proposta={proposta.data}
            botao={enviar}
            open={acao === "ENVIAR_PROPOSTA" && !!enviar?.habilitada}
            onClose={fechar}
         />
         <RegistrarRespostaModal
            caso={caso}
            botao={responder}
            open={acao === "REGISTRAR_RESPOSTA" && !!responder?.habilitada}
            onClose={fechar}
         />
         <EfetivarMatriculaModal
            caso={caso}
            botao={efetivar}
            open={acao === "EFETIVAR_MATRICULA" && !!efetivar?.habilitada}
            onClose={fechar}
         />
      </>
   );
}
