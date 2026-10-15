/**
 * Autocomplete da IES de origem. A lista vem do catálogo (`useInstituicoes`); quem digita um nome
 * que não está lá pode seguir com o texto livre (IES pequena, fora do catálogo): o `iesId` fica
 * `null` e a analista confere no histórico. Setas navegam, Enter escolhe, Escape fecha.
 */
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useId, useState, type KeyboardEvent } from "react";

import { CONTROL } from "@/components/core/field";
import { popoverVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

import { useInstituicoes } from "@/features/casos";

interface CampoIesProps {
   id: string;
   valor: string;
   onChange: (nome: string, iesId: string | null) => void;
   invalido?: boolean;
   describedBy?: string;
}

export function CampoIes({ id, valor, onChange, invalido, describedBy }: CampoIesProps) {
   const listaId = useId();
   const [termo, setTermo] = useState(valor);
   const [aberto, setAberto] = useState(false);
   const [ativo, setAtivo] = useState(0);
   const instituicoes = useInstituicoes(termo);
   const opcoes = instituicoes.data ?? [];
   const mostrar = aberto && termo.trim().length >= 2 && opcoes.length > 0;

   // Espera a pessoa parar de digitar antes de consultar o catálogo.
   useEffect(() => {
      const t = window.setTimeout(() => setTermo(valor), 250);
      return () => window.clearTimeout(t);
   }, [valor]);

   function escolher(i: number) {
      const o = opcoes[i];
      if (!o) return;
      onChange(o.nome, o.id);
      setAberto(false);
   }

   function teclas(e: KeyboardEvent<HTMLInputElement>) {
      if (e.key === "Enter") {
         e.preventDefault();
         if (mostrar) escolher(ativo);
         return;
      }
      if (!mostrar) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
         e.preventDefault();
         const d = e.key === "ArrowDown" ? 1 : -1;
         setAtivo(a => (a + d + opcoes.length) % opcoes.length);
      } else if (e.key === "Escape") {
         e.stopPropagation();
         setAberto(false);
      }
   }

   return (
      <div className="relative">
         <input
            id={id}
            role="combobox"
            aria-expanded={mostrar}
            aria-controls={listaId}
            aria-autocomplete="list"
            aria-activedescendant={mostrar ? `${listaId}-${ativo}` : undefined}
            aria-invalid={invalido || undefined}
            aria-describedby={describedBy}
            autoComplete="off"
            value={valor}
            placeholder="Digite o nome ou a sigla"
            onChange={e => {
               onChange(e.target.value, null);
               setAtivo(0);
               setAberto(true);
            }}
            onFocus={() => setAberto(true)}
            onBlur={() => window.setTimeout(() => setAberto(false), 120)}
            onKeyDown={teclas}
            className={cn(CONTROL, "h-9")}
         />
         <AnimatePresence>
            {mostrar ? (
               <motion.ul
                  id={listaId}
                  role="listbox"
                  variants={popoverVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="absolute inset-x-0 top-full z-10 mt-1 max-h-60 overflow-y-auto rounded-xl bg-card p-1 shadow-overlay"
               >
                  {opcoes.map((o, i) => (
                     <li
                        key={o.id}
                        id={`${listaId}-${i}`}
                        role="option"
                        aria-selected={i === ativo}
                        onMouseDown={e => {
                           e.preventDefault();
                           escolher(i);
                        }}
                        onMouseEnter={() => setAtivo(i)}
                        className={cn(
                           "cursor-pointer rounded-lg px-3 py-2 text-[13px] text-ink transition-colors",
                           i === ativo && "bg-surface-hover",
                        )}
                     >
                        {o.nome}
                        {o.sigla ? <span className="ml-1.5 text-[11.5px] text-ink-4">{o.sigla}</span> : null}
                     </li>
                  ))}
               </motion.ul>
            ) : null}
         </AnimatePresence>
      </div>
   );
}
