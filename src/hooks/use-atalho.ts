/**
 * Atalho de teclado da tela (docs/05 §6). Nunca dispara com foco em campo de texto nem quando o
 * evento nasce dentro de uma área com atalhos próprios (`data-atalhos-locais`, ex.: a grade da
 * análise) ou de um overlay aberto. Teclas com Ctrl/⌘/Alt ficam de fora, exceto quando pedidas.
 */
import { useEffect, useRef } from "react";

export interface OpcoesAtalho {
   enabled?: boolean;
   /** Exige Ctrl (Windows/Linux) ou ⌘ (macOS). */
   comModificador?: boolean;
}

function emCampoDeTexto(alvo: EventTarget | null): boolean {
   if (!(alvo instanceof HTMLElement)) return false;
   if (alvo.isContentEditable) return true;
   const tag = alvo.tagName;
   if (tag === "TEXTAREA" || tag === "SELECT") return true;
   if (tag === "INPUT") {
      const tipo = (alvo as HTMLInputElement).type;
      return !["checkbox", "radio", "button", "submit", "reset"].includes(tipo);
   }
   return false;
}

export function deveIgnorarAtalho(e: KeyboardEvent): boolean {
   if (e.defaultPrevented) return true;
   if (emCampoDeTexto(e.target)) return true;
   const alvo = e.target instanceof HTMLElement ? e.target : null;
   if (alvo?.closest("[data-atalhos-locais]")) return true;
   if (alvo?.closest('[role="dialog"], [role="menu"], [role="listbox"]')) return true;
   return false;
}

export function useAtalho(
   teclas: string | readonly string[],
   acao: (e: KeyboardEvent) => void,
   { enabled = true, comModificador = false }: OpcoesAtalho = {},
) {
   const ref = useRef(acao);
   useEffect(() => {
      ref.current = acao;
   });
   const lista = (Array.isArray(teclas) ? teclas : [teclas]).map(t => t.toLowerCase()).join("|");

   useEffect(() => {
      if (!enabled) return;
      const alvos = lista.split("|");
      const ouvir = (e: KeyboardEvent) => {
         const modificador = e.ctrlKey || e.metaKey;
         if (comModificador ? !modificador : modificador || e.altKey) return;
         if (!alvos.includes(e.key.toLowerCase())) return;
         if (!comModificador && deveIgnorarAtalho(e)) return;
         e.preventDefault();
         ref.current(e);
      };
      window.addEventListener("keydown", ouvir);
      return () => window.removeEventListener("keydown", ouvir);
   }, [lista, enabled, comModificador]);
}
