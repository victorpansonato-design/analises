/**
 * Modo coordenação (docs/06 §4.3–4.5; enxuto desde 16/10/2026: o coordenador já sabe o que
 * analisar). Um card por disciplina perguntada: a pergunta da analista, matriz × histórico e o
 * parecer numa linha (`FormParecer`). O parecer vai para as observações do protocolo; ao terminar,
 * o card "Próximo passo" devolve a análise para a equipe.
 */
import { CheckCheck, ScanSearch } from "lucide-react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { MeterBar } from "@/components/core/meter-bar";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { horas, plural } from "@/lib/format";

import { ComparacaoCh, OrigensDoItem } from "@/features/analise/components/origem";
import { FormParecer, ParecerRegistrado, PerguntaDaAnalista } from "@/features/analise/components/parecer-form";
import { origensDoItem } from "@/features/analise/domain/analise.domain";
import type { ItemAnalise, ItemOrigem, RespostaEntrada } from "@/features/analise/types/analise.schema";

/** Matriz × histórico: ementa e CH do destino, origens com a CH comparada. */
export function MatrizXHistorico({ item, origens }: { item: ItemAnalise; origens: readonly ItemOrigem[] }) {
   return (
      <div className="grid grid-cols-2 gap-4 rounded-lg bg-surface-2 px-3 py-2.5 text-[12px]">
         <div className="min-w-0 space-y-0.5">
            <p className="text-[11px] font-medium text-ink-4">Matriz · {horas(item.ch)}</p>
            <p className="leading-relaxed text-ink-2">{item.ementa ?? "Ementa não cadastrada na matriz."}</p>
         </div>
         <div className="min-w-0 space-y-1">
            <p className="text-[11px] font-medium text-ink-4">Histórico</p>
            {origens.length ? (
               <>
                  <OrigensDoItem origens={origens} />
                  <ComparacaoCh origens={origens} chDestino={item.ch} className="text-[12px]" />
               </>
            ) : (
               <p className="text-ink-3">Sem disciplina correspondente.</p>
            )}
            {item.sugestao?.justificativa ? <p className="text-ink-3">IA: {item.sugestao.justificativa}</p> : null}
         </div>
      </div>
   );
}

interface CardPerguntaProps {
   item: ItemAnalise;
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   podeResponder: boolean;
   salvando: boolean;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada) => void;
   onConferir?: (item: ItemAnalise) => void;
}

function CardPergunta({ item, origemPorId, podeResponder, salvando, onResponder, onConferir }: CardPerguntaProps) {
   const respondida = item.estado === "RESPONDIDO" ? (item.pergunta?.resposta ?? null) : null;
   return (
      <article aria-label={`Parecer sobre ${item.disciplina}`} className="space-y-3 rounded-xl bg-card p-4">
         <header className="flex items-center gap-3">
            <p className="min-w-0 truncate text-[14px] font-semibold text-ink">
               {item.disciplina}{" "}
               <span className="font-mono text-[11.5px] font-normal text-ink-4">
                  {item.codigo ? `${item.codigo} · ` : ""}
                  {horas(item.ch)}
               </span>
            </p>
            <span className="ml-auto shrink-0">
               {respondida ? <Status tone="ok">Registrado</Status> : <Status tone="warn">Aguardando parecer</Status>}
            </span>
            {onConferir ? (
               <Button size="xs" variant="ghost" icon={<ScanSearch aria-hidden />} onClick={() => onConferir(item)}>
                  Lado a lado
               </Button>
            ) : null}
         </header>
         <PerguntaDaAnalista item={item} />
         <MatrizXHistorico item={item} origens={origensDoItem(item, origemPorId)} />
         {respondida ? (
            <ParecerRegistrado resposta={respondida} />
         ) : podeResponder ? (
            <FormParecer item={item} contexto="card" salvando={salvando} onResponder={e => onResponder(item, e)} />
         ) : null}
      </article>
   );
}

interface ModoCoordenacaoProps {
   itens: ItemAnalise[];
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   podeResponder: boolean;
   motivoBloqueio: string | null;
   salvando: boolean;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada) => void;
   onAprovarTodas: () => void;
   onConferir?: (item: ItemAnalise) => void;
}

export function ModoCoordenacao({
   itens,
   origemPorId,
   podeResponder,
   motivoBloqueio,
   salvando,
   onResponder,
   onAprovarTodas,
   onConferir,
}: ModoCoordenacaoProps) {
   const abertas = itens.filter(i => i.estado === "PERGUNTA_ABERTA").length;
   const feitas = itens.length - abertas;
   if (itens.length === 0) {
      return <EmptyPanel compact title="Nenhuma pergunta para a coordenação" message="Use o filtro Todas para ver a grade." />;
   }
   return (
      <div className="space-y-3 print:hidden">
         <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-card px-4 py-3">
            <p className="text-[13.5px] font-semibold text-ink">
               {abertas > 0 ? plural(abertas, "parecer pendente", "pareceres pendentes") : "Pareceres registrados"}
            </p>
            <span className="flex items-center gap-2">
               <MeterBar value={feitas / itens.length} height={4} label={`${feitas} de ${itens.length} pareceres`} className="w-24" />
               <span className="font-mono text-[11.5px] text-ink-3 tabular-nums">
                  {feitas} de {itens.length}
               </span>
            </span>
            {abertas === 0 && podeResponder ? <span className="text-[12px] text-ink-3">Devolva no Próximo passo, acima.</span> : null}
            {!podeResponder && motivoBloqueio ? <span className="text-[12px] text-ink-3">{motivoBloqueio}</span> : null}
            {podeResponder && abertas > 1 ? (
               <Button className="ml-auto" size="xs" variant="ghost" icon={<CheckCheck />} onClick={onAprovarTodas} disabled={salvando}>
                  Concordar com todas as sugestões
               </Button>
            ) : null}
         </div>
         {itens.map(item => (
            <CardPergunta
               key={item.id}
               item={item}
               origemPorId={origemPorId}
               podeResponder={podeResponder}
               salvando={salvando}
               onResponder={onResponder}
               onConferir={onConferir}
            />
         ))}
      </div>
   );
}
