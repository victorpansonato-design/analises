/**
 * Workspace da análise (docs/06 inteiro), já com os dados carregados. Decisões de desenho:
 *
 * - Itens decididos NESTA visão de filtro ficam visíveis ("fixados") até o filtro mudar: decidir em
 *   "Pendentes" não faz a linha sumir debaixo do cursor nem a grade pular.
 * - Teclado (docs/06 §5) tratado aqui, num `role="grid"` com `data-atalhos-locais`; nunca dispara
 *   com foco em campo de texto. O foco da grade é derivado (sempre há uma linha na ordem de Tab).
 * - `?item=` (link, bloqueio "Ir para o item") torna o item visível, abre o período e foca a linha.
 * - Callbacks das linhas num objeto estável (só funções estáveis: `mutate`, setters): decidir uma
 *   linha não re-renderiza as outras.
 * - Toda ação em lote oferece "Desfazer" por `UI.desfazerMs` (REVERTER volta os itens para sugestão).
 */
import { ListChecks, RotateCw, Sparkles, TriangleAlert, X } from "lucide-react";
import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Kbd } from "@/components/core/kbd";
import { Notice } from "@/components/core/notice";
import { Button } from "@/components/ui/button";
import { AsyncState } from "@/components/ui/async-state";
import { acaoDoCaso, podeNoCaso, ROTULO_DECISAO, UI, useTransicao, type CasoDetalhe, type DecisaoItem } from "@/features/casos";
import { useMe } from "@/features/sessao";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { int, plural } from "@/lib/format";
import { notificar } from "@/lib/notify";

import {
   useDecidirItem,
   useDecidirLote,
   useDefinirIngresso,
   usePerguntar,
   useReexecutarPreAnalise,
   useResponderItem,
   useRetirarPergunta,
} from "@/features/analise/api/analise.mutations";
import { AceitarLoteModal } from "@/features/analise/components/aceitar-lote-modal";
import { BarraAnalise } from "@/features/analise/components/barra-analise";
import { GradeAnalise } from "@/features/analise/components/grade-analise";
import { HistoricoItemModal } from "@/features/analise/components/historico-item-modal";
import { ImpressaoAnalise } from "@/features/analise/components/impressao-analise";
import type { AcoesLinha } from "@/features/analise/components/linha-item";
import { ModoCoordenacao } from "@/features/analise/components/modo-coordenacao";
import { PerguntaModal } from "@/features/analise/components/pergunta-modal";
import { ReabrirAnaliseModal } from "@/features/analise/components/reabrir-analise-modal";
import { ConferenciaLadoALado } from "@/features/analise/components/conferencia/conferencia-lado-a-lado";
import { iaEmDuvida } from "@/features/analise/domain/conferencia";
import { ResumoAnalise } from "@/features/analise/components/resumo-analise";
import { SecoesComplementares } from "@/features/analise/components/secoes-complementares";
import { TrocarMatrizModal } from "@/features/analise/components/trocar-matriz-modal";
import { TrocarOrigemModal } from "@/features/analise/components/trocar-origem-modal";
import {
   aceitavelEmLote,
   agruparPorPeriodo,
   chaveDoPeriodo,
   DECISOES,
   alternarSelecao,
   casaBusca,
   contarFiltros,
   filtrarItens,
   origensNaoAproveitadas,
   paraCoordenacao,
   proximoPendente,
   vizinho,
   type GrupoPeriodo,
} from "@/features/analise/domain/analise.domain";
import { useAnaliseUrl } from "@/features/analise/hooks/use-analise-url";
import {
   itemDecidido,
   type Analise,
   type ItemAnalise,
   type LoteEntrada,
   type PreAnalise,
   type RespostaEntrada,
} from "@/features/analise/types/analise.schema";

const VAZIO: ReadonlySet<string> = new Set();
const TECLA_DECISAO: Record<string, DecisaoItem> = { "1": DECISOES[0], "2": DECISOES[1], "3": DECISOES[2], "4": DECISOES[3] };

interface WorkspaceAnaliseProps {
   caso: CasoDetalhe;
   analise: Analise;
   preAnalise: PreAnalise | undefined;
   modoCoordenacao: boolean;
}

interface Alvo {
   id: string;
   n: number;
   bloco: ScrollLogicalPosition;
}

function campoDeTexto(el: HTMLElement): boolean {
   if (el instanceof HTMLInputElement) return el.type !== "checkbox" && el.type !== "radio";
   return el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el.isContentEditable;
}

export function WorkspaceAnalise({ caso, analise, preAnalise, modoCoordenacao }: WorkspaceAnaliseProps) {
   const layoutBase = useId();
   const me = useMe().data;
   const usuario = me ? { id: me.id, nome: me.nome } : null;
   const coordenacao = caso.etapa === "AGUARDANDO_COORDENACAO";

   // Permissões: a UI só mostra/habilita o que a API devolveu.
   const acaoDecidir = acaoDoCaso(caso, "DECIDIR_ITEM");
   const podeDecidir = !!acaoDecidir?.habilitada;
   const podePerguntar = podeNoCaso(caso, "PERGUNTAR_COORDENACAO");
   const acaoResponder = acaoDoCaso(caso, "RESPONDER_ITEM_COORDENACAO");
   const motivoLeitura = podeDecidir
      ? null
      : (acaoDecidir?.motivos[0] ?? "As decisões não estão disponíveis na etapa atual. Consulte a grade e o histórico do protocolo.");

   const decidir = useDecidirItem(caso.id, { usuario, coordenacao });
   const lote = useDecidirLote(caso.id, { usuario, coordenacao });
   const ingresso = useDefinirIngresso(caso.id);
   const perguntar = usePerguntar(caso.id);
   const retirar = useRetirarPergunta(caso.id);
   const responder = useResponderItem(caso.id);
   const reexecutar = useReexecutarPreAnalise(caso.id);
   const transicao = useTransicao(caso);

   // ── URL e filtro ─────────────────────────────────────────────────────────────────────────────
   const url = useAnaliseUrl();
   const filtro = url.filtro ?? (modoCoordenacao ? "coordenacao" : "todas");
   const [busca, setBusca] = useState(url.busca);
   const gravarBusca = useDebouncedCallback(url.setBusca, 300);
   const gravarItem = useDebouncedCallback(url.setItem, 400);

   // Itens em que se mexeu nesta visão continuam visíveis até o filtro ou a busca mudarem.
   const [fixados, setFixados] = useState<ReadonlySet<string>>(VAZIO);
   const fixar = useCallback((ids: readonly string[]) => setFixados(prev => new Set([...prev, ...ids])), []);
   const mudarFiltro = (f: typeof filtro) => {
      setFixados(VAZIO);
      url.setFiltro(f);
   };

   // ── Derivados ────────────────────────────────────────────────────────────────────────────────
   const origemPorId = useMemo(() => new Map(analise.origem.map(o => [o.id, o])), [analise.origem]);
   const porId = useMemo(() => new Map(analise.itens.map(i => [i.id, i])), [analise.itens]);
   const contagens = useMemo(() => contarFiltros(analise.itens), [analise.itens]);
   const visiveis = useMemo(() => {
      const base = new Set(filtrarItens(analise.itens, filtro, busca, origemPorId).map(i => i.id));
      return analise.itens.filter(i => base.has(i.id) || fixados.has(i.id));
   }, [analise.itens, filtro, busca, origemPorId, fixados]);
   const grupos = useMemo(() => agruparPorPeriodo(visiveis), [visiveis]);
   const aceitaveis = useMemo(() => analise.itens.filter(aceitavelEmLote), [analise.itens]);
   const naoAproveitadas = useMemo(() => origensNaoAproveitadas(analise.itens, analise.origem), [analise.itens, analise.origem]);
   const perguntas = useMemo(
      () => analise.itens.filter(i => paraCoordenacao(i) && casaBusca(i, busca, origemPorId)),
      [analise.itens, busca, origemPorId],
   );

   const [colapsados, setColapsados] = useState<ReadonlySet<string>>(VAZIO);
   const ordem = useMemo(() => grupos.filter(g => !colapsados.has(g.chave)).flatMap(g => g.itens.map(i => i.id)), [grupos, colapsados]);

   // ── Foco, seleção, expansão ──────────────────────────────────────────────────────────────────
   const [focoBruto, setFocoBruto] = useState<string | null>(null);
   const focoId = focoBruto && ordem.includes(focoBruto) ? focoBruto : (ordem[0] ?? null);
   const [alvo, setAlvo] = useState<Alvo | null>(null);
   const [selecionados, setSelecionados] = useState<ReadonlySet<string>>(VAZIO);
   const ancora = useRef<string | null>(null);
   const ordemRef = useRef(ordem);
   useEffect(() => {
      ordemRef.current = ordem;
   }, [ordem]);
   const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(VAZIO);
   const gridRef = useRef<HTMLDivElement>(null);

   // Modais
   const [perguntaItem, setPerguntaItem] = useState<ItemAnalise | null>(null);
   const [origemItem, setOrigemItem] = useState<ItemAnalise | null>(null);
   const [historicoItem, setHistoricoItem] = useState<ItemAnalise | null>(null);
   const [aceitarAberto, setAceitarAberto] = useState(false);
   const [matrizAberta, setMatrizAberta] = useState(false);

   function irPara(id: string, bloco: ScrollLogicalPosition) {
      const item = porId.get(id);
      if (!item) return;
      fixar([id]);
      const chave = chaveDoPeriodo(item.periodo);
      if (colapsados.has(chave)) setColapsados(prev => new Set([...prev].filter(c => c !== chave)));
      setFocoBruto(id);
      setAlvo(a => ({ id, n: (a?.n ?? 0) + 1, bloco }));
   }

   // `?item=` vindo de fora (link, card "Próximo passo"): ajusta o estado durante a renderização.
   const [itemUrlVisto, setItemUrlVisto] = useState<string | null>(null);
   if (url.item !== itemUrlVisto) {
      setItemUrlVisto(url.item);
      if (url.item && url.item !== focoBruto && porId.has(url.item)) irPara(url.item, "center");
   }

   useEffect(() => {
      if (!alvo) return;
      const el = document.getElementById(`linha-${alvo.id}`);
      if (!el) return;
      el.focus({ preventScroll: true });
      el.scrollIntoView?.({ block: alvo.bloco });
   }, [alvo]);

   // Espera fontes e marca: o PDF não pode sair sem o logo nem herdar elementos da interface.
   const { imprimir, limparImprimir } = url;
   useEffect(() => {
      if (!imprimir) return;
      let cancelado = false;
      async function preparar() {
         const tituloAnterior = document.title;
         try {
            await document.fonts?.ready;
            await Promise.all([...document.querySelectorAll<HTMLImageElement>(".relatorio-analise img")].map(img => img.decode()));
            if (cancelado) return;
            document.title = `Analise-${caso.protocolo}`;
            window.print();
         } catch {
            if (!cancelado) notificar({ tom: "crit", titulo: "Não foi possível preparar o PDF", detalhe: "Tente exportar novamente." });
         } finally {
            document.title = tituloAnterior;
            if (!cancelado) limparImprimir();
         }
      }
      void preparar();
      return () => {
         cancelado = true;
      };
   }, [imprimir, limparImprimir, caso.protocolo]);

   // ── Ações ────────────────────────────────────────────────────────────────────────────────────
   function decidirItem(item: ItemAnalise, valor: DecisaoItem) {
      if (podeDecidir) acoes.decidir(item, valor);
   }

   function executarLote(entrada: LoteEntrada, titulo: string, desfazer: string[]) {
      fixar(entrada.itemIds ?? []);
      lote.mutate(entrada, {
         onSuccess: () =>
            notificar({
               titulo,
               duracao: UI.desfazerMs,
               acao: desfazer.length
                  ? {
                       rotulo: "Desfazer",
                       onClick: () =>
                          lote.mutate(
                             { modo: "REVERTER", itemIds: desfazer },
                             {
                                onSuccess: () =>
                                   notificar({
                                      tom: "info",
                                      titulo: `${plural(desfazer.length, "decisão desfeita", "decisões desfeitas")}`,
                                   }),
                             },
                          ),
                    }
                  : undefined,
            }),
      });
   }

   function definirVarios(itens: readonly ItemAnalise[], valor: DecisaoItem) {
      const alvos = itens.filter(i => i.estado !== "PERGUNTA_ABERTA");
      if (!alvos.length) return;
      // Desfazer só quando todos eram sugestão: reverter não restaura uma decisão anterior diferente.
      const desfazer = alvos.every(i => i.estado === "SUGERIDO") ? alvos.map(i => i.id) : [];
      executarLote(
         { modo: "DEFINIR", itemIds: alvos.map(i => i.id), decisao: valor },
         `${plural(alvos.length, "disciplina marcada", "disciplinas marcadas")} como ${ROTULO_DECISAO[valor]}`,
         desfazer,
      );
   }

   function aceitarAlta() {
      const ids = aceitaveis.map(i => i.id);
      setAceitarAberto(false);
      executarLote(
         { modo: "ACEITAR_SUGESTOES_ALTA", itemIds: ids },
         `${plural(ids.length, "sugestão confirmada", "sugestões confirmadas")}`,
         ids,
      );
   }

   const selecionar = useCallback((id: string, shift: boolean) => {
      const de = ancora.current;
      const lista = ordemRef.current;
      setSelecionados(prev => alternarSelecao(prev, lista, id, de, shift));
      ancora.current = id;
   }, []);

   function responderItem(item: ItemAnalise, entrada: RespostaEntrada) {
      responder.mutate(
         { itemId: item.id, entrada },
         {
            onSuccess: () =>
               notificar({
                  titulo: `Resposta registrada: ${item.disciplina}`,
                  detalhe: entrada.usarComoRegra ? "Virou regra para os próximos casos." : undefined,
               }),
         },
      );
   }

   async function aprovarTodas() {
      for (const item of analise.itens.filter(i => i.estado === "PERGUNTA_ABERTA" && i.pergunta)) {
         try {
            await responder.mutateAsync({
               itemId: item.id,
               entrada: { decisao: item.pergunta?.decisaoSugerida ?? "DISPENSA", usarComoRegra: true },
            });
         } catch {
            return; // o erro já virou toast; para no primeiro para a pessoa conferir.
         }
      }
      notificar({ titulo: "Todas as sugestões aprovadas", detalhe: "Devolva para a analista pelo card Próximo passo." });
   }

   const mutarDecisao = decidir.mutate;
   const mutarRetirada = retirar.mutate;
   // Tudo aqui é estável (`mutate` do React Query, setters, callbacks sem dependência): criado uma vez.
   const [acoes] = useState<AcoesLinha>(() => ({
      decidir: (item, valor) => {
         if (item.estado === "PERGUNTA_ABERTA" || (itemDecidido(item) && item.decisao?.valor === valor)) return;
         fixar([item.id]);
         mutarDecisao({ itemId: item.id, entrada: { valor } });
      },
      focar: id => {
         setFocoBruto(id);
         gravarItem(id);
      },
      selecionar,
      expandir: id => setExpandidos(prev => (prev.has(id) ? new Set([...prev].filter(x => x !== id)) : new Set([...prev, id]))),
      perguntar: setPerguntaItem,
      retirarPergunta: item =>
         mutarRetirada(item.id, { onSuccess: () => notificar({ titulo: "Pergunta retirada", detalhe: item.disciplina }) }),
      trocarOrigem: setOrigemItem,
      historico: setHistoricoItem,
      motivo: (item, motivo) => {
         if (!item.decisao) return;
         mutarDecisao({
            itemId: item.id,
            entrada: { valor: item.decisao.valor, origemIds: item.decisao.origemIds, motivoAlteracao: motivo ?? undefined },
         });
      },
   }));

   function onTecla(e: KeyboardEvent<HTMLDivElement>) {
      const el = e.target as HTMLElement;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || campoDeTexto(el)) return;
      const item = focoId ? porId.get(focoId) : undefined;
      const naLinha = el.getAttribute("role") === "row";
      const mover = (id: string | null) => id && irPara(id, "nearest");
      const decisao = TECLA_DECISAO[e.key];
      if (decisao) {
         if (item) decidirItem(item, decisao);
      } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
         mover(vizinho(ordem, focoId, e.key === "ArrowDown" ? 1 : -1));
      } else if (e.key === "]" || e.key === "[") {
         mover(proximoPendente(ordem, porId, focoId, e.key === "]" ? 1 : -1));
      } else if (e.key === "Enter" && naLinha) {
         if (item?.sugestao && !itemDecidido(item)) decidirItem(item, item.sugestao.decisao);
      } else if (e.key === " " && naLinha) {
         if (item) acoes.expandir(item.id);
      } else if (e.key.toLowerCase() === "c") {
         if (item && podePerguntar && !item.pergunta?.resposta) setPerguntaItem(item);
      } else if (e.key.toLowerCase() === "x") {
         if (item && podeDecidir) selecionar(item.id, e.shiftKey);
      } else {
         return;
      }
      e.preventDefault();
   }

   // ── Render ───────────────────────────────────────────────────────────────────────────────────
   const selecionadosItens = analise.itens.filter(i => selecionados.has(i.id));
   const mostrarCoordenacao = modoCoordenacao && filtro === "coordenacao";
   const acaoReexecutar = acaoDoCaso(caso, "REEXECUTAR_PRE_ANALISE");
   const outrosAvisos = (preAnalise?.avisos ?? []).filter(a => !a.startsWith("Há sugestões novas"));

   return (
      <div className="space-y-3">
         <ImpressaoAnalise caso={caso} analise={analise} origemPorId={origemPorId} />

         {preAnalise?.status === "FALHOU" ? (
            <Notice
               tone="crit"
               icon={TriangleAlert}
               title="A pré-análise não concluiu"
               className="print:hidden"
               action={
                  acaoReexecutar?.habilitada ? (
                     <Button size="xs" icon={<RotateCw />} onClick={() => reexecutar.mutate()} disabled={reexecutar.isPending}>
                        Reexecutar pré-análise
                     </Button>
                  ) : null
               }
            >
               {preAnalise.erro ?? "O serviço de pré-análise não respondeu."} A grade está sem sugestões: decida cada disciplina ou
               reexecute a pré-análise.
               {acaoReexecutar && !acaoReexecutar.habilitada && acaoReexecutar.motivos[0] ? ` ${acaoReexecutar.motivos[0]}.` : ""}
            </Notice>
         ) : null}
         {preAnalise?.status === "CONCLUIDA" && (preAnalise.sugestoesNovas ?? 0) > 0 ? (
            <Notice
               tone="info"
               icon={Sparkles}
               title="Há sugestões novas"
               className="print:hidden"
               action={
                  <Button size="xs" variant="ghost" onClick={() => mudarFiltro("pendentes")}>
                     Ver pendentes
                  </Button>
               }
            >
               {plural(preAnalise.sugestoesNovas ?? 0, "disciplina sem decisão recebeu", "disciplinas sem decisão receberam")} sugestão
               nova. As decisões confirmadas não mudaram.
            </Notice>
         ) : null}
         {outrosAvisos.length ? (
            <Notice tone="warn" icon={TriangleAlert} className="print:hidden">
               {outrosAvisos.join(" ")}
            </Notice>
         ) : null}

         <BarraAnalise
            analise={analise}
            onExportar={url.solicitarImpressao}
            onConferir={() => url.setConferir(true)}
            duvidasIa={analise.itens.filter(iaEmDuvida).length}
            preAnalise={preAnalise}
            filtro={filtro}
            contagens={contagens}
            onFiltro={mudarFiltro}
            busca={busca}
            onBusca={q => {
               setBusca(q);
               setFixados(VAZIO);
               gravarBusca(q);
            }}
            layoutBase={layoutBase}
            nAceitaveis={aceitaveis.length}
            podeDecidir={podeDecidir}
            onAceitar={() => setAceitarAberto(true)}
            alterarDestino={acaoDoCaso(caso, "ALTERAR_DESTINO")}
            onTrocarMatriz={() => setMatrizAberta(true)}
            reexecutar={acaoReexecutar}
            reexecutando={reexecutar.isPending}
            onReexecutar={() =>
               reexecutar.mutate(undefined, {
                  onSuccess: () =>
                     notificar({
                        tom: "info",
                        titulo: "Pré-análise reexecutando",
                        detalhe: "Cerca de 1 min. Decisões confirmadas não mudam.",
                     }),
               })
            }
            enviarCoordenacao={acaoDoCaso(caso, "ENVIAR_COORDENACAO")}
            perguntasAbertas={analise.resumo.contagem.perguntas}
            enviandoCoordenacao={transicao.isPending}
            onEnviarCoordenacao={() =>
               transicao.mutate(
                  { acao: "ENVIAR_COORDENACAO" },
                  { onSuccess: () => notificar({ titulo: "Perguntas enviadas à coordenação" }) },
               )
            }
         />

         {motivoLeitura ? <p className="text-[12px] text-ink-3 print:hidden">Somente leitura · {motivoLeitura}</p> : null}

         <div className="space-y-4">
            <div>
               <ResumoAnalise
                  caso={caso}
                  analise={analise}
                  podeDecidir={podeDecidir}
                  salvandoIngresso={ingresso.isPending}
                  onDefinirIngresso={p => ingresso.mutate(p)}
                  onIrParaItem={id => {
                     url.setItem(id);
                     irPara(id, "center");
                  }}
               />
            </div>

            <div className="min-w-0 space-y-3">
               {mostrarCoordenacao ? (
                  <ModoCoordenacao
                     itens={perguntas}
                     origemPorId={origemPorId}
                     podeResponder={!!acaoResponder?.habilitada}
                     motivoBloqueio={acaoResponder?.motivos[0] ?? null}
                     salvando={responder.isPending}
                     onResponder={responderItem}
                     onAprovarTodas={() => void aprovarTodas()}
                     onConferir={item => {
                        url.setItem(item.id);
                        url.setConferir(true);
                     }}
                  />
               ) : (
                  <>
                     {selecionados.size > 0 && podeDecidir ? (
                        <div
                           className="sticky top-0 z-10 flex flex-wrap items-center gap-2 rounded-xl bg-card px-4 py-2.5 print:hidden"
                           role="toolbar"
                           aria-label="Decisão em lote"
                        >
                           <span className="text-[12.5px] font-medium text-ink">
                              {plural(selecionados.size, "selecionada", "selecionadas")}
                           </span>
                           {DECISOES.map(d => (
                              <Button
                                 key={d}
                                 size="xs"
                                 onClick={() => {
                                    definirVarios(selecionadosItens, d);
                                    setSelecionados(VAZIO);
                                 }}
                              >
                                 {ROTULO_DECISAO[d]}
                              </Button>
                           ))}
                           <Button size="xs" variant="ghost" icon={<X />} onClick={() => setSelecionados(VAZIO)}>
                              Limpar seleção
                           </Button>
                        </div>
                     ) : null}
                     <AsyncState
                        isLoading={false}
                        isEmpty={visiveis.length === 0}
                        loading={null}
                        empty={
                           <EmptyPanel
                              compact
                              icon={ListChecks}
                              title={busca ? `Nenhuma disciplina com "${busca}"` : "Nenhuma disciplina neste filtro"}
                              message={
                                 filtro === "pendentes"
                                    ? "Todas as disciplinas já têm decisão confirmada."
                                    : "Troque o filtro ou limpe a busca para ver a grade completa."
                              }
                              action={
                                 <Button
                                    size="xs"
                                    onClick={() => {
                                       setBusca("");
                                       url.setBusca("");
                                       mudarFiltro("todas");
                                    }}
                                 >
                                    Ver todas
                                 </Button>
                              }
                           />
                        }
                     >
                        <GradeAnalise
                           grupos={grupos}
                           origemPorId={origemPorId}
                           focoId={focoId}
                           selecionados={selecionados}
                           expandidos={expandidos}
                           colapsados={colapsados}
                           podeDecidir={podeDecidir}
                           podePerguntar={podePerguntar}
                           layoutBase={layoutBase}
                           acoes={acoes}
                           onAlternarGrupo={c =>
                              setColapsados(prev => (prev.has(c) ? new Set([...prev].filter(x => x !== c)) : new Set([...prev, c])))
                           }
                           onMarcarRegular={(g: GrupoPeriodo) => definirVarios(g.itens, "REGULAR")}
                           onKeyDown={onTecla}
                           gridRef={gridRef}
                        />
                     </AsyncState>
                     <p className="hidden flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-4 lg:flex print:hidden">
                        <span>
                           <Kbd>↑</Kbd> <Kbd>↓</Kbd> disciplina
                        </span>
                        <span>
                           <Kbd>1</Kbd>–<Kbd>4</Kbd> decidir
                        </span>
                        <span>
                           <Kbd>Enter</Kbd> confirmar sugestão
                        </span>
                        <span>
                           <Kbd>Espaço</Kbd> ementas
                        </span>
                        <span>
                           <Kbd>C</Kbd> perguntar
                        </span>
                        <span>
                           <Kbd>X</Kbd> selecionar
                        </span>
                        <span>
                           <Kbd>]</Kbd> <Kbd>[</Kbd> pendentes
                        </span>
                     </p>
                  </>
               )}

               <SecoesComplementares casoId={caso.id} analise={analise} naoAproveitadas={naoAproveitadas} podeEditar={podeDecidir} />
               {analise.itens.length > 0 ? (
                  <p className="text-[11.5px] text-ink-4 print:hidden">
                     {int(analise.itens.length)} disciplinas na matriz <span className="font-mono">{analise.matriz.codigo}</span>
                  </p>
               ) : null}
            </div>
         </div>

         <AceitarLoteModal
            itens={aceitaveis}
            aberto={aceitarAberto}
            salvando={lote.isPending}
            onFechar={() => setAceitarAberto(false)}
            onConfirmar={aceitarAlta}
         />
         <PerguntaModal
            item={perguntaItem}
            salvando={perguntar.isPending}
            onFechar={() => setPerguntaItem(null)}
            onEnviar={(item, entrada) =>
               perguntar.mutate(
                  { itemId: item.id, entrada },
                  {
                     onSuccess: () => {
                        setPerguntaItem(null);
                        fixar([item.id]);
                        notificar({ titulo: "Pergunta registrada", detalhe: "Envie para a coordenação quando terminar as perguntas." });
                     },
                  },
               )
            }
         />
         <TrocarOrigemModal
            key={origemItem?.id ?? "nenhum"}
            item={origemItem}
            origem={analise.origem}
            salvando={decidir.isPending}
            onFechar={() => setOrigemItem(null)}
            onSalvar={(item, ids) => {
               setOrigemItem(null);
               fixar([item.id]);
               decidir.mutate({
                  itemId: item.id,
                  entrada: ids.length ? { valor: "DISPENSA", origemIds: ids } : { valor: "REGULAR", origemIds: [] },
               });
            }}
         />
         <HistoricoItemModal item={historicoItem} onFechar={() => setHistoricoItem(null)} />
         <ConferenciaLadoALado
            caso={caso}
            analise={analise}
            aberta={url.conferir}
            itemInicial={url.item}
            podeDecidir={podeDecidir}
            onFechar={() => url.setConferir(false)}
            onSelecionar={gravarItem}
            onDecidir={(item, valor, origemIds) => {
               if (!podeDecidir || item.estado === "PERGUNTA_ABERTA") return;
               fixar([item.id]);
               decidir.mutate({ itemId: item.id, entrada: origemIds ? { valor, origemIds } : { valor } });
            }}
         />
         {acaoDoCaso(caso, "SOLICITAR_REANALISE") ? (
            <ReabrirAnaliseModal
               key={caso.versao}
               caso={caso}
               itens={analise.itens}
               aberto={url.acao === "reabrir"}
               onFechar={url.limparAcao}
            />
         ) : null}
         {acaoDoCaso(caso, "ALTERAR_DESTINO") ? (
            <TrocarMatrizModal
               caso={caso}
               matrizAtualId={analise.matriz.id}
               aberto={matrizAberta}
               onFechar={() => setMatrizAberta(false)}
            />
         ) : null}
      </div>
   );
}
