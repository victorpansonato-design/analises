/**
 * DataList (design system §10.11): pares rótulo/valor em grade. Valor ausente nunca fica em branco:
 * aparece "Não informado" em tinta quieta, para ninguém confundir vazio com carregando.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface DataItem {
   label: ReactNode;
   value: ReactNode;
   mono?: boolean;
   tone?: "plain" | "crit";
   /** Ocupa a linha inteira da grade. */
   wide?: boolean;
}

const COLS = {
   1: "grid-cols-1",
   2: "grid-cols-1 sm:grid-cols-2",
   3: "grid-cols-1 sm:grid-cols-3",
   4: "grid-cols-2 sm:grid-cols-4",
} as const;

export const NAO_INFORMADO = "Não informado";

function vazio(v: ReactNode): boolean {
   return v === null || v === undefined || v === "";
}

export function DataList({
   items,
   columns = 2,
   className,
}: {
   items: readonly DataItem[];
   columns?: keyof typeof COLS;
   className?: string;
}) {
   return (
      <dl className={cn("grid gap-x-5 gap-y-3", COLS[columns], className)}>
         {items.map((it, i) => (
            <div key={i} className={cn("min-w-0", it.wide && "col-span-full")}>
               <dt className="text-[11px] font-medium text-ink-4">{it.label}</dt>
               <dd
                  className={cn(
                     "mt-0.5 text-[13px] font-medium break-words",
                     vazio(it.value) ? "font-normal text-ink-4" : it.tone === "crit" ? "text-crit-ink" : "text-ink",
                     it.mono && !vazio(it.value) && "font-mono",
                  )}
               >
                  {vazio(it.value) ? NAO_INFORMADO : it.value}
               </dd>
            </div>
         ))}
      </dl>
   );
}
