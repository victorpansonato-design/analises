/**
 * Button (design system §10.1). Botões são PÍLULAS; superfícies são retângulos de 12 px. Duas
 * silhuetas para o app inteiro: a forma sozinha diz se a coisa é um lugar ou uma ação, então o
 * botão não precisa de contorno.
 *
 * - `primary`: A ação mais importante da tela. UMA por tela.
 * - `secondary` (padrão): alternativa real à primária. Preenchida, nunca contornada.
 * - `ghost`: terciária; vive em linha densa e toolbar. Hover neutro (nunca amarelo, docs/14 ADR-002).
 * - `danger`: destrutivo ou irreversível.
 *
 * Geometria e padding são listas separadas: um botão quadrado nunca recebe padding horizontal.
 * Feedback de toque via `whileTap={press}`; transição só de cor.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import * as React from "react";

import { press } from "@/lib/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
   "inline-flex shrink-0 items-center justify-center rounded-full font-medium whitespace-nowrap select-none transition-colors duration-150 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
   {
      variants: {
         variant: {
            primary: "bg-brand text-on-brand hover:bg-brand-hover",
            secondary: "bg-surface-2 text-ink hover:bg-surface-3",
            ghost: "text-ink-2 hover:bg-surface-2 hover:text-ink",
            danger: "bg-crit text-white hover:brightness-110",
            link: "h-auto! px-0! text-brand-text underline-offset-4 hover:underline",
            // Aliases do shadcn usados pelos componentes vendidos do template.
            default: "bg-brand text-on-brand hover:bg-brand-hover",
            outline: "bg-surface-2 text-ink hover:bg-surface-3",
            destructive: "bg-crit text-white hover:brightness-110",
         },
         size: {
            xs: "h-7 gap-1.5 text-[12px] [&_svg]:size-3.5",
            sm: "h-8 gap-1.5 text-[13px] [&_svg]:size-3.5",
            md: "h-9.5 gap-2 text-[13px] [&_svg]:size-4",
            default: "h-9.5 gap-2 text-[13px] [&_svg]:size-4",
            icon: "size-8 [&_svg]:size-4",
         },
         square: { true: "", false: "" },
         full: { true: "w-full", false: "" },
      },
      compoundVariants: [
         { square: false, size: "xs", class: "px-3" },
         { square: false, size: "sm", class: "px-3.5" },
         { square: false, size: "md", class: "px-4.5" },
         { square: false, size: "default", class: "px-4.5" },
         { square: true, size: "xs", class: "w-7" },
         { square: true, size: "sm", class: "w-8" },
         { square: true, size: "md", class: "w-9.5" },
         { square: true, size: "default", class: "w-9.5" },
      ],
      defaultVariants: { variant: "secondary", size: "sm", square: false, full: false },
   },
);

/** Handlers nativos que colidem com os do Motion: omitidos do tipo em vez de silenciados. */
type NativeButtonProps = Omit<
   React.ButtonHTMLAttributes<HTMLButtonElement>,
   "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

export interface ButtonProps extends NativeButtonProps, VariantProps<typeof buttonVariants> {
   /** Ícone antes do rótulo. */
   icon?: React.ReactNode;
   /** Ícone depois do rótulo. */
   iconRight?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
   ({ className, variant, size, square, full, icon, iconRight, children, disabled, type = "button", ...props }, ref) => {
      const quadrado = square ?? size === "icon";
      return (
         <motion.button
            ref={ref}
            type={type}
            disabled={disabled}
            whileTap={disabled ? undefined : press}
            className={cn(buttonVariants({ variant, size, square: quadrado, full }), className)}
            {...props}
         >
            {icon}
            {children}
            {iconRight}
         </motion.button>
      );
   },
);
Button.displayName = "Button";

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
