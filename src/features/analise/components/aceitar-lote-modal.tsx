/**
 * Confirmação do "Aceitar sugestões de alta confiança" (docs/06 §3). Mostra a lista resumida do que
 * vai virar decisão: só itens SUGERIDO com confiança `IA.loteSomente` (Alta e Regra). A confirmação
 * é humana e explícita; depois o toast oferece "Desfazer" por `UI.desfazerMs`.
 */
import { ListChecks } from "lucide-react";

import { Modal } from "@/components/core/overlay";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { ROTULO_DECISAO } from "@/features/casos";
import { lista, plural } from "@/lib/format";

import { contarPorDecisao, TOM_CONFIANCA } from "@/features/analise/domain/analise.domain";
import { ROTULO_CONFIANCA, type ItemAnalise } from "@/features/analise/types/analise.schema";

interface AceitarLoteModalProps {
   itens: ItemAnalise[];
   aberto: boolean;
   salvando: boolean;
   onFechar: () => void;
   onConfirmar: () => void;
}

export function AceitarLoteModal({ itens, aberto, salvando, onFechar, onConfirmar }: AceitarLoteModalProps) {
   const porDecisao = contarPorDecisao(itens);
   const resumo = lista(
      (Object.keys(porDecisao) as (keyof typeof porDecisao)[])
         .filter(d => porDecisao[d] > 0)
         .map(d => `${porDecisao[d]} ${ROTULO_DECISAO[d].toLowerCase()}`),
   );
   return (
      <Modal
         open={aberto}
         onOpenChange={a => !a && onFechar()}
         icon={ListChecks}
         title={`Aceitar ${plural(itens.length, "sugestão", "sugestões")} de alta confiança`}
         description={resumo ? `Viram decisão: ${resumo}.` : undefined}
         footer={
            <>
               <Button variant="ghost" onClick={onFechar}>
                  Cancelar
               </Button>
               <Button variant="primary" onClick={onConfirmar} disabled={salvando || itens.length === 0} data-autofocus>
                  Confirmar {plural(itens.length, "decisão", "decisões")}
               </Button>
            </>
         }
      >
         <ul className="divide-y divide-hairline px-5 py-2">
            {itens.map(i => (
               <li key={i.id} className="flex items-center justify-between gap-3 py-1.5">
                  <span className="min-w-0 truncate text-[12.5px] text-ink-2">{i.disciplina}</span>
                  <span className="flex shrink-0 items-center gap-3">
                     {i.sugestao ? (
                        <Status tone={TOM_CONFIANCA[i.sugestao.confianca]}>{ROTULO_CONFIANCA[i.sugestao.confianca]}</Status>
                     ) : null}
                     <span className="w-16 text-right text-[12px] font-medium text-ink">
                        {i.sugestao ? ROTULO_DECISAO[i.sugestao.decisao] : "Não informado"}
                     </span>
                  </span>
               </li>
            ))}
         </ul>
         <p className="px-5 pb-4 text-[12px] text-ink-3">Itens de confiança média ou baixa ficam de fora: esses pedem o seu julgamento.</p>
      </Modal>
   );
}
