/**
 * Link do aluno na faixa azul do caso: o endereço público do acompanhamento, gerado com o protocolo,
 * para a equipe mandar pelo WhatsApp. Copiar, ver como o aluno vê (prévia) ou abrir em outra aba.
 */
import { Copy, ExternalLink, Smartphone } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { Modal } from "@/components/core/overlay";
import { Button } from "@/components/ui/button";
import { env } from "@/config/env";
import { press } from "@/lib/motion";
import { notificar } from "@/lib/notify";

import type { CasoDetalhe } from "@/features/casos";

import { AcompanhamentoAluno } from "@/features/acompanhamento/components/acompanhamento-aluno";
import { urlAcompanhamento } from "@/features/acompanhamento/domain/acompanhamento";

export function LinkAluno({ caso }: { caso: CasoDetalhe }) {
   const [previa, setPrevia] = useState(false);
   const token = caso.tokenAcompanhamento;
   if (!token) return null;
   const url = urlAcompanhamento(token, window.location.origin, env.baseUrl);

   const copiar = async () => {
      try {
         await navigator.clipboard.writeText(url);
         notificar({ titulo: "Link do aluno copiado", detalhe: "Cole na conversa do WhatsApp para o aluno acompanhar o pedido." });
      } catch {
         notificar({ tom: "warn", titulo: "Não foi possível copiar", detalhe: url });
      }
   };

   return (
      <div className="link-aluno flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl py-2 pr-2 pl-3.5">
         <div className="min-w-0">
            <p className="text-[12px] font-medium">Link do aluno</p>
            <p className="max-w-56 truncate font-mono text-[11px] opacity-75" title={url}>
               {url.replace(/^https?:\/\//, "")}
            </p>
         </div>
         <div className="flex items-center gap-1.5">
            <Button size="xs" icon={<Copy aria-hidden />} onClick={() => void copiar()}>
               Copiar
            </Button>
            <Button size="xs" icon={<Smartphone aria-hidden />} onClick={() => setPrevia(true)}>
               Prévia
            </Button>
            <motion.a
               whileTap={press}
               href={url}
               target="_blank"
               rel="noopener noreferrer"
               className="botao-faixa inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors [&_svg]:size-3.5"
            >
               <ExternalLink aria-hidden />
               Abrir
            </motion.a>
         </div>
         <Modal
            open={previa}
            onOpenChange={setPrevia}
            icon={Smartphone}
            size="sm"
            title="Prévia do link do aluno"
            description="Assim o aluno vê o acompanhamento no celular. Atualiza sozinho a cada etapa."
            footer={
               <>
                  <Button size="sm" icon={<Copy aria-hidden />} onClick={() => void copiar()}>
                     Copiar link
                  </Button>
                  <Button
                     variant="primary"
                     size="sm"
                     icon={<ExternalLink aria-hidden />}
                     onClick={() => window.open(url, "_blank", "noopener")}
                  >
                     Abrir em nova aba
                  </Button>
               </>
            }
         >
            <div className="p-4">
               <div className="scroll-slim mx-auto h-[min(680px,62vh)] w-full max-w-97.5 overflow-y-auto rounded-[28px] bg-workspace ring-8 ring-surface-3">
                  <AcompanhamentoAluno token={token} embutido />
               </div>
            </div>
         </Modal>
      </div>
   );
}
