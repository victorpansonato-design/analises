/**
 * Toast no padrão do design system (§10.19) sobre o Sonner do template. Toast confirma que uma
 * mutação aconteceu e, onde útil, oferece A próxima ação provável ("Desfazer", "Abrir próximo
 * caso"). Nunca carrega informação que não exista em outro lugar da tela.
 */
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from "lucide-react";
import { toast } from "sonner";

import { lista } from "@/lib/format";
import { cn } from "@/lib/utils";
import { lerErroApi } from "@/services/api-erro";

export type TomToast = "ok" | "info" | "warn" | "crit";

const BAR: Record<TomToast, string> = { ok: "bg-ink-4", info: "bg-brand", warn: "bg-warn", crit: "bg-crit" };
const ICON_TONE: Record<TomToast, string> = { ok: "text-ink-3", info: "text-brand-text", warn: "text-warn-ink", crit: "text-crit-ink" };
const ICONE: Record<TomToast, LucideIcon> = { ok: CircleCheck, info: Info, warn: TriangleAlert, crit: CircleAlert };

interface Notificacao {
   titulo: string;
   detalhe?: string;
   tom?: TomToast;
   acao?: { rotulo: string; onClick: () => void };
   /** Em ms. Com ação de desfazer, use `UI.desfazerMs`. */
   duracao?: number;
}

export function notificar({ titulo, detalhe, tom = "ok", acao, duracao }: Notificacao): string | number {
   const Icone = ICONE[tom];
   return toast.custom(
      id => (
         <div
            role={tom === "crit" ? "alert" : "status"}
            className="pointer-events-auto relative flex w-[min(384px,calc(100vw-2rem))] gap-3 overflow-hidden rounded-xl bg-card p-3.5 pl-4 shadow-overlay"
         >
            <span aria-hidden className={cn("absolute inset-y-0 left-0 w-0.75", BAR[tom])} />
            <Icone aria-hidden className={cn("mt-px size-4 shrink-0", ICON_TONE[tom])} />
            <div className="min-w-0 flex-1">
               <p className="text-[12.5px] leading-snug font-semibold text-ink">{titulo}</p>
               {detalhe ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{detalhe}</p> : null}
               {acao ? (
                  <button
                     type="button"
                     onClick={() => {
                        acao.onClick();
                        toast.dismiss(id);
                     }}
                     className="mt-2 text-[11.5px] font-semibold text-brand-text transition-colors hover:text-ink"
                  >
                     {acao.rotulo} →
                  </button>
               ) : null}
            </div>
         </div>
      ),
      { duration: duracao ?? (acao ? 8000 : 4000) },
   );
}

/**
 * Erro de mutation: diz o que aconteceu e o que fazer. Em 409 (alguém alterou antes) avisa quem
 * alterou; quem chama recarrega o registro e não sobrescreve.
 */
export function avisarErro(error: unknown, titulo: string): void {
   const e = lerErroApi(error);
   if (e.status === 409) {
      notificar({
         tom: "warn",
         titulo: e.atualizadoPor ? `Este caso foi atualizado por ${e.atualizadoPor} agora` : "Este caso foi atualizado agora",
         detalhe: "Recarregamos a versão mais recente. Confira e faça de novo, se ainda fizer sentido.",
      });
      return;
   }
   notificar({ tom: "crit", titulo, detalhe: e.detalhes.length ? `${lista(e.detalhes)}.` : e.message });
}
