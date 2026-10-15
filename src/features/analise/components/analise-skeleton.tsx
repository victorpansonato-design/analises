/**
 * Skeleton com a geometria real da aba (barra, grupos de período com linhas de duas faixas e o
 * resumo lateral): a tela não "pula" quando os dados chegam. Com `mensagem`, explica a espera
 * (pré-análise: "Lendo histórico… cerca de 1 min").
 */
import { LoaderCircle } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

function LinhaFantasma() {
   return (
      <div className="flex items-start gap-3 px-4 py-3">
         <Skeleton className="mt-0.5 size-4 rounded-xs" />
         <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
         </div>
         <Skeleton className="hidden h-7 w-64 rounded-full lg:block" />
      </div>
   );
}

export function AnaliseSkeleton({ mensagem }: { mensagem?: string }) {
   return (
      <div className="space-y-3" aria-busy="true">
         {mensagem ? (
            <p role="status" className="flex items-center gap-2 text-[12.5px] text-ink-2">
               <LoaderCircle aria-hidden className="size-4 animate-spin text-ink-4" />
               {mensagem}
            </p>
         ) : (
            <span className="sr-only" role="status">
               Carregando a análise
            </span>
         )}
         <div className="space-y-2 rounded-xl bg-card p-4">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-8 w-full max-w-xl rounded-full" />
         </div>
         <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
            <div className="space-y-3">
               {[6, 5, 4].map((n, g) => (
                  <div key={g} className="overflow-hidden rounded-xl bg-card">
                     <div className="border-b border-hairline px-4 py-2.5">
                        <Skeleton className="h-3.5 w-48" />
                     </div>
                     <div className="divide-y divide-hairline">
                        {Array.from({ length: n }, (_, i) => (
                           <LinhaFantasma key={i} />
                        ))}
                     </div>
                  </div>
               ))}
            </div>
            <div className="hidden space-y-3 rounded-xl bg-card p-4 xl:block">
               <Skeleton className="h-4 w-2/3" />
               <Skeleton className="h-2 w-full" />
               <Skeleton className="h-4 w-1/2" />
               <Skeleton className="h-4 w-3/4" />
            </div>
         </div>
      </div>
   );
}
