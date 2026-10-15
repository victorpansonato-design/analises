/**
 * Visualizador do arquivo (gaveta lateral, docs/05 §3.4). A URL é temporária e cada abertura gera
 * log de acesso `documento.visualizado` (LGPD, docs/11 §2): a gaveta diz isso a quem abre.
 * Aceitar e recusar ficam no rodapé para decidir sem fechar o documento.
 */
import { FileSearch } from "lucide-react";
import type { ReactNode } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Drawer } from "@/components/core/overlay";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { stamp, time } from "@/lib/format";

import { ROTULO_CANAL, type Arquivo, type ItemChecklist, type Visualizacao } from "@/features/documentos/types/documento.schema";

interface VisualizadorProps {
   alvo: { item: ItemChecklist; arquivo: Arquivo } | null;
   visualizacao: Visualizacao | undefined;
   carregando: boolean;
   erro: boolean;
   agora: Date;
   onOpenChange: (aberto: boolean) => void;
   onTentarDeNovo: () => void;
   acoes?: ReactNode;
}

export function VisualizadorDocumento({
   alvo,
   visualizacao,
   carregando,
   erro,
   agora,
   onOpenChange,
   onTentarDeNovo,
   acoes,
}: VisualizadorProps) {
   return (
      <Drawer
         open={!!alvo}
         onOpenChange={onOpenChange}
         width="xl"
         icon={FileSearch}
         title={alvo?.item.nome ?? "Documento"}
         description={
            alvo
               ? `${alvo.arquivo.nome} · ${ROTULO_CANAL[alvo.arquivo.canal]} · recebido ${stamp(alvo.arquivo.recebidoEm, agora).toLowerCase()}`
               : undefined
         }
         footer={acoes}
      >
         <div className="space-y-3 p-5">
            <AsyncState
               isLoading={carregando}
               isError={erro}
               isEmpty={!visualizacao}
               loading={<Skeleton className="h-[60vh] w-full rounded-xl" />}
               error={
                  <EmptyPanel
                     compact
                     tone="crit"
                     title="Não conseguimos abrir o arquivo"
                     message="O link temporário não foi gerado. Tente de novo; se persistir, peça o reenvio ao candidato."
                     action={
                        <button
                           type="button"
                           onClick={onTentarDeNovo}
                           className="text-[12px] font-semibold text-brand-text transition-colors hover:text-ink"
                        >
                           Tentar de novo
                        </button>
                     }
                  />
               }
               empty={<EmptyPanel compact title="Nada para mostrar" message="Escolha um arquivo do checklist para abrir." />}
            >
               {visualizacao ? (
                  <>
                     <div className="overflow-hidden rounded-xl bg-surface-2">
                        {visualizacao.mime.startsWith("image/") ? (
                           <img
                              src={visualizacao.url}
                              alt={`Prévia de ${alvo?.arquivo.nome ?? "documento"}`}
                              className="mx-auto block max-h-[70vh] w-auto"
                           />
                        ) : (
                           <iframe src={visualizacao.url} title={`Arquivo ${alvo?.arquivo.nome ?? ""}`} className="h-[70vh] w-full" />
                        )}
                     </div>
                     <p className="text-[11.5px] text-ink-4">
                        Acesso registrado na linha do tempo (LGPD). O link expira às {time(visualizacao.expiraEm)}.
                     </p>
                  </>
               ) : null}
            </AsyncState>
         </div>
      </Drawer>
   );
}
