/** Tabela virtualizada: uma linha por protocolo, posição e filtros preservados no retorno. */
import { Download, RefreshCw, SearchX, FilePlus2 } from "lucide-react";
import { forwardRef, useCallback, useMemo, useRef, useState, type ComponentProps } from "react";
import { TableVirtuoso, type TableVirtuosoHandle, type TableComponents, type StateSnapshot } from "react-virtuoso";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { TableHead, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyPanel } from "@/components/core/empty-panel";
import { useAtalho } from "@/hooks/use-atalho";
import { int, plural } from "@/lib/format";
import { avisarErro, notificar } from "@/lib/notify";
import { nomeDaFila } from "@/features/casos/domain/filas";
import { PROCESSOS } from "@/features/casos/domain/processos";
import { exportarFila } from "@/features/casos/api/exportacao";
import { useCasos } from "@/features/casos/api/casos.queries";
import { FiltrosFila } from "@/features/casos/components/fila/filtros-fila";
import { CelulasProtocolo } from "@/features/casos/components/fila/linha-protocolo";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import type { CasoResumo } from "@/features/casos/types/caso.schema";

const POSICOES = new Map<string, StateSnapshot>();
const CABECALHOS = [
   "Perfil",
   "MAT",
   "Protocolo",
   "RA",
   "Nome completo",
   "Curso e modalidade",
   "Solicitação / etapa",
   "Inclusão",
   "Liberada matrícula",
];
interface ContextoTabela {
   abrir: (id: string) => void;
}
const COMPONENTES: TableComponents<CasoResumo, ContextoTabela> = {
   Table: ({ context, ...props }) => {
      void context;
      return (
         <table
            {...props}
            className="tabela-protocolos w-full min-w-[1240px] border-separate border-spacing-0 text-left"
            aria-label="Protocolos de análise"
         />
      );
   },
   TableHead: forwardRef<HTMLTableSectionElement, ComponentProps<"thead"> & { context?: ContextoTabela }>(({ context, ...props }, ref) => {
      void context;
      return <thead {...props} ref={ref} />;
   }),
   TableRow: ({ item, context, ...props }) => (
      <TableRow
         {...props}
         className="linha-protocolo cursor-pointer"
         onClick={e => {
            if (window.getSelection()?.isCollapsed === false) return;
            if (!(e.target as HTMLElement).closest("a,button,input,select") && item) context?.abrir(item.id);
         }}
      />
   ),
};

function CabecalhoTabela() {
   return (
      <tr>
         {CABECALHOS.map((c, i) => (
            <TableHead scope="col" key={c} className={`h-11 bg-surface-2 px-3 text-[11px] font-medium text-ink-2 ${i === 0 ? "pl-5" : ""}`}>
               {c === "MAT" ? (
                  <abbr title="Situação da matrícula do aluno" className="no-underline">
                     MAT
                  </abbr>
               ) : (
                  c
               )}
            </TableHead>
         ))}
      </tr>
   );
}

export function FilaCasos() {
   const url = useCasosUrlState();
   const { abrirCaso } = url;
   const consulta = useCasos(url.filtros);
   const casos = useMemo(() => consulta.data?.pages.flatMap(p => p.itens) ?? [], [consulta.data]);
   const total = consulta.data?.pages[0]?.total ?? 0;
   const atrasados = consulta.data?.pages[0]?.atrasados ?? 0;
   const [exportando, setExportando] = useState(false);
   const tabela = useRef<TableVirtuosoHandle>(null);
   const chave = JSON.stringify(url.filtros);
   const processo = PROCESSOS.find(p => p.id === url.filtros.processo);
   const fila = nomeDaFila(url.filtros.etapa);
   const titulo = url.filtros.q ? "Análises encontradas" : processo ? `${processo.nome} · ${fila.toLowerCase()}` : fila;
   const abrir = useCallback(
      (id: string) => {
         tabela.current?.getState(s => {
            POSICOES.set(chave, s);
            if (POSICOES.size > 15) POSICOES.delete(POSICOES.keys().next().value!);
         });
         abrirCaso(id);
      },
      [chave, abrirCaso],
   );
   useAtalho("/", () => document.querySelector<HTMLInputElement>('input[placeholder="RA, nome completo, CPF ou protocolo"]')?.focus());
   async function exportar() {
      setExportando(true);
      try {
         const n = await exportarFila(url.filtros);
         notificar({ titulo: `${plural(n, "protocolo exportado", "protocolos exportados")}` });
      } catch (e) {
         avisarErro(e, "Não foi possível exportar as análises");
      } finally {
         setExportando(false);
      }
   }
   const erroPaginacao = consulta.isFetchNextPageError;
   return (
      <section aria-label="Lista de análises" className="rounded-xl bg-card">
         <header className="shrink-0 px-5 pt-5 pb-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
               <div>
                  <h2 className="text-[17px] font-semibold text-ink">{titulo}</h2>
                  <p className="mt-1 text-[12px] text-ink-3" aria-live="polite">
                     {consulta.isLoading ? "Carregando protocolos…" : `${plural(total, "protocolo", "protocolos")}`}
                     {atrasados > 0 ? <span className="ml-2 text-crit-ink">· {plural(atrasados, "atrasado", "atrasados")}</span> : null}
                     {consulta.isFetching && !consulta.isLoading ? <span className="ml-2">Atualizando…</span> : null}
                  </p>
               </div>
               <div className="flex items-center gap-1">
                  <Button
                     variant="ghost"
                     size="sm"
                     icon={<RefreshCw aria-hidden />}
                     onClick={() => void consulta.refetch()}
                     disabled={consulta.isFetching}
                  >
                     Atualizar
                  </Button>
                  <Button
                     size="sm"
                     icon={<Download aria-hidden />}
                     onClick={() => void exportar()}
                     disabled={exportando || total === 0 || consulta.isPlaceholderData}
                  >
                     {exportando ? "Exportando…" : "Exportar planilha"}
                  </Button>
               </div>
            </div>
            <FiltrosFila />
         </header>
         <p className="px-5 pb-2 text-[11px] text-ink-3 xl:hidden">Deslize a tabela para consultar todas as colunas.</p>
         <AsyncState
            className="min-w-0"
            isLoading={consulta.isLoading}
            isError={consulta.isError && !consulta.data}
            loading={
               <div className="px-5">
                  {Array.from({ length: 5 }, (_, i) => (
                     <Skeleton key={i} className="mb-2 h-16 w-full" />
                  ))}
               </div>
            }
            error={
               <EmptyPanel
                  tone="crit"
                  title="Não conseguimos carregar as análises"
                  message="Tente novamente para continuar de onde parou."
                  action={<Button onClick={() => void consulta.refetch()}>Tentar de novo</Button>}
               />
            }
            isEmpty={!consulta.isLoading && casos.length === 0}
            empty={
               <EmptyPanel
                  icon={url.filtros.q || url.temFiltro ? SearchX : FilePlus2}
                  title="Nenhuma análise encontrada"
                  message="Confira o RA, parte do nome ou os filtros selecionados."
                  action={<Button onClick={url.verTodas}>Ver todas as análises</Button>}
               />
            }
         >
            <TableVirtuoso
               key={chave}
               ref={tabela}
               className="scroll-slim"
               style={{ overflowX: "auto" }}
               useWindowScroll
               data={casos}
               context={{ abrir }}
               components={COMPONENTES}
               fixedHeaderContent={CabecalhoTabela}
               computeItemKey={(_, c) => c.id}
               restoreStateFrom={POSICOES.get(chave)}
               endReached={() => {
                  if (consulta.hasNextPage && !consulta.isFetchingNextPage && !erroPaginacao && !consulta.isPlaceholderData)
                     void consulta.fetchNextPage();
               }}
               itemContent={(_, caso) => <CelulasProtocolo caso={caso} onAbrir={abrir} />}
            />
         </AsyncState>
         <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-hairline px-5 py-2 text-[11.5px] text-ink-3">
            <span>
               {int(casos.length)} de {int(total)} protocolos{" "}
               <span className="hidden sm:inline">· cada análise tem seu próprio histórico</span>
            </span>
            {consulta.hasNextPage ? (
               <Button variant="ghost" size="xs" onClick={() => void consulta.fetchNextPage()} disabled={consulta.isFetchingNextPage}>
                  {consulta.isFetchingNextPage ? "Carregando…" : erroPaginacao ? "Tentar carregar mais" : "Carregar mais"}
               </Button>
            ) : (
               <span>Lista completa</span>
            )}
         </footer>
      </section>
   );
}
