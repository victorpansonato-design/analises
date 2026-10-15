/**
 * Sino de notificações (docs/12 H7.2). Regras:
 * - UM contador mono discreto, em tinta (não em vermelho: a urgência fica no item, não no sino).
 *   O `aria-label` diz a contagem por extenso ("Notificações, 3 não lidas").
 * - Não lida se distingue por PESO de tinta (600 e `text-ink`), não por cor; o ponto é só reforço.
 *   Vermelho só no ícone de prazo estourado (DS regra 4: o nível mais urgente).
 * - Clicar abre o caso (`onAbrirCaso`) e marca como lida de forma otimista.
 * - Vazio com frase, nunca lista vazia muda. Polling `UI.pollingMs`.
 * - Teclado: Enter/Espaço abrem o item (botão nativo), ↑/↓ andam entre itens, Escape fecha (Radix).
 */
import {
   AlarmClock,
   AtSign,
   Bell,
   CircleAlert,
   Clock,
   MessageCircleQuestion,
   MessageSquare,
   MessageSquareReply,
   RotateCcw,
   UserPlus,
   type LucideIcon,
} from "lucide-react";
import { useState, type KeyboardEvent } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarcarLida, useMarcarTodasLidas } from "@/features/notificacoes/api/notificacoes.mutations";
import { useNotificacoes } from "@/features/notificacoes/api/notificacoes.queries";
import type { Notificacao, TipoNotificacao } from "@/features/notificacoes/types/notificacao.schema";
import { useAgora } from "@/hooks/use-agora";
import { plural, relative } from "@/lib/format";
import { rotuloSino } from "@/features/notificacoes/domain/rotulo-sino";
import { cn } from "@/lib/utils";

const ICONE: Record<TipoNotificacao, LucideIcon> = {
   ATRIBUIDO: UserPlus,
   PERGUNTA_COORDENACAO: MessageCircleQuestion,
   RESPOSTA_COORDENACAO: MessageSquareReply,
   MENCAO: AtSign,
   SLA_ATENCAO: Clock,
   SLA_ESTOURADO: AlarmClock,
   MENSAGEM_CANDIDATO: MessageSquare,
   FALHA_ENVIO: CircleAlert,
};

const TOM_ICONE: Partial<Record<TipoNotificacao, string>> = {
   SLA_ESTOURADO: "text-crit-ink",
   SLA_ATENCAO: "text-warn-ink",
};

interface SinoNotificacoesProps {
   onAbrirCaso: (casoId: string) => void;
}

export function SinoNotificacoes({ onAbrirCaso }: SinoNotificacoesProps) {
   const [aberto, setAberto] = useState(false);
   const consulta = useNotificacoes();
   const { marcar } = useMarcarLida();
   const { marcarTodas, isPending: marcandoTodas } = useMarcarTodasLidas();
   const agora = useAgora();
   const lista = consulta.data ?? [];
   const naoLidas = lista.filter(n => !n.lida);

   const abrir = (n: Notificacao) => {
      if (!n.lida) marcar(n.id);
      setAberto(false);
      onAbrirCaso(n.casoId);
   };

   const andar = (e: KeyboardEvent<HTMLUListElement>) => {
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      const itens = [...e.currentTarget.querySelectorAll<HTMLButtonElement>("button[data-item]")];
      const atual = itens.indexOf(document.activeElement as HTMLButtonElement);
      const proximo = e.key === "ArrowDown" ? Math.min(itens.length - 1, atual + 1) : Math.max(0, atual - 1);
      itens[proximo]?.focus();
      e.preventDefault();
   };

   return (
      <Popover open={aberto} onOpenChange={setAberto}>
         <PopoverTrigger asChild>
            <Button
               variant="ghost"
               size="sm"
               square
               aria-label={rotuloSino(naoLidas.length)}
               icon={<Bell aria-hidden />}
               className="relative"
            >
               {naoLidas.length > 0 ? (
                  <span
                     aria-hidden
                     className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-ink px-1 font-mono text-[10px] leading-none font-medium text-card"
                  >
                     {naoLidas.length > 99 ? "99+" : naoLidas.length}
                  </span>
               ) : null}
            </Button>
         </PopoverTrigger>
         <PopoverContent align="end" sideOffset={8} className="w-[min(372px,calc(100vw-2rem))] bg-card p-0 text-ink">
            <header className="flex items-center justify-between gap-3 border-b border-hairline px-4 py-3">
               <div>
                  <h2 className="text-[13px] font-semibold text-ink">Notificações</h2>
                  <p className="text-[11.5px] text-ink-3">
                     {naoLidas.length === 0 ? "Nada por ler" : plural(naoLidas.length, "não lida", "não lidas")}
                  </p>
               </div>
               {naoLidas.length > 0 ? (
                  <Button variant="ghost" size="xs" disabled={marcandoTodas} onClick={() => marcarTodas(naoLidas.map(n => n.id))}>
                     Marcar todas como lidas
                  </Button>
               ) : null}
            </header>
            <AsyncState
               isLoading={consulta.isLoading}
               isError={consulta.isError && !consulta.data}
               isEmpty={lista.length === 0}
               loading={
                  <div className="space-y-3 px-4 py-4" aria-label="Carregando notificações">
                     {[0, 1, 2].map(i => (
                        <div key={i} className="flex gap-3">
                           <Skeleton className="size-7 rounded-lg" />
                           <div className="flex-1 space-y-1.5">
                              <Skeleton className="h-3 w-3/4" />
                              <Skeleton className="h-3 w-1/2" />
                           </div>
                        </div>
                     ))}
                  </div>
               }
               error={
                  <EmptyPanel
                     compact
                     tone="crit"
                     title="Não foi possível carregar as notificações"
                     message="Tentamos de novo sozinhos a cada 30 segundos."
                     action={
                        <Button variant="secondary" size="xs" icon={<RotateCcw />} onClick={() => consulta.refetch()}>
                           Tentar de novo
                        </Button>
                     }
                  />
               }
               empty={<EmptyPanel compact icon={Bell} title="Tudo em dia." message="Avisamos quando algo precisar de você." />}
            >
               <ul className="scroll-slim max-h-[420px] divide-y divide-hairline overflow-y-auto" onKeyDown={andar}>
                  {lista.map(n => {
                     const Icone = ICONE[n.tipo];
                     return (
                        <li key={n.id}>
                           <button
                              type="button"
                              data-item
                              onClick={() => abrir(n)}
                              className="flex w-full gap-3 px-4 py-3 text-left transition-colors outline-none hover:bg-surface-hover focus-visible:bg-surface-hover"
                           >
                              <span
                                 className={cn(
                                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2",
                                    TOM_ICONE[n.tipo] ?? "text-ink-3",
                                 )}
                              >
                                 <Icone className="size-3.5" aria-hidden />
                              </span>
                              <span className="min-w-0 flex-1">
                                 <span
                                    className={cn(
                                       "block text-[12.5px] leading-snug",
                                       n.lida ? "font-normal text-ink-3" : "font-semibold text-ink",
                                    )}
                                 >
                                    {n.titulo}
                                    {n.lida ? null : <span className="sr-only"> (não lida)</span>}
                                 </span>
                                 <span className={cn("mt-0.5 block truncate text-[12px]", n.lida ? "text-ink-4" : "text-ink-2")}>
                                    {n.detalhe || "Sem detalhe"}
                                 </span>
                                 <span className="mt-1 block text-[11px] text-ink-4">{relative(n.em, agora)}</span>
                              </span>
                              {n.lida ? null : <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ink" />}
                           </button>
                        </li>
                     );
                  })}
               </ul>
            </AsyncState>
         </PopoverContent>
      </Popover>
   );
}
