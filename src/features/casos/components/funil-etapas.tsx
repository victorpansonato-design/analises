/**
 * Navegação da fila em duas camadas (decisão de 14/10/2026):
 * 1. Processos, em cartões coloridos: Todos, Ingresso (externa, portador e retorno), Transferência
 *    interna e Aproveitamento de estudos.
 * 2. Filas de etapa dentro do processo, em blocos compactos na cor da fila. No aproveitamento, que
 *    termina na análise, "Liberadas matrícula" não aparece.
 * Todos ficam na cor forte, selecionados ou não (pedido da Bianca); o selecionado ganha anel na
 * própria cor e a etiqueta "Selecionado". Contagens: processos vêm de `funil.processos` (sem o
 * filtro de processo); etapas, do funil do processo escolhido. Mesma rota, mesma fonte da fila.
 */
import { motion } from "motion/react";
import { ArrowLeftRight, BookOpenCheck, Check, Layers, UserRoundPlus, type LucideIcon } from "lucide-react";

import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { int, plural } from "@/lib/format";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useFunil } from "@/features/casos/api/casos.queries";
import { PROCESSOS, filasDoProcesso, type TomProcesso } from "@/features/casos/domain/processos";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import type { Funil } from "@/features/casos/types/caso.schema";

const ICONE_PROCESSO: Record<TomProcesso, LucideIcon> = {
   todos: Layers,
   ingresso: UserRoundPlus,
   interna: ArrowLeftRight,
   aproveitamento: BookOpenCheck,
};

interface CartaoProcesso {
   id: string | null;
   nome: string;
   detalhe: string;
   tom: TomProcesso;
}

const CARTOES: readonly CartaoProcesso[] = [
   { id: null, nome: "Todos os processos", detalhe: "Os três processos juntos", tom: "todos" },
   ...PROCESSOS.map(p => ({ id: p.id, nome: p.nome, detalhe: p.detalhe, tom: p.tom })),
];

export function FunilEtapas() {
   const { filtros, alternarEtapa, setProcesso } = useCasosUrlState();
   const consulta = useFunil("TODOS", filtros.ciclo, filtros.processo);
   const etapaAtiva = filtros.q ? "TODAS" : (filtros.etapa ?? "TODAS");
   const processoAtivo = filtros.q ? null : filtros.processo;
   const filas = filasDoProcesso(processoAtivo);

   return (
      <nav aria-label="Processos e etapas das análises" className="shrink-0 space-y-2.5">
         <AsyncState
            isLoading={consulta.isLoading}
            isError={consulta.isError}
            loading={
               <div className="space-y-2.5">
                  <div className="grid grid-cols-4 gap-2.5">
                     {CARTOES.map(c => (
                        <Skeleton key={c.tom} className="h-[88px] rounded-xl" />
                     ))}
                  </div>
                  <Skeleton className="h-[62px] rounded-xl" />
               </div>
            }
            error={
               <div className="flex items-center gap-3 rounded-xl bg-card p-4 text-[13px]">
                  Não foi possível carregar as etapas.<Button onClick={() => void consulta.refetch()}>Tentar de novo</Button>
               </div>
            }
         >
            <div role="group" aria-label="Processos" className="grid grid-cols-2 gap-2.5 p-1 xl:grid-cols-4">
               {CARTOES.map(c => (
                  <AbaProcesso
                     key={c.tom}
                     cartao={c}
                     selecionado={processoAtivo === c.id}
                     contagem={contagemDoProcesso(consulta.data, c.id)}
                     onClick={() => setProcesso(c.id)}
                  />
               ))}
            </div>

            <div
               role="group"
               aria-label="Etapas"
               className="scroll-slim grid gap-2.5 overflow-x-auto p-1"
               style={{ gridTemplateColumns: `repeat(${filas.length}, minmax(124px, 1fr))` }}
            >
               {filas.map(f => {
                  const etapas = consulta.data?.etapas ?? [];
                  const itens = f.id === "TODAS" ? etapas : etapas.filter(e => (f.etapas as readonly string[]).includes(e.etapa));
                  const total = itens.reduce((n, e) => n + e.total, 0);
                  const atrasados = itens.reduce((n, e) => n + e.atrasados, 0);
                  const selecionada = etapaAtiva === f.id;
                  return (
                     <motion.button
                        type="button"
                        key={f.id}
                        whileTap={press}
                        aria-pressed={selecionada}
                        onClick={() => alternarEtapa(f.id)}
                        data-tom={f.tom}
                        aria-label={`${f.nome}: ${plural(total, "protocolo", "protocolos")}${atrasados ? `, ${plural(atrasados, "atrasado", "atrasados")}` : ""}`}
                        className={cn(
                           "fila-etapa flex min-w-0 flex-col justify-between gap-2 rounded-xl px-3.5 py-2.5 text-left transition-colors",
                           selecionada && "fila-etapa-ativa",
                        )}
                     >
                        <span className="flex w-full items-start justify-between gap-1.5">
                           <span className="line-clamp-2 text-[12px] leading-[1.3] font-medium">{f.nome}</span>
                           {/* O anel já marca a seleção; o check repete o sinal sem disputar espaço com os números. */}
                           {selecionada ? <Check aria-hidden className="size-5 shrink-0 rounded-full bg-white/20 p-1 text-white" /> : null}
                        </span>
                        <span className="flex w-full items-baseline gap-2">
                           <span className="font-mono text-[20px] leading-none font-medium tabular-nums">{int(total)}</span>
                           {atrasados > 0 ? (
                              <span className="text-[11px] font-medium whitespace-nowrap opacity-85">{int(atrasados)} atr.</span>
                           ) : null}
                        </span>
                     </motion.button>
                  );
               })}
            </div>
         </AsyncState>
      </nav>
   );
}

function contagemDoProcesso(funil: Funil | undefined, processo: string | null): { emAndamento: number; atrasados: number } {
   const linhas = funil?.processos ?? [];
   const doProcesso = processo ? linhas.filter(l => l.processo === processo) : linhas;
   return {
      emAndamento: doProcesso.reduce((s, l) => s + l.emAndamento, 0),
      atrasados: doProcesso.reduce((s, l) => s + l.atrasados, 0),
   };
}

function AbaProcesso({
   cartao,
   selecionado,
   contagem,
   onClick,
}: {
   cartao: CartaoProcesso;
   selecionado: boolean;
   contagem: { emAndamento: number; atrasados: number };
   onClick: () => void;
}) {
   const Icone = ICONE_PROCESSO[cartao.tom];
   return (
      <motion.button
         type="button"
         whileTap={press}
         aria-pressed={selecionado}
         onClick={onClick}
         data-processo={cartao.tom}
         aria-label={`${cartao.nome}: ${plural(contagem.emAndamento, "protocolo em andamento", "protocolos em andamento")}`}
         className={cn(
            "processo-aba relative flex min-h-[88px] min-w-0 items-stretch gap-3 rounded-xl px-4 py-3.5 text-left transition-colors",
            selecionado && "processo-aba-ativa",
         )}
      >
         <span aria-hidden className="processo-icone grid size-9 shrink-0 place-items-center rounded-lg">
            <Icone className="size-4.5" />
         </span>
         <span className="flex min-w-0 flex-1 flex-col justify-between gap-2">
            <span className="min-w-0">
               <span className="block truncate text-[13.5px] leading-tight font-semibold">{cartao.nome}</span>
               <span className="processo-detalhe mt-0.5 block truncate text-[11.5px]">{cartao.detalhe}</span>
            </span>
            <span className="flex items-baseline gap-2">
               <span className="font-mono text-[22px] leading-none font-medium tabular-nums">{int(contagem.emAndamento)}</span>
               <span className="processo-detalhe text-[11.5px]">em andamento</span>
               {contagem.atrasados > 0 ? (
                  <span className="processo-atrasados ml-auto text-[11.5px] font-medium">
                     {plural(contagem.atrasados, "atrasado", "atrasados")}
                  </span>
               ) : null}
            </span>
         </span>
         {selecionado ? <span className="fila-selecionada absolute top-3 right-3 text-[10px] font-medium">Selecionado</span> : null}
      </motion.button>
   );
}
