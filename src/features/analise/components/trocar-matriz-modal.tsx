/**
 * Trocar matriz (antigo "Enviar mudança de matriz", docs/06 §8): escolhe a matriz, vê a PRÉVIA do
 * impacto ("N decisões serão mapeadas automaticamente, M precisarão de revisão") e só então confirma
 * a transição `ALTERAR_DESTINO` (motivo `MUDANCA_MATRIZ`). A ação só aparece se a API a devolveu.
 */
import { Layers } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";

import { Notice } from "@/components/core/notice";
import { Modal } from "@/components/core/overlay";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useMatrizes, useTransicao, type CasoDetalhe } from "@/features/casos";
import { horas, plural } from "@/lib/format";
import { pressSubtle } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { usePreviaMatriz } from "@/features/analise/api/analise.queries";

interface TrocarMatrizModalProps {
   caso: CasoDetalhe;
   matrizAtualId: string;
   aberto: boolean;
   onFechar: () => void;
}

export function TrocarMatrizModal({ caso, matrizAtualId, aberto, onFechar }: TrocarMatrizModalProps) {
   const matrizes = useMatrizes(aberto ? caso.destino.cursoId : null);
   const [escolhida, setEscolhida] = useState<string | null>(null);
   const previa = usePreviaMatriz(caso.id, escolhida);
   const transicao = useTransicao(caso);
   const outras = (matrizes.data ?? []).filter(m => m.id !== matrizAtualId);

   function fechar() {
      setEscolhida(null);
      onFechar();
   }

   function confirmar() {
      if (!escolhida) return;
      transicao.mutate(
         { acao: "ALTERAR_DESTINO", motivo: "MUDANCA_MATRIZ", novoDestino: { ...caso.destino, matrizId: escolhida } },
         { onSuccess: fechar },
      );
   }

   return (
      <Modal
         open={aberto}
         onOpenChange={a => !a && fechar()}
         icon={Layers}
         title="Trocar matriz de destino"
         description="As decisões que existem nas duas matrizes são mapeadas; o resto volta para revisão."
         footer={
            <>
               <Button variant="ghost" onClick={fechar}>
                  Cancelar
               </Button>
               <Button variant="primary" onClick={confirmar} disabled={!escolhida || !previa.data || transicao.isPending}>
                  Trocar matriz
               </Button>
            </>
         }
      >
         <div className="space-y-4 px-5 py-4">
            {matrizes.isLoading ? (
               <Skeleton className="h-16 w-full" />
            ) : outras.length === 0 ? (
               <p className="text-[12.5px] text-ink-3">Este curso não tem outra matriz cadastrada.</p>
            ) : (
               <div role="radiogroup" aria-label="Matriz" className="space-y-1.5">
                  {outras.map(m => (
                     <motion.button
                        key={m.id}
                        type="button"
                        role="radio"
                        aria-checked={escolhida === m.id}
                        whileTap={pressSubtle}
                        onClick={() => setEscolhida(m.id)}
                        className={cn(
                           "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors",
                           escolhida === m.id ? "bg-brand-soft" : "bg-surface-2 hover:bg-surface-3",
                        )}
                     >
                        <span className="text-[13px] font-medium text-ink">
                           Matriz <span className="font-mono">{m.codigo}</span>
                        </span>
                        <span className="flex items-center gap-3">
                           <span className="font-mono text-[12px] text-ink-3">{horas(m.chTotal)}</span>
                           {m.vigente ? <Status tone="ok">Vigente</Status> : <Status tone="muted">Anterior</Status>}
                        </span>
                     </motion.button>
                  ))}
               </div>
            )}

            {escolhida ? (
               previa.isLoading ? (
                  <Skeleton className="h-14 w-full" />
               ) : previa.data ? (
                  <Notice tone={previa.data.revisar > 0 || previa.data.semCorrespondencia > 0 ? "warn" : "info"} title="O que acontece">
                     {plural(previa.data.mapeadas, "decisão será mapeada", "decisões serão mapeadas")} automaticamente,{" "}
                     {plural(previa.data.revisar, "disciplina precisará", "disciplinas precisarão")} de revisão
                     {previa.data.semCorrespondencia > 0
                        ? ` e ${plural(previa.data.semCorrespondencia, "decisão não tem", "decisões não têm")} disciplina equivalente na nova matriz`
                        : ""}
                     . A pré-análise roda de novo para a nova matriz.
                  </Notice>
               ) : (
                  <p className="text-[12px] text-crit-ink">Não foi possível calcular a prévia. Escolha a matriz de novo.</p>
               )
            ) : (
               <p className="text-[12px] text-ink-3">Escolha a matriz para ver a prévia do impacto.</p>
            )}
         </div>
      </Modal>
   );
}
