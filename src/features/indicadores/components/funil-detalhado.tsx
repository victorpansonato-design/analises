/**
 * Funil detalhado do painel: uma barra horizontal por etapa com total, em atenção e atrasados.
 * Cor codifica só a escala de prazo (DS §11): tinta no prazo, âmbar em atenção e vermelho SÓ no
 * atrasado. Os números vêm do mesmo `funil` da resposta de `/indicadores`, a mesma fonte da faixa
 * da tela. A figura é `role="img"` com descrição e a série também sai em texto.
 */
import { ROTULO_ETAPA, type Funil } from "@/features/casos";
import { int, lista, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export function FunilDetalhado({ funil }: { funil: Funil }) {
   const maior = Math.max(1, ...funil.etapas.map(e => e.total));
   const linhaTexto = (e: Funil["etapas"][number]) =>
      `${ROTULO_ETAPA[e.etapa]}: ${lista([plural(e.total, "caso", "casos"), `${int(e.emAtencao)} em atenção`, plural(e.atrasados, "atrasado", "atrasados")])}`;
   const total = funil.etapas.reduce((s, e) => s + e.total, 0);

   return (
      <figure className="rounded-xl bg-card p-4">
         <div
            role="img"
            aria-label={`Funil por etapa, ${plural(total, "caso ativo", "casos ativos")}. ${funil.etapas.map(linhaTexto).join(". ")}.`}
            className="space-y-2"
         >
            {funil.etapas.map(e => {
               const noPrazo = Math.max(0, e.total - e.emAtencao - e.atrasados);
               const pct = (n: number) => `${(n / maior) * 100}%`;
               return (
                  <div key={e.etapa} className="grid grid-cols-[minmax(92px,140px)_1fr_auto] items-center gap-3">
                     <span className="truncate text-[12.5px] text-ink-2">{ROTULO_ETAPA[e.etapa]}</span>
                     <div className="flex h-2.5 overflow-hidden rounded-full bg-track">
                        <span className="h-full bg-ink-3" style={{ width: pct(noPrazo) }} />
                        <span className="h-full bg-warn" style={{ width: pct(e.emAtencao) }} />
                        <span className="h-full bg-crit" style={{ width: pct(e.atrasados) }} />
                     </div>
                     <span className="flex items-baseline justify-end gap-3 font-mono text-[12px] tabular-nums">
                        <span className="w-9 text-right font-medium text-ink">{int(e.total)}</span>
                        <span className="w-16 text-right text-ink-3">{int(e.emAtencao)} at.</span>
                        <span className={cn("w-16 text-right", e.atrasados > 0 ? "font-medium text-crit-ink" : "text-ink-4")}>
                           {int(e.atrasados)} atr.
                        </span>
                     </span>
                  </div>
               );
            })}
         </div>
         <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-hairline pt-2.5 text-[11px] text-ink-3">
            <Legenda className="bg-ink-3">No prazo</Legenda>
            <Legenda className="bg-warn">Em atenção (at.)</Legenda>
            <Legenda className="bg-crit">Atrasados (atr.)</Legenda>
         </figcaption>
         <ul className="sr-only">
            {funil.etapas.map(e => (
               <li key={e.etapa}>{linhaTexto(e)}</li>
            ))}
         </ul>
      </figure>
   );
}

function Legenda({ className, children }: { className: string; children: string }) {
   return (
      <span className="inline-flex items-center gap-1.5">
         <span aria-hidden className={cn("size-2 rounded-full", className)} />
         {children}
      </span>
   );
}
