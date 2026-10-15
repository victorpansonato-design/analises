/**
 * Modo coordenação (docs/06 §4.3–4.5, refeito em 15/10/2026 para ser didático). O coordenador olha
 * cada disciplina com o fundamento técnico da área e diz se aproveita. Três passos por disciplina:
 *
 * 1. O que a analista pergunta (e a contestação do aluno, quando a análise foi reaberta).
 * 2. Compare: carga horária, ementas lado a lado e "Ver no histórico" (conferência lado a lado).
 * 3. O seu parecer em palavras ("Aproveita", "Não aproveita"…), com o fundamento técnico. O parecer
 *    vai para as observações do protocolo; ao terminar, o card "Próximo passo" devolve a análise
 *    para a equipe conferir.
 *
 * Fundamento obrigatório quando o parecer diverge da sugestão da analista. "Usar como regra" vem
 * marcado (cria a equivalência que reduz perguntas futuras).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "motion/react";
import { Check, CheckCheck, ScanSearch } from "lucide-react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Field } from "@/components/core/field";
import { MeterBar } from "@/components/core/meter-bar";
import { Notice } from "@/components/core/notice";
import { Status } from "@/components/core/status";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DecisaoItemSchema, type DecisaoItem } from "@/features/casos";
import { useAgora } from "@/hooks/use-agora";
import { horas, plural, stamp } from "@/lib/format";
import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { ComparacaoCh, EmentasLadoALado } from "@/features/analise/components/origem";
import { origensDoItem } from "@/features/analise/domain/analise.domain";
import { EXPLICACAO_PARECER, ORDEM_PARECER, TITULO_PARECER } from "@/features/analise/domain/parecer";
import type { ItemAnalise, ItemOrigem, RespostaEntrada } from "@/features/analise/types/analise.schema";

function esquemaParecer(sugerida: DecisaoItem) {
   return z
      .object({
         decisao: DecisaoItemSchema,
         comentario: z.string().max(600, "O fundamento pode ter até 600 caracteres"),
         usarComoRegra: z.boolean(),
      })
      .superRefine((v, ctx) => {
         if (v.decisao !== sugerida && v.comentario.trim().length < 10)
            ctx.addIssue({
               code: "custom",
               path: ["comentario"],
               message: "Seu parecer é diferente da sugestão: explique o fundamento em uma frase",
            });
      });
}
type ParecerForm = z.infer<ReturnType<typeof esquemaParecer>>;

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
   return (
      <section className="grid grid-cols-[24px_minmax(0,1fr)] gap-x-3">
         <span
            aria-hidden
            className="mt-px grid size-6 place-items-center rounded-full bg-surface-2 font-mono text-[11px] font-medium text-ink-2"
         >
            {n}
         </span>
         <div className="min-w-0 space-y-2">
            <h4 className="text-[12.5px] font-semibold text-ink">{titulo}</h4>
            {children}
         </div>
      </section>
   );
}

interface CardPerguntaProps {
   item: ItemAnalise;
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   podeResponder: boolean;
   salvando: boolean;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada) => void;
   onConferir?: (item: ItemAnalise) => void;
}

function CardPergunta({ item, origemPorId, podeResponder, salvando, onResponder, onConferir }: CardPerguntaProps) {
   const agora = useAgora();
   const p = item.pergunta;
   const sugerida = p?.decisaoSugerida ?? item.sugestao?.decisao ?? "DISPENSA";
   const form = useForm<ParecerForm>({
      resolver: zodResolver(esquemaParecer(sugerida)),
      defaultValues: { decisao: sugerida, comentario: "", usarComoRegra: true },
   });
   const decisao = useWatch({ control: form.control, name: "decisao" });
   const usarComoRegra = useWatch({ control: form.control, name: "usarComoRegra" });
   const enviar = form.handleSubmit(v =>
      onResponder(item, { decisao: v.decisao, comentario: v.comentario.trim() || undefined, usarComoRegra: v.usarComoRegra }),
   );
   const respondida = item.estado === "RESPONDIDO" ? (p?.resposta ?? null) : null;
   const origens = origensDoItem(item, origemPorId);

   return (
      <article aria-label={`Parecer sobre ${item.disciplina}`} className="space-y-4 rounded-xl bg-card p-5">
         <header className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-[14.5px] font-semibold text-ink">
               {item.disciplina}{" "}
               <span className="font-mono text-[12px] font-normal text-ink-3">
                  {item.codigo ? `${item.codigo} · ` : ""}
                  {horas(item.ch)}
               </span>
            </p>
            {respondida ? <Status tone="ok">Parecer registrado</Status> : <Status tone="warn">Aguardando o seu parecer</Status>}
         </header>

         <Passo n={1} titulo="O que a analista pergunta">
            {p ? (
               <blockquote className="rounded-lg bg-surface-2 p-3">
                  <p className="text-[13px] leading-relaxed text-ink">{p.texto}</p>
                  <p className="mt-1.5 text-[11.5px] text-ink-3">
                     {p.por.nome} · {stamp(p.em, agora)} · sugestão:{" "}
                     <span className="font-medium text-ink-2">{TITULO_PARECER[p.decisaoSugerida]}</span>
                  </p>
               </blockquote>
            ) : null}
            {item.contestacao ? (
               <p className="rounded-lg bg-risk-soft px-3 py-2 text-[12.5px] text-ink">
                  <span className="font-semibold text-risk-ink">Contestação do aluno:</span> {item.contestacao.texto}
               </p>
            ) : null}
         </Passo>

         <Passo n={2} titulo="Compare com o histórico do aluno">
            {origens.length > 0 ? <ComparacaoCh origens={origens} chDestino={item.ch} /> : null}
            <EmentasLadoALado item={item} origens={origens} />
            {onConferir ? (
               <Button size="xs" variant="ghost" icon={<ScanSearch aria-hidden />} onClick={() => onConferir(item)}>
                  Ver no histórico escolar
               </Button>
            ) : null}
         </Passo>

         <Passo n={3} titulo={respondida ? "Seu parecer" : "Qual é o seu parecer?"}>
            {respondida ? (
               <div className="rounded-lg bg-surface-2 p-3 text-[12.5px]">
                  <p className="flex items-center gap-1.5 font-semibold text-ink">
                     <Check aria-hidden className="size-4 text-brand-text" /> {TITULO_PARECER[respondida.decisao]}
                  </p>
                  {respondida.comentario ? <p className="mt-1 text-ink-2">Fundamento: {respondida.comentario}</p> : null}
                  <p className="mt-1 text-[11.5px] text-ink-4">
                     {respondida.por.nome} · {stamp(respondida.em, agora)} · registrado nas observações do protocolo
                  </p>
               </div>
            ) : podeResponder ? (
               <form onSubmit={enviar} className="space-y-3" noValidate>
                  <Controller
                     control={form.control}
                     name="decisao"
                     render={({ field }) => (
                        <div role="radiogroup" aria-label={`Parecer para ${item.disciplina}`} className="grid grid-cols-2 gap-2">
                           {ORDEM_PARECER.map(d => {
                              const ativo = field.value === d;
                              return (
                                 <motion.button
                                    key={d}
                                    type="button"
                                    role="radio"
                                    aria-checked={ativo}
                                    whileTap={press}
                                    onClick={() => field.onChange(d)}
                                    className={cn(
                                       "rounded-xl p-3 text-left transition-colors",
                                       ativo ? "bg-brand-soft ring-2 ring-brand" : "bg-surface-2 hover:bg-surface-3",
                                    )}
                                 >
                                    <span className="flex items-center justify-between gap-2">
                                       <span className="text-[13px] font-semibold text-ink">{TITULO_PARECER[d]}</span>
                                       {d === sugerida ? (
                                          <span className="text-[10.5px] font-medium text-ink-4">sugestão da analista</span>
                                       ) : null}
                                    </span>
                                    <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-3">{EXPLICACAO_PARECER[d]}</span>
                                 </motion.button>
                              );
                           })}
                        </div>
                     )}
                  />
                  <Field
                     label="Fundamento técnico"
                     required={decisao !== sugerida}
                     hint={decisao === sugerida ? "opcional" : undefined}
                     help="Vai para as observações do protocolo, para a equipe de análises conferir."
                     error={form.formState.errors.comentario?.message}
                  >
                     {f => (
                        <Textarea
                           {...f}
                           {...form.register("comentario")}
                           rows={2}
                           placeholder="Ex.: a ementa de origem cobre limites, derivadas e integrais; carga horária equivalente"
                        />
                     )}
                  </Field>
                  <label className="flex items-start gap-2 text-[12.5px] text-ink-2">
                     <input type="checkbox" {...form.register("usarComoRegra")} className="mt-0.5 size-4 accent-brand" />
                     <span>
                        Usar como regra para os próximos casos
                        <span className="block text-[11.5px] text-ink-4">
                           {usarComoRegra
                              ? "A mesma disciplina desta instituição passa a vir como regra na pré-análise."
                              : "Vale só para este caso."}
                        </span>
                     </span>
                  </label>
                  <Button className="acao-destaque" data-tom="coordenacao" type="submit" disabled={salvando}>
                     Registrar parecer
                  </Button>
               </form>
            ) : (
               <p className="text-[12.5px] text-ink-3">Aguardando o parecer da coordenação.</p>
            )}
         </Passo>
      </article>
   );
}

interface ModoCoordenacaoProps {
   itens: ItemAnalise[];
   origemPorId: ReadonlyMap<string, ItemOrigem>;
   podeResponder: boolean;
   motivoBloqueio: string | null;
   salvando: boolean;
   onResponder: (item: ItemAnalise, entrada: RespostaEntrada) => void;
   onAprovarTodas: () => void;
   onConferir?: (item: ItemAnalise) => void;
}

export function ModoCoordenacao({
   itens,
   origemPorId,
   podeResponder,
   motivoBloqueio,
   salvando,
   onResponder,
   onAprovarTodas,
   onConferir,
}: ModoCoordenacaoProps) {
   const abertas = itens.filter(i => i.estado === "PERGUNTA_ABERTA").length;
   const feitas = itens.length - abertas;
   if (itens.length === 0) {
      return (
         <EmptyPanel
            compact
            title="Nenhuma pergunta para a coordenação"
            message="A analista não registrou perguntas neste caso. Use o filtro Todas para ver a grade completa."
         />
      );
   }
   return (
      <div className="space-y-3 print:hidden">
         <div className="space-y-2.5 rounded-xl bg-card p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
               <div>
                  <p className="text-[13.5px] font-semibold text-ink">
                     {abertas > 0
                        ? `${plural(abertas, "disciplina aguarda", "disciplinas aguardam")} o seu parecer`
                        : "Todos os pareceres registrados"}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-3">
                     Para cada disciplina: leia a pergunta, compare com o histórico e diga se aproveita. O parecer vai para as observações.
                  </p>
               </div>
               {podeResponder && abertas > 1 ? (
                  <Button variant="ghost" icon={<CheckCheck />} onClick={onAprovarTodas} disabled={salvando}>
                     Concordar com todas as sugestões
                  </Button>
               ) : null}
            </div>
            <div className="flex items-center gap-3">
               <MeterBar value={itens.length ? feitas / itens.length : 0} height={6} label={`${feitas} de ${itens.length} pareceres`} />
               <span className="shrink-0 font-mono text-[12px] text-ink-2 tabular-nums">
                  {feitas} de {itens.length}
               </span>
            </div>
         </div>
         {abertas === 0 && podeResponder ? (
            <Notice tone="info" title="Pronto para devolver">
               Devolva para a equipe de análises no card Próximo passo, acima. A equipe confere os pareceres e conclui a análise.
            </Notice>
         ) : null}
         {!podeResponder && motivoBloqueio ? <p className="text-[12px] text-ink-3">{motivoBloqueio}</p> : null}
         {itens.map(item => (
            <CardPergunta
               key={item.id}
               item={item}
               origemPorId={origemPorId}
               podeResponder={podeResponder}
               salvando={salvando}
               onResponder={onResponder}
               onConferir={onConferir}
            />
         ))}
      </div>
   );
}
