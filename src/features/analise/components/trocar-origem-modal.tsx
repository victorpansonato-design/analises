/**
 * Trocar a(s) disciplina(s) de origem de um item. Várias origens podem ser somadas
 * (`REGRAS_ANALISE.permitirSomaDeOrigens`); a comparação de CH aparece ao vivo, com denominador. Uma
 * origem já usada em outra dispensa é sinalizada (bloqueia a conclusão quando
 * `permitirOrigemRepetida` é falso).
 */
import { Replace } from "lucide-react";
import { useState } from "react";

import { Modal } from "@/components/core/overlay";
import { Button } from "@/components/ui/button";
import { REGRAS_ANALISE } from "@/features/casos";
import { horas } from "@/lib/format";

import { ComparacaoCh, OrigemLinha } from "@/features/analise/components/origem";
import { origemIds } from "@/features/analise/domain/analise.domain";
import type { ItemAnalise, ItemOrigem } from "@/features/analise/types/analise.schema";

interface TrocarOrigemModalProps {
   item: ItemAnalise | null;
   origem: readonly ItemOrigem[];
   salvando: boolean;
   onFechar: () => void;
   onSalvar: (item: ItemAnalise, origemIds: string[]) => void;
}

export function TrocarOrigemModal({ item, origem, salvando, onFechar, onSalvar }: TrocarOrigemModalProps) {
   // O pai remonta por `key={item.id}`: o estado inicial já nasce da origem atual do item.
   const [ids, setIds] = useState<string[]>(() => (item ? origemIds(item) : []));

   const escolhidas = origem.filter(o => ids.includes(o.id));
   const somar = REGRAS_ANALISE.permitirSomaDeOrigens;

   function alternar(id: string) {
      setIds(atual => (atual.includes(id) ? atual.filter(x => x !== id) : somar ? [...atual, id] : [id]));
   }

   return (
      <Modal
         open={!!item}
         onOpenChange={a => !a && onFechar()}
         icon={Replace}
         size="lg"
         title="Trocar origem"
         description={item ? `${item.disciplina} · ${horas(item.ch)}` : undefined}
         footer={
            <>
               <Button variant="ghost" onClick={onFechar}>
                  Cancelar
               </Button>
               <Button variant="primary" onClick={() => item && onSalvar(item, ids)} disabled={salvando}>
                  {ids.length ? "Dispensar com esta origem" : "Salvar sem origem (Regular)"}
               </Button>
            </>
         }
      >
         <div className="space-y-3 px-5 py-4">
            {item && escolhidas.length > 0 ? <ComparacaoCh origens={escolhidas} chDestino={item.ch} /> : null}
            <p className="text-[12px] text-ink-3">
               {somar ? "Marque uma ou mais disciplinas: as CHs são somadas." : "Escolha uma disciplina de origem."}
            </p>
            <ul className="divide-y divide-hairline">
               {origem.map(o => {
                  const outras = o.usadaEm.filter(x => x !== item?.id);
                  return (
                     <li key={o.id}>
                        <label className="flex cursor-pointer items-start gap-3 py-2">
                           <input
                              type="checkbox"
                              checked={ids.includes(o.id)}
                              onChange={() => alternar(o.id)}
                              className="mt-0.5 size-4 accent-brand"
                           />
                           <span className="min-w-0">
                              <OrigemLinha origem={o} />
                              {outras.length > 0 && !REGRAS_ANALISE.permitirOrigemRepetida ? (
                                 <span className="block text-[11.5px] text-warn-ink">
                                    Já sustenta outra dispensa: usar aqui bloqueia a conclusão.
                                 </span>
                              ) : null}
                           </span>
                        </label>
                     </li>
                  );
               })}
            </ul>
         </div>
      </Modal>
   );
}
