/**
 * Field (design system §10.12): o obrigatório é marcado UMA vez, ao lado do rótulo; a dica fica sob
 * o controle; o erro diz o que aconteceu. O `id` nasce aqui (`useId`) e é entregue ao controle.
 */
import { useId, type ReactNode } from "react";

import { cn } from "@/lib/utils";

interface FieldProps {
   label: ReactNode;
   required?: boolean;
   /** Nota curta à direita do rótulo (ex.: "opcional"). */
   hint?: ReactNode;
   help?: ReactNode;
   error?: ReactNode;
   className?: string;
   children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode;
}

export function Field({ label, required, hint, help, error, className, children }: FieldProps) {
   const id = useId();
   const descId = `${id}-desc`;
   return (
      <div className={cn("min-w-0", className)}>
         <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <label htmlFor={id} className="text-[12px] font-medium text-ink">
               {label}
               {required ? (
                  <span aria-hidden className="ml-1 text-crit">
                     *
                  </span>
               ) : null}
            </label>
            {hint ? <span className="text-[11px] text-ink-4">{hint}</span> : null}
         </div>
         {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": error || help ? descId : undefined })}
         {error ? (
            <p id={descId} className="mt-1.5 text-[11.5px] font-medium text-crit-ink">
               {error}
            </p>
         ) : help ? (
            <p id={descId} className="mt-1.5 text-[11.5px] leading-relaxed text-ink-4">
               {help}
            </p>
         ) : null}
      </div>
   );
}

/** Classe do controle nativo preenchido (select, input de data), igual ao `Input` ajustado. */
export const CONTROL =
   "w-full rounded-md bg-surface-2 px-3 text-[13px] text-ink transition-colors placeholder:text-ink-4 hover:bg-surface-3 focus:bg-surface-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 aria-invalid:ring-2 aria-invalid:ring-crit/60";
