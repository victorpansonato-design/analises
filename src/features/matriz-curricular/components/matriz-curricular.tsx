/**
 * Tela "Matriz Curricular": uma busca calma (nome ou código do curso, modalidade e turno) e, ao
 * abrir um currículo, a página inteira dele no lugar da busca. Tudo na URL (`useMatrizUrl`): o
 * "voltar" do navegador fecha o currículo e devolve a mesma busca.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect } from "react";

import { pageVariants } from "@/lib/motion";

import { BuscaMatrizes } from "@/features/matriz-curricular/components/busca-matrizes";
import { DetalheCurriculo } from "@/features/matriz-curricular/components/detalhe-curriculo";
import { useMatrizUrl } from "@/features/matriz-curricular/hooks/use-matriz-url";

export function MatrizCurricular() {
   const url = useMatrizUrl();

   useEffect(() => {
      const titulo = document.title;
      document.title = "Matriz Curricular | UNIANCHIETA";
      return () => {
         document.title = titulo;
      };
   }, []);

   return (
      <div id="conteudo" className="flex w-full max-w-6xl min-w-0 flex-col">
         <AnimatePresence mode="wait" initial={false}>
            <motion.div
               key={url.curriculo ? `curriculo-${url.curriculo}` : "busca"}
               variants={pageVariants}
               initial="initial"
               animate="animate"
               exit="exit"
               className="flex min-w-0 flex-col gap-5"
            >
               {url.curriculo ? <DetalheCurriculo id={url.curriculo} url={url} /> : <BuscaMatrizes url={url} />}
            </motion.div>
         </AnimatePresence>
      </div>
   );
}
