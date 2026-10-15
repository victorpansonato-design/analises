/**
 * Barra da análise (docs/06 §1): matriz de destino (+ Trocar matriz), estado da pré-análise
 * (+ Reexecutar), filtros com contadores, busca de disciplina e as ações em lote da tela. Tudo aqui
 * é `secondary`/`ghost`: a ação primária do caso mora no card "Próximo passo". Ação que a API
 * devolveu desabilitada mostra o motivo em texto visível.
 */
import { FileSearch, Layers, ListChecks, LoaderCircle, Printer, RotateCw, Search, Send } from "lucide-react";

import { SegmentedControl } from "@/components/core/segmented-control";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AcaoDisponivel } from "@/features/casos";
import { useAgora } from "@/hooks/use-agora";
import { int, plural, stamp } from "@/lib/format";

import { FILTROS_ANALISE, ROTULO_FILTRO_ANALISE, type FiltroAnalise } from "@/features/analise/domain/analise.domain";
import type { Analise, PreAnalise } from "@/features/analise/types/analise.schema";

interface BarraAnaliseProps {
   analise: Analise;
   preAnalise: PreAnalise | undefined;
   filtro: FiltroAnalise;
   contagens: Record<FiltroAnalise, number>;
   onFiltro: (f: FiltroAnalise) => void;
   busca: string;
   onBusca: (q: string) => void;
   layoutBase: string;
   nAceitaveis: number;
   podeDecidir: boolean;
   onAceitar: () => void;
   alterarDestino: AcaoDisponivel | null;
   onTrocarMatriz: () => void;
   reexecutar: AcaoDisponivel | null;
   reexecutando: boolean;
   onReexecutar: () => void;
   enviarCoordenacao: AcaoDisponivel | null;
   perguntasAbertas: number;
   enviandoCoordenacao: boolean;
   onEnviarCoordenacao: () => void;
   onExportar: () => void;
   /** Abre a conferência lado a lado (histórico × matriz). */
   onConferir: () => void;
   duvidasIa: number;
}

function EstadoPreAnalise({ pre, analise }: { pre: PreAnalise | undefined; analise: Analise }) {
   const agora = useAgora();
   if (!pre) return <span className="text-[12px] text-ink-3">Pré-análise: carregando</span>;
   const cobertura = `${int(pre.cobertura.sugeridos || analise.itens.filter(i => i.sugestao).length)} de ${int(pre.cobertura.total || analise.itens.length)} com sugestão`;
   switch (pre.status) {
      case "PROCESSANDO":
         return (
            <span role="status" className="inline-flex items-center gap-1.5 text-[12px] text-ink-2">
               <LoaderCircle aria-hidden className="size-3.5 animate-spin text-ink-4" />
               Pré-análise: lendo histórico… cerca de 1 min
            </span>
         );
      case "FALHOU":
         return (
            <Status tone="crit" solid>
               Pré-análise não concluiu
            </Status>
         );
      case "PENDENTE":
         return <span className="text-[12px] text-ink-3">Pré-análise: não executada</span>;
      case "CONCLUIDA":
         return (
            <span className="text-[12px] text-ink-3">
               Pré-análise: concluída {pre.concluidaEm ? stamp(pre.concluidaEm, agora).toLowerCase() : ""} · {cobertura}
            </span>
         );
   }
}

function Motivo({ acao }: { acao: AcaoDisponivel | null }) {
   if (!acao || acao.habilitada || !acao.motivos[0]) return null;
   return <span className="text-[11.5px] text-ink-4">{acao.motivos[0]}</span>;
}

export function BarraAnalise(p: BarraAnaliseProps) {
   // "Contestadas" só aparece quando a análise foi reaberta com contestação (ou está selecionado).
   const opcoes = FILTROS_ANALISE.filter(f => f !== "contestadas" || p.contagens.contestadas > 0 || p.filtro === "contestadas").map(f => ({
      value: f,
      label: ROTULO_FILTRO_ANALISE[f],
      count: p.contagens[f],
   }));
   const processando = p.preAnalise?.status === "PROCESSANDO";
   return (
      <div className="space-y-3 rounded-xl bg-card p-4 print:hidden">
         <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
               <span className="text-[12px] text-ink-3">Matriz de destino</span>
               <span className="text-[13px] font-medium text-ink">
                  <span className="font-mono">{p.analise.matriz.codigo}</span>
                  {p.analise.matriz.vigente ? null : <span className="text-ink-3"> · anterior</span>}
               </span>
               {p.alterarDestino ? (
                  <>
                     <Button variant="ghost" size="xs" icon={<Layers />} disabled={!p.alterarDestino.habilitada} onClick={p.onTrocarMatriz}>
                        Trocar matriz
                     </Button>
                     <Motivo acao={p.alterarDestino} />
                  </>
               ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
               <Button
                  size="xs"
                  variant="secondary"
                  className="acao-destaque"
                  data-tom="todas"
                  icon={<Printer aria-hidden />}
                  onClick={p.onExportar}
               >
                  Exportar PDF
               </Button>
               <Button
                  size="xs"
                  variant="secondary"
                  className="acao-destaque"
                  data-tom="novas"
                  icon={<FileSearch aria-hidden />}
                  onClick={p.onConferir}
               >
                  Conferir lado a lado
                  {p.duvidasIa > 0 ? (
                     <span className="ml-1 rounded-full bg-white/20 px-1.5 font-mono text-[10.5px]">{int(p.duvidasIa)}</span>
                  ) : null}
               </Button>
               <EstadoPreAnalise pre={p.preAnalise} analise={p.analise} />
               {p.reexecutar ? (
                  <>
                     <Button
                        variant="ghost"
                        size="xs"
                        icon={<RotateCw />}
                        disabled={!p.reexecutar.habilitada || processando || p.reexecutando}
                        onClick={p.onReexecutar}
                     >
                        Reexecutar
                     </Button>
                     <Motivo acao={p.reexecutar} />
                  </>
               ) : null}
            </div>
         </div>

         <div className="flex flex-wrap items-center gap-3">
            <div className="-mx-1 max-w-full overflow-x-auto px-1 py-0.5">
               <SegmentedControl
                  options={opcoes}
                  value={p.filtro}
                  onChange={p.onFiltro}
                  layoutId={`${p.layoutBase}-filtro`}
                  ariaLabel="Filtrar disciplinas"
                  size="xs"
               />
            </div>
            <label className="relative min-w-[200px] flex-1">
               <span className="sr-only">Buscar disciplina</span>
               <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-ink-4" />
               <Input
                  type="search"
                  value={p.busca}
                  onChange={e => p.onBusca(e.target.value)}
                  placeholder="Buscar disciplina"
                  className="h-8 pl-8"
               />
            </label>
         </div>

         {(p.podeDecidir && p.nAceitaveis > 0) || (p.enviarCoordenacao && p.perguntasAbertas > 0) ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
               {p.podeDecidir && p.nAceitaveis > 0 ? (
                  <Button className="acao-destaque" data-tom="liberadas" icon={<ListChecks />} onClick={p.onAceitar}>
                     Aceitar {plural(p.nAceitaveis, "sugestão", "sugestões")} de alta confiança
                  </Button>
               ) : null}
               {p.enviarCoordenacao && p.perguntasAbertas > 0 ? (
                  <>
                     <Button
                        className="acao-destaque"
                        data-tom="coordenacao"
                        icon={<Send />}
                        disabled={!p.enviarCoordenacao.habilitada || p.enviandoCoordenacao}
                        onClick={p.onEnviarCoordenacao}
                     >
                        Enviar para coordenação ({int(p.perguntasAbertas)})
                     </Button>
                     <Motivo acao={p.enviarCoordenacao} />
                  </>
               ) : null}
            </div>
         ) : null}
      </div>
   );
}
