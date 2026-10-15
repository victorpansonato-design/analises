/**
 * Painel de indicadores da gestão comercial (`/gestao`, aba Indicadores; docs/10 §1).
 *
 * Regras que decidem esta tela (DS §10.16, §10.17 e §11):
 * - Primeiro o que importa (`Destaques`): conversão, onde estão os protocolos, prazo, atrasados,
 *   primeiro contato, satisfação, funil e perdas. O resto fica em "Todos os indicadores", recolhido.
 * - Funil e indicadores vêm da MESMA resposta: o funil do painel não tem como discordar da faixa.
 * - Um único acento azul por fileira (DS regra 4): o primeiro indicador de cada grupo.
 * - Clicar num indicador abre o MetricSheet (URL `metrica`), nunca outra tela.
 * - Loading/erro/vazio sempre por `AsyncState`; o skeleton tem a geometria da tela pronta.
 */
import { AnimatePresence, motion } from "motion/react";
import { BarChart3, ChevronDown, RotateCcw } from "lucide-react";
import { useState } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { SectionLabel } from "@/components/core/section-label";
import { Tag } from "@/components/core/tag";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIndicadores } from "@/features/indicadores/api/indicadores.queries";
import { CartaoIndicador } from "@/features/indicadores/components/cartao-indicador";
import { Destaques } from "@/features/indicadores/components/destaques";
import { FiltrosIndicadoresBarra } from "@/features/indicadores/components/filtros-indicadores";
import { MetricSheet } from "@/features/indicadores/components/metric-sheet";
import { PorResponsavel } from "@/features/indicadores/components/por-responsavel";
import { useIndicadoresUrl } from "@/features/indicadores/hooks/use-indicadores-url";
import {
   GRUPOS_INDICADORES,
   ID_CONVERSAO_POR_RESPONSAVEL,
   ROTULO_GRUPO,
   type GrupoIndicadores,
   type Indicador,
   type Indicadores,
} from "@/features/indicadores/types/indicadores.schema";
import { useAgora } from "@/hooks/use-agora";
import { relative } from "@/lib/format";
import { collapseVariants } from "@/lib/motion";

const GRADE = "grid gap-3 sm:grid-cols-2 xl:grid-cols-4";

export function PainelIndicadores() {
   const { filtros, metrica, definir, limparRecorte } = useIndicadoresUrl();
   const consulta = useIndicadores(filtros);
   const agora = useAgora();
   const dados = consulta.data;

   const grupoDe = (id: string): GrupoIndicadores | null =>
      dados ? (GRUPOS_INDICADORES.find(g => dados[g].some(i => i.id === id)) ?? null) : null;
   const aberto = dados && metrica ? (GRUPOS_INDICADORES.flatMap(g => dados[g]).find(i => i.id === metrica) ?? null) : null;
   const grupoAberto = aberto ? grupoDe(aberto.id) : null;
   const abrir = (id: string) => definir("metrica", id);

   return (
      <section aria-labelledby="painel-indicadores-titulo" className="min-h-0 flex-1">
         <div className="w-full space-y-5 pt-1">
            <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
               <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                     {/* A aba já diz "Indicadores": o título fica para leitor de tela e para o `aria-labelledby`. */}
                     <h2 id="painel-indicadores-titulo" className="sr-only">
                        Indicadores
                     </h2>

                     <Tag mono>{filtros.ciclo ? `Ciclo ${filtros.ciclo}` : "Todos os ciclos"}</Tag>
                  </div>
                  <p className="mt-1 text-[12px] text-ink-3">
                     {dados ? `Gerado ${relative(dados.geradoEm, agora)}` : "Calculando"} · casos de teste ficam fora de todas as contas
                  </p>
               </div>
               <FiltrosIndicadoresBarra filtros={filtros} definir={definir} limpar={limparRecorte} />
            </header>

            <AsyncState
               isLoading={consulta.isLoading}
               isError={consulta.isError && !dados}
               loading={<PainelSkeleton />}
               error={
                  <EmptyPanel
                     tone="crit"
                     icon={BarChart3}
                     title="Não foi possível carregar os indicadores"
                     message="A consulta falhou antes de terminar. Nada foi perdido: tente de novo; se continuar, avise o suporte."
                     action={
                        <Button variant="secondary" size="sm" icon={<RotateCcw />} onClick={() => consulta.refetch()}>
                           Tentar de novo
                        </Button>
                     }
                  />
               }
            >
               {dados ? <Conteudo dados={dados} onAbrir={abrir} /> : null}
            </AsyncState>
         </div>
         <MetricSheet indicador={aberto} grupo={grupoAberto ? ROTULO_GRUPO[grupoAberto] : null} onFechar={() => definir("metrica", null)} />
      </section>
   );
}

function Conteudo({ dados, onAbrir }: { dados: Indicadores; onAbrir: (id: string) => void }) {
   const [todos, setTodos] = useState(false);
   const porResponsavel = dados.resultado.find(i => i.id === ID_CONVERSAO_POR_RESPONSAVEL);
   const visiveis = GRUPOS_INDICADORES.filter(g => dados[g].length > 0);
   const quantos = visiveis.reduce((s, g) => s + dados[g].length, 0);
   return (
      <div className="space-y-6">
         <Destaques dados={dados} onAbrir={onAbrir} />

         <div className="border-t border-hairline pt-4">
            <Button
               variant="ghost"
               size="sm"
               aria-expanded={todos}
               aria-controls="ind-todos"
               iconRight={<ChevronDown aria-hidden className={todos ? "rotate-180 transition-transform" : "transition-transform"} />}
               onClick={() => setTodos(v => !v)}
            >
               {todos ? "Recolher todos os indicadores" : `Ver todos os indicadores (${quantos})`}
            </Button>
            <AnimatePresence initial={false}>
               {todos ? (
                  <motion.div
                     id="ind-todos"
                     key="todos"
                     variants={collapseVariants}
                     initial="initial"
                     animate="animate"
                     exit="exit"
                     className="overflow-hidden"
                  >
                     <div className="space-y-7 pt-4">
                        {visiveis.map(g => (
                           <Grupo
                              key={g}
                              grupo={g}
                              indicadores={dados[g].filter(i => i.id !== ID_CONVERSAO_POR_RESPONSAVEL)}
                              onAbrir={onAbrir}
                           />
                        ))}
                        {porResponsavel ? <PorResponsavel indicador={porResponsavel} onAbrir={onAbrir} /> : null}
                     </div>
                  </motion.div>
               ) : null}
            </AnimatePresence>
         </div>
      </div>
   );
}

function Grupo({ grupo, indicadores, onAbrir }: { grupo: GrupoIndicadores; indicadores: Indicador[]; onAbrir: (id: string) => void }) {
   const id = `ind-grupo-${grupo}`;
   return (
      <section className="space-y-3" aria-labelledby={id}>
         <SectionLabel>
            <span id={id}>{ROTULO_GRUPO[grupo]}</span>
         </SectionLabel>
         {indicadores.length === 0 ? (
            <p className="text-[12.5px] text-ink-3">Nenhum indicador deste grupo para o recorte escolhido.</p>
         ) : (
            <div className={GRADE}>
               {indicadores.map((i, idx) => (
                  <CartaoIndicador key={i.id} indicador={i} destaque={idx === 0} onAbrir={onAbrir} />
               ))}
            </div>
         )}
      </section>
   );
}

function PainelSkeleton() {
   return (
      <div className="space-y-7" aria-busy="true" aria-label="Carregando indicadores">
         <div className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <div className="space-y-2 rounded-xl bg-card p-4">
               {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} className="grid grid-cols-[minmax(92px,140px)_1fr_auto] items-center gap-3">
                     <Skeleton className="h-3 w-24" />
                     <Skeleton className="h-2.5 rounded-full" style={{ width: `${90 - i * 9}%` }} />
                     <Skeleton className="h-3 w-40" />
                  </div>
               ))}
            </div>
         </div>
         {[0, 1].map(g => (
            <div key={g} className="space-y-3">
               <Skeleton className="h-4 w-24" />
               <div className={GRADE}>
                  {Array.from({ length: 4 }, (_, i) => (
                     <div key={i} className="flex min-h-[176px] flex-col rounded-xl bg-card p-4">
                        <Skeleton className="h-3 w-32" />
                        <Skeleton className="mt-3 h-6 w-20" />
                        <Skeleton className="mt-4 h-7 w-full" />
                        <Skeleton className="mt-auto h-3 w-40" />
                     </div>
                  ))}
               </div>
            </div>
         ))}
      </div>
   );
}
