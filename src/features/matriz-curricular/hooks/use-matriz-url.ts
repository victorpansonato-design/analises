/**
 * Estado da tela na URL: `q` (nome ou código), `modalidade` (presencial | hibrido | ead), `turno`
 * (diurno | noturno, só com presencial), `curriculo` (o currículo aberto) e `aba` (disciplinas |
 * grupos). O link colado no Teams abre a mesma busca ou o mesmo currículo. Digitar e filtrar usam
 * `replace`; abrir e fechar um currículo entram no histórico, para o "voltar" do navegador funcionar.
 */
import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

import {
   ModalidadeMatrizSchema,
   TurnoMatrizSchema,
   type ModalidadeMatriz,
   type TurnoMatriz,
} from "@/features/matriz-curricular/types/matriz.schema";

export const ABAS_CURRICULO = ["disciplinas", "grupos"] as const;
export type AbaCurriculo = (typeof ABAS_CURRICULO)[number];

export interface MatrizUrl {
   q: string;
   modalidade: ModalidadeMatriz | null;
   turno: TurnoMatriz | null;
   curriculo: string | null;
   aba: AbaCurriculo;
   setQ: (q: string) => void;
   setModalidade: (m: ModalidadeMatriz | null) => void;
   setTurno: (t: TurnoMatriz | null) => void;
   abrirCurriculo: (id: string) => void;
   fecharCurriculo: () => void;
   setAba: (a: AbaCurriculo) => void;
}

export function useMatrizUrl(): MatrizUrl {
   const [params, setParams] = useSearchParams();
   const m = ModalidadeMatrizSchema.safeParse(params.get("modalidade")?.toUpperCase());
   const modalidade = m.success ? m.data : null;
   const t = TurnoMatrizSchema.safeParse(params.get("turno")?.toUpperCase());
   const turno = modalidade === "PRESENCIAL" && t.success ? t.data : null;
   const abaBruta = params.get("aba");

   const mudar = useCallback(
      (valores: Record<string, string | null>, replace = true) =>
         setParams(
            prev => {
               const p = new URLSearchParams(prev);
               for (const [chave, valor] of Object.entries(valores)) {
                  if (valor === null || valor === "") p.delete(chave);
                  else p.set(chave, valor);
               }
               return p;
            },
            { replace },
         ),
      [setParams],
   );

   return {
      q: params.get("q") ?? "",
      modalidade,
      turno,
      curriculo: params.get("curriculo"),
      aba: abaBruta === "grupos" ? "grupos" : "disciplinas",
      setQ: useCallback((q: string) => mudar({ q: q.trim() ? q : null }), [mudar]),
      // Sair do presencial descarta o turno: híbrido e EAD não têm turno.
      setModalidade: useCallback(
         (m: ModalidadeMatriz | null) => mudar({ modalidade: m ? m.toLowerCase() : null, ...(m === "PRESENCIAL" ? {} : { turno: null }) }),
         [mudar],
      ),
      setTurno: useCallback((t: TurnoMatriz | null) => mudar({ turno: t ? t.toLowerCase() : null }), [mudar]),
      abrirCurriculo: useCallback((id: string) => mudar({ curriculo: id, aba: null }, false), [mudar]),
      fecharCurriculo: useCallback(() => mudar({ curriculo: null, aba: null }, false), [mudar]),
      setAba: useCallback((a: AbaCurriculo) => mudar({ aba: a === "disciplinas" ? null : a }), [mudar]),
   };
}
