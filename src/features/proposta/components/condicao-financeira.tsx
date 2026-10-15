/**
 * Condição financeira da proposta (docs/04 §3: visível para consultor, matrícula, diretoria e
 * admin; os demais veem só o porquê de não verem). Ela é guarda do envio: sem ela, a proposta não
 * sai. A pendência financeira anterior (retorno) aparece só como "Há pendência financeira", nunca
 * com valor.
 */
import { Lock, Wallet } from "lucide-react";

import { DataList } from "@/components/core/data-list";
import { Notice } from "@/components/core/notice";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { fullDate, lista, money, percent } from "@/lib/format";

import type { Financeiro } from "@/features/proposta/types/proposta.schema";

interface CondicaoFinanceiraProps {
   podeVer: boolean;
   financeiro: Financeiro | null;
   pendenciaFinanceiraAnterior: boolean | null;
}

const PAPEIS_QUE_VEEM_FINANCEIRO = ["matrícula", "consultor", "diretoria", "administração"] as const;

export function CondicaoFinanceira({ podeVer, financeiro, pendenciaFinanceiraAnterior }: CondicaoFinanceiraProps) {
   return (
      <Surface aria-label="Condição financeira">
         <SurfaceHeader title="Condição financeira" />
         <div className="mt-4 space-y-3">
            {!podeVer ? (
               <div className="flex items-start gap-2.5 text-[12.5px] leading-relaxed text-ink-3">
                  <Lock className="mt-0.5 size-3.5 shrink-0 text-ink-4" aria-hidden />
                  <p>Visível para {lista([...PAPEIS_QUE_VEEM_FINANCEIRO])}. Seu perfil vê o resumo acadêmico, sem valores.</p>
               </div>
            ) : financeiro ? (
               <DataList
                  columns={3}
                  items={[
                     { label: "Mensalidade", value: money(financeiro.mensalidade), mono: true },
                     {
                        label: "Desconto",
                        value: financeiro.descontoPercentual ? percent(financeiro.descontoPercentual / 100, 0) : "Sem desconto",
                        mono: !!financeiro.descontoPercentual,
                     },
                     { label: "Bolsa", value: financeiro.bolsa ?? "Sem bolsa" },
                     { label: "Parcelas", value: financeiro.parcelas ? `${financeiro.parcelas} parcelas` : null },
                     { label: "Válida até", value: financeiro.validadeAte ? fullDate(financeiro.validadeAte) : null, mono: true },
                     { label: "Observação", value: financeiro.observacao },
                  ]}
               />
            ) : (
               <Notice tone="warn" icon={Wallet} title="A condição financeira ainda não foi carregada">
                  Ela vem do sistema financeiro. Sem ela a proposta não pode ser enviada.
               </Notice>
            )}
            {pendenciaFinanceiraAnterior ? (
               <Notice tone="warn" title="Há pendência financeira">
                  De um vínculo anterior com a UniAnchieta. O valor fica com o financeiro: oriente o candidato a procurá-lo.
               </Notice>
            ) : null}
         </div>
      </Surface>
   );
}
