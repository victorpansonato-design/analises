/**
 * Parecer da coordenação numa linha só, usado no card da análise e na conferência lado a lado
 * (decisão de 16/10/2026: direto, sem passo a passo). Siglas da equipe (Dispensa, DP, ADAP,
 * Regular), com a sugestão da analista marcada por um ponto; fundamento ao lado; Enter registra.
 *
 * - Fundamento obrigatório só quando o parecer diverge da sugestão da analista.
 * - "Usar como regra" vem marcado (cria a equivalência que reduz perguntas futuras).
 * - `tecla` (1 a 4 na conferência) escolhe a sigla de fora, sem tirar o foco de onde está.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { SegmentedControl } from "@/components/core/segmented-control";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DecisaoItemSchema, ROTULO_DECISAO, type DecisaoItem } from "@/features/casos";
import { useAgora } from "@/hooks/use-agora";
import { stamp } from "@/lib/format";

import { DECISOES } from "@/features/analise/domain/analise.domain";
import { sugestaoDaPergunta } from "@/features/analise/domain/parecer";
import type { ItemAnalise, Pergunta, RespostaEntrada } from "@/features/analise/types/analise.schema";

function esquemaParecer(sugerida: DecisaoItem) {
   return z
      .object({
         decisao: DecisaoItemSchema,
         comentario: z.string().max(600, "O fundamento pode ter até 600 caracteres"),
         usarComoRegra: z.boolean(),
      })
      .superRefine((v, ctx) => {
         if (v.decisao !== sugerida && v.comentario.trim().length < 10)
            ctx.addIssue({ code: "custom", path: ["comentario"], message: "Diverge da sugestão: informe o fundamento" });
      });
}
type ParecerForm = z.infer<ReturnType<typeof esquemaParecer>>;

interface FormParecerProps {
   item: ItemAnalise;
   salvando: boolean;
   onResponder: (entrada: RespostaEntrada) => void;
   /** Contexto do `layoutId` da pastilha (dois formulários da mesma disciplina não podem dividir). */
   contexto: string;
   tecla?: { valor: DecisaoItem; n: number } | null;
   /** Permite registrar de fora (Enter na conferência, com o foco fora do formulário). */
   id?: string;
}

export function FormParecer({ item, salvando, onResponder, contexto, tecla, id }: FormParecerProps) {
   const sugerida = sugestaoDaPergunta(item);
   const form = useForm<ParecerForm>({
      resolver: zodResolver(esquemaParecer(sugerida)),
      defaultValues: { decisao: sugerida, comentario: "", usarComoRegra: true },
   });
   const decisao = useWatch({ control: form.control, name: "decisao" });
   const { setValue } = form;
   useEffect(() => {
      if (tecla) setValue("decisao", tecla.valor);
   }, [tecla, setValue]);

   const enviar = form.handleSubmit(v =>
      onResponder({ decisao: v.decisao, comentario: v.comentario.trim() || undefined, usarComoRegra: v.usarComoRegra }),
   );
   const erro = form.formState.errors.comentario?.message;
   const opcoes = DECISOES.map(d => ({
      value: d,
      label:
         d === sugerida ? (
            <span className="inline-flex items-center gap-1">
               {ROTULO_DECISAO[d]}
               <span aria-hidden className="size-1 rounded-full bg-current opacity-60" />
            </span>
         ) : (
            ROTULO_DECISAO[d]
         ),
      ariaLabel: d === sugerida ? `${ROTULO_DECISAO[d]} (sugestão da analista)` : ROTULO_DECISAO[d],
   }));

   return (
      <form id={id} onSubmit={enviar} noValidate className="space-y-1.5">
         <div className="flex items-center gap-2">
            <Controller
               control={form.control}
               name="decisao"
               render={({ field }) => (
                  <SegmentedControl
                     options={opcoes}
                     value={field.value}
                     onChange={field.onChange}
                     layoutId={`parecer-${contexto}-${item.id}`}
                     ariaLabel={`Parecer para ${item.disciplina}`}
                  />
               )}
            />
            <Input
               {...form.register("comentario")}
               aria-label="Fundamento"
               aria-invalid={!!erro || undefined}
               placeholder={decisao === sugerida ? "Fundamento (opcional)" : "Fundamento"}
               className="h-8 min-w-0 flex-1 rounded-full px-3.5 text-[12.5px]"
            />
            <Button className="acao-destaque" data-tom="coordenacao" size="sm" type="submit" disabled={salvando}>
               Registrar
            </Button>
         </div>
         <div className="flex items-center gap-3 pl-1 text-[11.5px]">
            <label className="inline-flex items-center gap-1.5 text-ink-3">
               <input type="checkbox" {...form.register("usarComoRegra")} className="size-3.5 accent-brand" />
               Usar como regra
            </label>
            {erro ? (
               <span role="alert" className="text-crit-ink">
                  {erro}
               </span>
            ) : null}
         </div>
      </form>
   );
}

/** Parecer já registrado, numa linha. */
export function ParecerRegistrado({ resposta }: { resposta: NonNullable<Pergunta["resposta"]> }) {
   const agora = useAgora();
   return (
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px]">
         <span className="inline-flex items-center gap-1 font-semibold text-ink">
            <Check aria-hidden className="size-3.5 self-center text-brand-text" /> {ROTULO_DECISAO[resposta.decisao]}
         </span>
         {resposta.comentario ? <span className="text-ink-2">{resposta.comentario}</span> : null}
         <span className="text-[11.5px] text-ink-4">
            {resposta.por.nome} · {stamp(resposta.em, agora)}
         </span>
      </p>
   );
}

/** Pergunta da analista e contestação do aluno, em texto corrido. */
export function PerguntaDaAnalista({ item }: { item: ItemAnalise }) {
   const agora = useAgora();
   const p = item.pergunta;
   return (
      <div className="space-y-1">
         {p ? (
            <p className="text-[13px] leading-relaxed text-ink">
               {p.texto}{" "}
               <span className="text-[11.5px] whitespace-nowrap text-ink-4">
                  {p.por.nome} · {stamp(p.em, agora)} · sugestão {ROTULO_DECISAO[p.decisaoSugerida]}
               </span>
            </p>
         ) : null}
         {item.contestacao ? (
            <p className="text-[12.5px] text-ink">
               <span className="font-semibold text-risk-ink">Contestação do aluno:</span> {item.contestacao.texto}
            </p>
         ) : null}
      </div>
   );
}
