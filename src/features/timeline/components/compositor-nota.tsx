/**
 * Compositor de nota interna (docs/05 §3.4). A nota fica só para a equipe; `@` abre o autocomplete
 * de pessoas e quem for mencionado recebe aviso no sino.
 *
 * - RHF + Zod: nota vazia não sai; limite de 2.000 caracteres (contrato).
 * - Setas escolhem a pessoa, Enter ou Tab inserem, Escape fecha a lista. Ctrl+Enter salva.
 * - Sem permissão, o campo fica desabilitado COM o motivo visível.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { StickyNote } from "lucide-react";
import { useId, useRef, useState, type KeyboardEvent } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Initials } from "@/components/core/initials";
import { Kbd } from "@/components/core/kbd";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { lista } from "@/lib/format";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { acaoDoCaso, type CasoDetalhe, type UsuarioResumo } from "@/features/casos";
import { ROTULO_PAPEL } from "@/features/sessao";

import { useAdicionarNota } from "@/features/timeline/api/timeline.mutations";
import { consultaMencao, extrairMencoes, inserirMencao, sugerirPessoas } from "@/features/timeline/domain/mencoes";

export const NOTA_MAX = 2000;

const NotaSchema = z.object({
   texto: z.string().trim().min(1, "Escreva a nota antes de salvar").max(NOTA_MAX, "Use no máximo 2.000 caracteres"),
});
type NotaForm = z.infer<typeof NotaSchema>;

interface CompositorNotaProps {
   caso: CasoDetalhe;
   pessoas: readonly UsuarioResumo[];
}

export function CompositorNota({ caso, pessoas }: CompositorNotaProps) {
   const acao = acaoDoCaso(caso, "ADICIONAR_NOTA");
   const habilitada = acao?.habilitada ?? false;
   const motivo = !acao ? "Seu perfil não adiciona notas neste caso" : (acao.motivos[0] ?? "Notas indisponíveis neste caso");
   const adicionar = useAdicionarNota(caso.id);
   const form = useForm<NotaForm>({ resolver: zodResolver(NotaSchema), defaultValues: { texto: "" } });
   const textoRef = useRef<HTMLTextAreaElement | null>(null);
   const [consulta, setConsulta] = useState<{ inicio: number; termo: string } | null>(null);
   const [ativo, setAtivo] = useState(0);
   const listaId = useId();
   const sugestoes = consulta ? sugerirPessoas(pessoas, consulta.termo) : [];
   const aberta = sugestoes.length > 0;
   const { ref, onChange, ...campo } = form.register("texto");
   const erro = form.formState.errors.texto?.message;

   function atualizarConsulta(el: HTMLTextAreaElement) {
      setConsulta(consultaMencao(el.value.slice(0, el.selectionStart ?? el.value.length)));
      setAtivo(0);
   }

   function escolher(p: UsuarioResumo) {
      const el = textoRef.current;
      if (!el || !consulta) return;
      const r = inserirMencao(el.value, consulta.inicio, el.selectionStart ?? el.value.length, p);
      form.setValue("texto", r.texto, { shouldDirty: true });
      setConsulta(null);
      requestAnimationFrame(() => {
         el.focus();
         el.setSelectionRange(r.cursor, r.cursor);
      });
   }

   const salvar = form.handleSubmit(({ texto }) => {
      const mencoes = extrairMencoes(texto, pessoas);
      adicionar.mutate(
         { texto, mencoes },
         {
            onSuccess: () => {
               form.reset({ texto: "" });
               setConsulta(null);
               const nomes = pessoas.filter(p => mencoes.includes(p.id)).map(p => p.nome);
               notificar({
                  titulo: "Nota salva",
                  detalhe: nomes.length
                     ? `${lista(nomes)} ${nomes.length === 1 ? "recebe" : "recebem"} um aviso no sino.`
                     : "Só a equipe vê esta nota.",
               });
            },
         },
      );
   });

   function teclar(e: KeyboardEvent<HTMLTextAreaElement>) {
      if (aberta) {
         if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            const passo = e.key === "ArrowDown" ? 1 : -1;
            setAtivo(a => (a + passo + sugestoes.length) % sugestoes.length);
            return;
         }
         if ((e.key === "Enter" && !e.ctrlKey && !e.metaKey) || e.key === "Tab") {
            e.preventDefault();
            escolher(sugestoes[ativo] ?? sugestoes[0]);
            return;
         }
         if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setConsulta(null);
            return;
         }
      }
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
         e.preventDefault();
         void salvar();
      }
   }

   return (
      <form onSubmit={e => void salvar(e)} noValidate className="space-y-2">
         <label htmlFor={`${listaId}-texto`} className="sr-only">
            Nota interna
         </label>
         <div className="relative">
            <Textarea
               id={`${listaId}-texto`}
               {...campo}
               ref={el => {
                  ref(el);
                  textoRef.current = el;
               }}
               onChange={e => {
                  void onChange(e);
                  atualizarConsulta(e.currentTarget);
               }}
               onClick={e => atualizarConsulta(e.currentTarget)}
               onKeyDown={teclar}
               onBlur={e => {
                  void campo.onBlur(e);
                  // Deixa o clique numa sugestão acontecer antes de fechar a lista.
                  window.setTimeout(() => setConsulta(null), 120);
               }}
               disabled={!habilitada || adicionar.isPending}
               rows={3}
               maxLength={NOTA_MAX}
               placeholder="Escreva para a equipe. Use @ para avisar alguém."
               role="combobox"
               aria-autocomplete="list"
               aria-expanded={aberta}
               aria-controls={aberta ? listaId : undefined}
               aria-activedescendant={aberta ? `${listaId}-${ativo}` : undefined}
               aria-invalid={erro ? true : undefined}
               className="min-h-20"
            />
            {aberta ? (
               <ul
                  id={listaId}
                  role="listbox"
                  aria-label="Pessoas para mencionar"
                  className="absolute top-full left-0 z-30 mt-1 w-72 rounded-xl bg-card p-1 shadow-overlay"
               >
                  {sugestoes.map((p, i) => (
                     <li
                        key={p.id}
                        id={`${listaId}-${i}`}
                        role="option"
                        aria-selected={i === ativo}
                        onMouseDown={e => {
                           e.preventDefault();
                           escolher(p);
                        }}
                        onMouseEnter={() => setAtivo(i)}
                        className={cn(
                           "flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 transition-colors",
                           i === ativo ? "bg-surface-2" : "hover:bg-surface-hover",
                        )}
                     >
                        <Initials nome={p.nome} />
                        <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-ink">{p.nome}</span>
                        {p.papeis?.[0] ? <span className="shrink-0 text-[11px] text-ink-4">{ROTULO_PAPEL[p.papeis[0]]}</span> : null}
                     </li>
                  ))}
               </ul>
            ) : null}
         </div>
         {erro ? <p className="text-[11.5px] font-medium text-crit-ink">{erro}</p> : null}
         <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
            <p className="text-[11.5px] text-ink-4">
               {habilitada ? (
                  <>
                     Só a equipe vê. <Kbd>Ctrl</Kbd> + <Kbd>Enter</Kbd> salva.
                  </>
               ) : (
                  <span className="font-medium text-ink-3">{motivo}.</span>
               )}
            </p>
            <Button
               className="acao-destaque"
               data-tom="todas"
               type="submit"
               icon={<StickyNote />}
               disabled={!habilitada || adicionar.isPending}
            >
               {adicionar.isPending ? "Salvando…" : "Salvar nota"}
            </Button>
         </div>
      </form>
   );
}
