/** Lista ampla e página dedicada por protocolo, com navegação e filtros na URL. */
import { motion } from "motion/react";
import { FilePlus2 } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAgora } from "@/hooks/use-agora";
import { pageVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AnaliseTab } from "@/features/analise";
import { AbaDados, FilaCasos, FunilEtapas, PainelCaso, acaoDoCaso, useCasosUrlState, type RenderAba } from "@/features/casos";
import { MensagemCandidato } from "@/features/comunicacao";
import { DocumentosTab } from "@/features/documentos";
import { PropostaTab } from "@/features/proposta";
import { NovoProtocoloDrawer } from "@/features/protocolo";
import { HistoricoCaso } from "@/features/timeline";

export default function AnalisesPage() {
   const url = useCasosUrlState();
   const agora = useAgora();
   const listagem = !url.casoId;
   const [params] = useSearchParams();
   const navegar = useNavigate();
   // Quem veio dos pareceres (coordenação) volta para os pareceres.
   const voltar = () => (params.get("voltar") === "pareceres" ? navegar("/pareceres") : url.abrirCaso(null));
   const renderAba: RenderAba = (aba, caso) => {
      switch (aba) {
         case "analise":
            return <AnaliseTab caso={caso} />;
         case "documentos":
            return <DocumentosTab caso={caso} />;
         case "dados":
            return <AbaDados caso={caso} agora={agora} />;
         case "proposta":
            return <PropostaTab caso={caso} />;
      }
   };
   // Links antigos do painel de indicadores: a área agora é da gestão comercial (`/gestao`).
   if (url.painel === "indicadores") return <Navigate to="/gestao" replace />;
   return (
      <div id="conteudo" tabIndex={-1} className={cn("flex flex-col gap-4", !listagem && "scroll-slim h-full min-h-0 overflow-y-auto")}>
         {url.casoId ? (
            <PainelCaso
               renderAba={renderAba}
               renderLateral={caso => (
                  <HistoricoCaso
                     key={caso.id}
                     caso={caso}
                     renderMensagem={
                        acaoDoCaso(caso, "ENVIAR_MENSAGEM")
                           ? onEnviada => <MensagemCandidato caso={caso} onEnviada={onEnviada} />
                           : undefined
                     }
                  />
               )}
               onVoltar={voltar}
            />
         ) : (
            <>
               <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 px-1 pt-1">
                  <div>
                     <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[28px]">
                        Controle de análises
                     </h1>
                     <p className="mt-1 text-[13px] text-ink-3">Do protocolo à matrícula. Tudo no lugar certo para seguir em frente.</p>
                  </div>
                  <div className="flex items-center gap-2">
                     <Button variant="primary" size="md" icon={<FilePlus2 aria-hidden />} onClick={() => url.abrirNovoProtocolo()}>
                        Novo protocolo
                     </Button>
                  </div>
               </div>
               <FunilEtapas />
               <motion.div variants={pageVariants} initial="initial" animate="animate" className="shrink-0">
                  <FilaCasos />
               </motion.div>
            </>
         )}
         <NovoProtocoloDrawer
            open={url.novo}
            onOpenChange={aberto => !aberto && url.fecharNovoProtocolo()}
            onCriado={id => url.abrirCaso(id)}
            onAbrirCaso={id => url.abrirCaso(id)}
            deCasoId={url.deCasoId}
         />
      </div>
   );
}
