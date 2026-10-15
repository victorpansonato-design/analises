/**
 * Switch dentro de uma linha explicativa (design system §10.12): o rótulo diz o que liga e a
 * descrição diz a consequência. O thumb desliza com `spring`.
 */
import { motion } from "motion/react";
import { useId, type ReactNode } from "react";

import { spring } from "@/lib/motion";
import { cn } from "@/lib/utils";

interface SwitchRowProps {
   label: ReactNode;
   description?: ReactNode;
   checked: boolean;
   onCheckedChange: (checked: boolean) => void;
   disabled?: boolean;
   className?: string;
}

export function SwitchRow({ label, description, checked, onCheckedChange, disabled, className }: SwitchRowProps) {
   const id = useId();
   return (
      <div className={cn("flex items-start justify-between gap-4 rounded-lg bg-surface-2 p-3.5", className)}>
         <div className="min-w-0">
            <label htmlFor={id} className="block text-[13px] font-medium text-ink">
               {label}
            </label>
            {description ? <p className="mt-0.5 text-[11.5px] leading-relaxed text-ink-3">{description}</p> : null}
         </div>
         <button
            id={id}
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => onCheckedChange(!checked)}
            className={cn(
               "relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50",
               checked ? "bg-brand" : "bg-hairline-strong",
            )}
         >
            <motion.span
               layout
               transition={spring}
               className="absolute top-0.5 size-4 rounded-full bg-white shadow-sm"
               style={{ left: checked ? 18 : 2 }}
            />
         </button>
      </div>
   );
}
