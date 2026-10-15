/**
 * Estado da tela única na URL (docs/14 ADR-006): caso aberto, aba, visão da fila, filtros e ordem.
 * O "voltar" do navegador funciona e um link colado no Teams abre exatamente o mesmo lugar, para
 * qualquer papel.
 */
import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { FiltrosFila } from "@/features/casos/api/casos.keys";
import { ehAba, type Aba } from "@/features/casos/domain/abas";
import { ehProcesso, filasDoProcesso, tiposDoProcesso } from "@/features/casos/domain/processos";
import { OrdemSchema, VisaoSchema, type Ordem, type Visao } from "@/features/casos/types/caso.schema";

/** Chaves de filtro da fila (limpas juntas em "Limpar filtros"). */
const CHAVES_FILTRO = [
   "etapa",
   "tipo",
   "curso",
   "turno",
   "modalidade",
   "resp",
   "atrasados",
   "pendencia",
   "ouvidoria",
   "encerrados",
] as const;

/** Chaves que pertencem ao caso aberto: trocam ao trocar de caso. */
const CHAVES_DO_CASO = ["aba", "filtro", "item", "busca", "imprimir", "acao", "hist", "conferir"] as const;

export function useCasosUrlState() {
   const [params, setParams] = useSearchParams();

   const filtros = useMemo<FiltrosFila>(
      () => ({
         visao: VisaoSchema.catch("TODOS").parse(params.get("visao") ?? undefined),
         processo: ehProcesso(params.get("processo")) ? params.get("processo") : null,
         etapa: params.get("etapa"),
         tipo: params.get("tipo"),
         curso: params.get("curso"),
         turno: params.get("turno"),
         modalidade: params.get("modalidade"),
         responsavel: params.get("resp"),
         somenteAtrasados: params.get("atrasados") === "1",
         comPendencia: params.get("pendencia") === "1",
         ouvidoria: params.get("ouvidoria") === "1",
         incluirEncerrados: !params.get("etapa") || params.get("etapa") === "CONCLUIDAS" || params.get("encerrados") === "1",
         ciclo: params.get("ciclo"),
         q: params.get("q") ?? "",
         ordem: OrdemSchema.catch("PRIORIDADE").parse(params.get("ordem") ?? undefined),
      }),
      [params],
   );

   const casoId = params.get("caso");
   const abaUrl = params.get("aba");
   const aba: Aba | null = ehAba(abaUrl) ? abaUrl : null;
   const painel = params.get("painel");
   const novo = params.get("novo") === "1";
   const deCasoId = params.get("de");

   const alterar = useCallback(
      (mudar: (p: URLSearchParams) => void, opcoes?: { replace?: boolean }) => {
         setParams(
            prev => {
               const next = new URLSearchParams(prev);
               mudar(next);
               return next;
            },
            { replace: opcoes?.replace ?? false },
         );
      },
      [setParams],
   );

   const definir = (p: URLSearchParams, chave: string, valor: string | null | boolean) => {
      if (valor === null || valor === false || valor === "") p.delete(chave);
      else p.set(chave, valor === true ? "1" : valor);
   };

   const abrirCaso = useCallback(
      (id: string | null, aba?: Aba) =>
         alterar(p => {
            if (p.get("caso") !== id) for (const k of CHAVES_DO_CASO) p.delete(k);
            definir(p, "caso", id);
            if (aba) p.set("aba", aba);
            p.delete("painel");
            p.delete("novo");
            p.delete("de");
         }),
      [alterar],
   );

   return {
      filtros,
      casoId,
      aba,
      painel,
      novo,
      deCasoId,
      temFiltro: CHAVES_FILTRO.some(k => params.has(k)),
      abrirCaso,
      limparPesquisa: useCallback(
         () =>
            alterar(
               p => {
                  for (const k of CHAVES_FILTRO) if (k !== "etapa") p.delete(k);
                  p.delete("q");
               },
               { replace: true },
            ),
         [alterar],
      ),
      verTodas: useCallback(
         () =>
            alterar(
               p => {
                  CHAVES_FILTRO.forEach(k => p.delete(k));
                  for (const k of ["q", "visao", "ciclo"]) p.delete(k);
               },
               { replace: true },
            ),
         [alterar],
      ),
      buscarAluno: useCallback(
         (q: string) =>
            alterar(p => {
               CHAVES_FILTRO.forEach(k => p.delete(k));
               CHAVES_DO_CASO.forEach(k => p.delete(k));
               // A busca de aluno atravessa processos e etapas.
               for (const k of ["caso", "painel", "ciclo", "visao", "processo"]) p.delete(k);
               p.set("q", q);
            }),
         [alterar],
      ),
      setOferta: useCallback(
         (oferta: string) =>
            alterar(
               p => {
                  const [modalidade, turno] = oferta.split(":");
                  definir(p, "modalidade", modalidade || null);
                  definir(p, "turno", turno || null);
               },
               { replace: true },
            ),
         [alterar],
      ),
      setAba: useCallback((a: Aba) => alterar(p => p.set("aba", a), { replace: true }), [alterar]),
      /** Abre uma aba já no ponto certo (ex.: Análise filtrada em "coordenação", Proposta com um modal). */
      irPara: useCallback(
         (destino: { aba: Aba; extras?: Record<string, string> }) =>
            alterar(p => {
               p.set("aba", destino.aba);
               for (const [k, v] of Object.entries(destino.extras ?? {})) p.set(k, v);
            }),
         [alterar],
      ),
      setVisao: useCallback((v: Visao) => alterar(p => definir(p, "visao", v === "MINHA_VEZ" ? null : v), { replace: true }), [alterar]),
      setOrdem: useCallback((o: Ordem) => alterar(p => definir(p, "ordem", o === "PRIORIDADE" ? null : o), { replace: true }), [alterar]),
      setFiltro: useCallback(
         (chave: (typeof CHAVES_FILTRO)[number], valor: string | boolean | null) =>
            alterar(p => definir(p, chave, valor), { replace: true }),
         [alterar],
      ),
      /** Clicar numa etapa do funil filtra a fila; clicar de novo limpa. */
      alternarEtapa: useCallback(
         (etapa: string) =>
            alterar(
               p => {
                  p.delete("q");
                  if (etapa === "TODAS") p.delete("etapa");
                  else {
                     p.set("etapa", etapa);
                     p.set("visao", "TODOS");
                  }
                  p.delete("painel");
               },
               { replace: true },
            ),
         [alterar],
      ),
      /**
       * Troca o processo. A fila de etapa que não existe no novo processo volta a "Todas" e o tipo
       * que não pertence a ele é limpo: nenhum filtro fica escondido zerando a lista.
       */
      setProcesso: useCallback(
         (processo: string | null) =>
            alterar(
               p => {
                  definir(p, "processo", processo);
                  p.delete("q");
                  const etapa = p.get("etapa");
                  if (etapa && !filasDoProcesso(processo).some(f => f.id === etapa)) p.delete("etapa");
                  const tipo = p.get("tipo");
                  if (tipo && !(tiposDoProcesso(processo) as readonly string[]).includes(tipo)) p.delete("tipo");
               },
               { replace: true },
            ),
         [alterar],
      ),
      limparFiltros: useCallback(() => alterar(p => CHAVES_FILTRO.forEach(k => p.delete(k)), { replace: true }), [alterar]),
      setBusca: useCallback((q: string) => alterar(p => definir(p, "q", q.trim() ? q : null), { replace: true }), [alterar]),
      setCiclo: useCallback((ciclo: string | null) => alterar(p => definir(p, "ciclo", ciclo), { replace: true }), [alterar]),
      setPainel: useCallback((painel: string | null) => alterar(p => definir(p, "painel", painel)), [alterar]),
      abrirNovoProtocolo: useCallback(
         (deCaso?: string) =>
            alterar(p => {
               p.set("novo", "1");
               definir(p, "de", deCaso ?? null);
            }),
         [alterar],
      ),
      fecharNovoProtocolo: useCallback(
         () =>
            alterar(
               p => {
                  p.delete("novo");
                  p.delete("de");
               },
               { replace: true },
            ),
         [alterar],
      ),
   };
}
