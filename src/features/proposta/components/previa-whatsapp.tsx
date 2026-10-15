/**
 * Prévia da mensagem como o candidato verá no WhatsApp (docs/08 §4): o texto vem pronto do backend
 * (variáveis já preenchidas) e não é editável aqui. Os botões de resposta rápida aparecem abaixo da
 * bolha, como no aplicativo, mas não são clicáveis: é só a imagem do que vai chegar.
 */
import { CheckCheck } from "lucide-react";

import { time } from "@/lib/format";

interface PreviaWhatsappProps {
   texto: string;
   botoes?: readonly string[];
   agora: Date;
}

export function PreviaWhatsapp({ texto, botoes = [], agora }: PreviaWhatsappProps) {
   return (
      <figure aria-label="Prévia da mensagem no WhatsApp" className="rounded-xl bg-surface-3 p-4">
         <div className="max-w-[340px]">
            <div className="rounded-xl rounded-tl-sm bg-card px-3.5 pt-2.5 pb-1.5">
               <p className="text-[13px] leading-relaxed whitespace-pre-line text-ink">{texto}</p>
               <p className="mt-1 flex items-center justify-end gap-1 font-mono text-[10.5px] text-ink-4">
                  {time(agora)}
                  <CheckCheck className="size-3" aria-hidden />
               </p>
            </div>
            {botoes.length > 0 ? (
               <ul className="mt-1 grid gap-1" aria-label="Botões de resposta rápida">
                  {botoes.map(b => (
                     <li key={b} className="rounded-xl bg-card py-2 text-center text-[12.5px] font-medium text-brand-text">
                        {b}
                     </li>
                  ))}
               </ul>
            ) : null}
         </div>
         <figcaption className="mt-3 text-[11.5px] text-ink-4">
            Texto exato que o candidato recebe. Variáveis preenchidas pelo resumo congelado.
         </figcaption>
      </figure>
   );
}
