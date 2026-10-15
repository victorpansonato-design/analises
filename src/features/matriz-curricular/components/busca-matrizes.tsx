/**
 * Busca da matriz curricular. Ao abrir, só o campo e os filtros: nenhuma lista de tudo. O texto
 * vai para a URL com debounce; modalidade e turno, na hora. O turno só existe no presencial e
 * entra deslizando ao lado da modalidade.
 */
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, LibraryBig, RotateCcw, SearchX } from "lucide-react";
import { useState } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Surface } from "@/components/core/surface";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { plural } from "@/lib/format";
import { enterFast, exitFast, staggerContainer, staggerItem } from "@/lib/motion";

import { useBuscaMatrizes } from "@/features/matriz-curricular/api/matriz.queries";
import { OfertaCard } from "@/features/matriz-curricular/components/oferta-card";
import { consultaValida } from "@/features/matriz-curricular/domain/busca";
import type { MatrizUrl } from "@/features/matriz-curricular/hooks/use-matriz-url";
import type { ModalidadeMatriz, TurnoMatriz } from "@/features/matriz-curricular/types/matriz.schema";

const MODALIDADES = [
   { value: "TODAS", label: "Todas" },
   { value: "PRESENCIAL", label: "Presencial" },
   { value: "HIBRIDO", label: "Híbrido" },
   { value: "EAD", label: "EAD" },
] as const;

/** "no presencial", "no híbrido", "no EAD" (a sigla não vai para minúscula). */
const NO_RECORTE: Record<ModalidadeMatriz, string> = { PRESENCIAL: "no presencial", HIBRIDO: "no híbrido", EAD: "no EAD" };

const TURNOS = [
   { value: "TODOS", label: "Todos os turnos" },
   { value: "DIURNO", label: "Diurno" },
   { value: "NOTURNO", label: "Noturno" },
] as const;

export function BuscaMatrizes({ url }: { url: MatrizUrl }) {
   const [texto, setTexto] = useState(url.q);
   const gravarBusca = useDebouncedCallback(url.setQ, 250);
   const busca = useBuscaMatrizes({ q: url.q, modalidade: url.modalidade, turno: url.turno });
   const ativa = consultaValida(url.q);
   const ofertas = busca.data ?? [];
   const presencial = url.modalidade === "PRESENCIAL";

   return (
      <>
         <header className="px-1">
            <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">Matriz curricular</h1>
            <p className="mt-1.5 text-[13px] text-ink-3">Os currículos ativos de cada curso, com as disciplinas por período e por grupo.</p>
         </header>

         <Surface className="flex items-center gap-3" aria-label="Busca de cursos">
            <SearchInput
               containerClassName="max-w-none flex-1"
               className="h-11 rounded-full pl-10 text-[14px]"
               placeholder="Buscar curso por nome ou código"
               aria-label="Buscar curso por nome ou código"
               autoComplete="off"
               spellCheck={false}
               autoFocus
               value={texto}
               onChange={e => {
                  setTexto(e.target.value);
                  gravarBusca(e.target.value);
               }}
            />
            <SegmentedControl
               ariaLabel="Modalidade"
               layoutId="matriz-modalidade"
               value={url.modalidade ?? "TODAS"}
               onChange={v => url.setModalidade(v === "TODAS" ? null : (v as ModalidadeMatriz))}
               options={MODALIDADES}
            />
            <AnimatePresence initial={false}>
               {presencial ? (
                  <motion.div
                     key="turno"
                     initial={{ opacity: 0, width: 0 }}
                     animate={{ opacity: 1, width: "auto", transition: enterFast }}
                     exit={{ opacity: 0, width: 0, transition: exitFast }}
                     className="overflow-hidden"
                  >
                     <SegmentedControl
                        ariaLabel="Turno"
                        layoutId="matriz-turno"
                        size="xs"
                        value={url.turno ?? "TODOS"}
                        onChange={v => url.setTurno(v === "TODOS" ? null : (v as TurnoMatriz))}
                        options={TURNOS}
                     />
                  </motion.div>
               ) : null}
            </AnimatePresence>
         </Surface>

         {!ativa ? (
            <Surface className="py-6">
               <EmptyPanel
                  icon={LibraryBig}
                  title="Encontre um curso"
                  message="Digite o nome ou o código do curso. Cada modalidade tem o seu código e só os currículos ativos aparecem."
               />
            </Surface>
         ) : (
            <AsyncState
               isLoading={busca.isPending}
               isError={busca.isError}
               isEmpty={ofertas.length === 0}
               loading={<CarregandoBusca />}
               error={
                  <Surface>
                     <EmptyPanel
                        tone="crit"
                        icon={CircleAlert}
                        title="Não foi possível buscar os cursos"
                        message="A consulta falhou. Tente de novo em instantes."
                        action={
                           <Button onClick={() => void busca.refetch()} icon={<RotateCcw aria-hidden />}>
                              Tentar de novo
                           </Button>
                        }
                     />
                  </Surface>
               }
               empty={
                  <Surface className="py-6">
                     <EmptyPanel
                        icon={SearchX}
                        title="Nenhum curso encontrado"
                        message={
                           url.modalidade
                              ? `Nada corresponde a “${url.q.trim()}” ${NO_RECORTE[url.modalidade]}${url.turno ? ` ${url.turno === "DIURNO" ? "diurno" : "noturno"}` : ""}. Confira o nome ou o código. Você também pode buscar em todas as modalidades.`
                              : `Nada corresponde a “${url.q.trim()}”. Confira o nome ou o código do curso.`
                        }
                        action={
                           url.modalidade ? <Button onClick={() => url.setModalidade(null)}>Buscar em todas as modalidades</Button> : null
                        }
                     />
                  </Surface>
               }
            >
               <p role="status" className="px-1 pb-3 text-[12px] text-ink-3">
                  {plural(ofertas.length, "oferta encontrada", "ofertas encontradas")}
               </p>
               <motion.ul variants={staggerContainer} initial="initial" animate="animate" className="flex flex-col gap-3">
                  {ofertas.map(o => (
                     <motion.li key={o.id} variants={staggerItem}>
                        <OfertaCard oferta={o} onAbrir={url.abrirCurriculo} />
                     </motion.li>
                  ))}
               </motion.ul>
            </AsyncState>
         )}
      </>
   );
}

function CarregandoBusca() {
   return (
      <div aria-busy="true" className="flex flex-col gap-3">
         {[0, 1].map(i => (
            <Surface key={i} className="flex flex-col gap-3">
               <Skeleton className="h-5 w-64" />
               <Skeleton className="h-10 w-full" />
            </Surface>
         ))}
         <span className="sr-only">Buscando cursos…</span>
      </div>
   );
}
