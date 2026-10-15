import { Check, CircleAlert, Wallet } from "lucide-react";
import { useState } from "react";
import { EmptyPanel } from "@/components/core/empty-panel";
import { Drawer } from "@/components/core/overlay";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { conferirMensalidades, moedaDispensa, type ResultadoDispensa } from "../domain";
import type { AlunoDispensa } from "../types";

function LinhaValor({ label, valor }: { label: string; valor: number }) {
   return (
      <div className="flex flex-col gap-1">
         <dt className="text-ink-3">{label}</dt>
         <dd className="font-semibold text-[15px]">{moedaDispensa(valor)}</dd>
      </div>
   );
}

export function FinanceiroDispensa({
   open,
   onOpenChange,
   aluno,
   periodo,
   resultado,
   mensalidades,
   alterado,
}: {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   aluno: AlunoDispensa;
   periodo: string;
   resultado: ResultadoDispensa;
   mensalidades: import("../types").MensalidadeDispensa[];
   alterado: boolean;
}) {
   const [filtro, setFiltro] = useState<"todas" | "diferencas">("todas");
   const linhas = conferirMensalidades(mensalidades, resultado);
   const divergentes = linhas.filter(m => m.diferenca !== 0);
   const maior = linhas.reduce((s, m) => s + Math.max(0, m.diferenca), 0);
   const menor = linhas.reduce((s, m) => s + Math.max(0, -m.diferenca), 0);
   const visiveis = filtro === "diferencas" ? divergentes : linhas;
   const mes = (valor: string) =>
      new Intl.DateTimeFormat("pt-BR", { month: "long", timeZone: "UTC" }).format(new Date(`${valor}-01T12:00:00Z`));
   return (
      <Drawer
         open={open}
         onOpenChange={onOpenChange}
         width="xl"
         title="Financeiro do aluno"
         icon={Wallet}
         description={`${aluno.nome} · RA ${aluno.ra} · período ${periodo}`}
         footer={
            <div className="flex items-center justify-between gap-4">
               <span className="text-[11.5px] text-ink-3">Conferência de valores. Nenhum lançamento é alterado.</span>
               <Button onClick={() => onOpenChange(false)}>Voltar ao cálculo</Button>
            </div>
         }
      >
         <div className="flex flex-col gap-5 p-5">
            <div
               className={cn(
                  "flex items-start gap-3 rounded-lg p-4",
                  divergentes.length ? "bg-warn-soft text-warn-ink" : "bg-success-soft text-ok-ink",
               )}
            >
               {divergentes.length ? (
                  <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
               ) : (
                  <Check className="mt-0.5 size-5 shrink-0" aria-hidden />
               )}
               <div>
                  <h3 className="text-[14px] font-semibold">
                     {linhas.length === 0
                        ? "Sem mensalidades para comparar"
                        : divergentes.length
                          ? `${divergentes.length} de ${linhas.length} mensalidades precisam de conferência`
                          : "Valores conferem com o cálculo"}
                  </h3>
                  <p className="mt-1 text-[12px] leading-relaxed">
                     {linhas.length === 0
                        ? "Não há lançamentos de mensalidade disponíveis para este período."
                        : divergentes.length
                          ? "Uma diferença indica um valor a revisar. Verifique descontos, dispensas e vigência antes de solicitar um ajuste."
                          : "Todas as mensalidades deste período coincidem com os valores previstos."}
                  </p>
               </div>
            </div>
            {alterado && (
               <p className="text-[12px] font-medium text-brand-text">
                  Comparação com a simulação ajustada, incluindo suas alterações na grade e nos descontos.
               </p>
            )}
            <dl className="grid grid-cols-3 gap-4 border-b border-hairline pb-5 text-[12px] tabular-nums">
               <LinhaValor label="Previsto por mês" valor={resultado.regular} />
               <LinhaValor label="Total a maior" valor={maior} />
               <LinhaValor label="Total a menor" valor={menor} />
            </dl>
            <div className="flex items-center justify-between gap-4">
               <h3 className="text-[14px] font-semibold">Mensalidades · {periodo}</h3>
               <SegmentedControl
                  ariaLabel="Filtrar mensalidades"
                  layoutId="filtro-financeiro"
                  value={filtro}
                  onChange={setFiltro}
                  options={[
                     { value: "todas", label: "Todas", count: linhas.length },
                     { value: "diferencas", label: "Com diferença", count: divergentes.length },
                  ]}
                  size="xs"
               />
            </div>
            {linhas.length === 0 ? (
               <EmptyPanel
                  icon={Wallet}
                  title="Sem mensalidades neste período"
                  message="Não há lançamentos mensais disponíveis para comparação."
               />
            ) : visiveis.length === 0 ? (
               <EmptyPanel icon={Check} title="Nenhuma diferença encontrada" message="Todas as mensalidades coincidem com o cálculo." />
            ) : (
               <table className="w-full text-[12px] tabular-nums">
                  <caption className="sr-only">Comparação entre mensalidades previstas e lançadas para {periodo}</caption>
                  <thead className="bg-surface-2 text-left text-[11px] text-ink-3">
                     <tr>
                        <th scope="col" className="rounded-l-lg px-3 py-3">
                           Mês / situação
                        </th>
                        <th scope="col" className="px-3 py-3 text-right">
                           Previsto
                        </th>
                        <th scope="col" className="px-3 py-3 text-right">
                           Lançado
                        </th>
                        <th scope="col" className="rounded-r-lg px-3 py-3 text-right">
                           Conferência
                        </th>
                     </tr>
                  </thead>
                  <tbody>
                     {visiveis.map(m => (
                        <tr key={m.id} className="border-b border-hairline last:border-0">
                           <th scope="row" className="px-3 py-4 text-left font-medium">
                              <span className="capitalize">{mes(m.competencia)}</span>
                              <span className="mt-1 block text-[11px] font-normal text-ink-3">
                                 {m.pagamento} · vence {m.vencimento.split("-").reverse().slice(0, 2).join("/")}
                              </span>
                              {m.condicao !== "regular" && (
                                 <span className="block text-[10.5px] text-ink-3">
                                    {m.condicao === "antecipado1" ? "Antecipado 1" : "Antecipado 2"}
                                 </span>
                              )}
                           </th>
                           <td className="px-3 py-4 text-right whitespace-nowrap">{moedaDispensa(m.previsto)}</td>
                           <td className="px-3 py-4 text-right font-medium whitespace-nowrap">{moedaDispensa(m.valor)}</td>
                           <td className="px-3 py-4 text-right">
                              {m.diferenca === 0 ? (
                                 <span className="inline-flex items-center gap-1 text-ink-3">
                                    <Check className="size-3.5" aria-hidden />
                                    Confere
                                 </span>
                              ) : (
                                 <div className={cn("font-semibold", m.diferenca > 0 ? "text-crit-ink" : "text-warn-ink")}>
                                    {m.diferenca > 0 ? "+" : "−"} {moedaDispensa(Math.abs(m.diferenca))}
                                    <span className="mt-0.5 block text-[10.5px] font-medium">
                                       {m.diferenca > 0 ? "A maior" : "A menor"}
                                    </span>
                                 </div>
                              )}
                           </td>
                        </tr>
                     ))}
                  </tbody>
               </table>
            )}
            <p className="text-[11.5px] leading-relaxed text-ink-3">
               A comparação considera a condição de pagamento de cada mensalidade. Taxas, acordos, juros e multas não entram nesta
               conferência.
            </p>
         </div>
      </Drawer>
   );
}
