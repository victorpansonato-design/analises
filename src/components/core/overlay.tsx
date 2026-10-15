/**
 * Modal e Drawer (design system §10.13). Uma implementação de overlay para todo diálogo se
 * comportar igual, sobre o Dialog do Radix (foco preso, Escape, restauração de foco, aria):
 *
 * - O app atrás é borrado e dessaturado (`.scrim`), não só escurecido.
 * - Escape fecha; clique no scrim fecha; o botão fecha.
 * - O foco entra em `[data-autofocus]` quando existe.
 * - A animação de saída de fato roda: o `AnimatePresence` mora dentro do componente (`forceMount`).
 * - A `border-l` do drawer é a única borda que não é divisor: a folha encosta na margem da janela.
 */
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { LucideIcon } from "lucide-react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";

import { drawerVariants, modalVariants, scrimVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";

const MODAL_WIDTH = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl", xl: "max-w-5xl" } as const;
const DRAWER_WIDTH = { md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-3xl", full: "" } as const;

function focarInicial(e: Event) {
   const alvo = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("[data-autofocus]");
   if (alvo) {
      e.preventDefault();
      alvo.focus();
   }
}

function BotaoFechar() {
   return (
      <DialogPrimitive.Close
         aria-label="Fechar"
         className="-mt-0.5 -mr-1 flex size-8 shrink-0 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
      >
         <X className="size-4" aria-hidden />
      </DialogPrimitive.Close>
   );
}

interface CabecalhoProps {
   title: ReactNode;
   description?: ReactNode;
   icon?: LucideIcon;
   tamanhoTitulo: "modal" | "drawer";
}

function Cabecalho({ title, description, icon: Icon, tamanhoTitulo }: CabecalhoProps) {
   return (
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline px-5 py-4">
         <div className="flex min-w-0 items-start gap-3">
            {Icon ? (
               <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2">
                  <Icon className="size-4" aria-hidden />
               </span>
            ) : null}
            <div className="min-w-0">
               <DialogPrimitive.Title
                  className={cn(
                     "font-semibold text-ink",
                     tamanhoTitulo === "drawer" ? "text-[19px] leading-tight tracking-[-0.02em]" : "text-[15px] leading-tight",
                  )}
               >
                  {title}
               </DialogPrimitive.Title>
               {description ? (
                  <DialogPrimitive.Description className="mt-1 text-[12px] leading-relaxed text-ink-3">
                     {description}
                  </DialogPrimitive.Description>
               ) : (
                  <DialogPrimitive.Description className="sr-only">{title}</DialogPrimitive.Description>
               )}
            </div>
         </div>
         <BotaoFechar />
      </header>
   );
}

interface OverlayBaseProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   title: ReactNode;
   description?: ReactNode;
   icon?: LucideIcon;
   footer?: ReactNode;
   children: ReactNode;
}

interface ModalProps extends OverlayBaseProps {
   size?: keyof typeof MODAL_WIDTH;
}

export function Modal({ open, onOpenChange, title, description, icon, footer, size = "md", children }: ModalProps) {
   return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
         <AnimatePresence>
            {open ? (
               <DialogPrimitive.Portal forceMount>
                  <DialogPrimitive.Overlay asChild forceMount>
                     <motion.div
                        className="scrim fixed inset-0 z-50"
                        variants={scrimVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                     />
                  </DialogPrimitive.Overlay>
                  <div className="pointer-events-none fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 py-[6vh] sm:p-6 sm:py-[8vh]">
                     <DialogPrimitive.Content asChild forceMount onOpenAutoFocus={focarInicial}>
                        <motion.div
                           variants={modalVariants}
                           initial="initial"
                           animate="animate"
                           exit="exit"
                           className={cn(
                              "pointer-events-auto relative flex max-h-[86vh] w-full flex-col overflow-hidden rounded-2xl bg-card shadow-overlay outline-none",
                              MODAL_WIDTH[size],
                           )}
                        >
                           <Cabecalho title={title} description={description} icon={icon} tamanhoTitulo="modal" />
                           <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
                           {footer ? (
                              <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
                                 {footer}
                              </footer>
                           ) : null}
                        </motion.div>
                     </DialogPrimitive.Content>
                  </div>
               </DialogPrimitive.Portal>
            ) : null}
         </AnimatePresence>
      </DialogPrimitive.Root>
   );
}

interface DrawerProps extends OverlayBaseProps {
   width?: keyof typeof DRAWER_WIDTH;
}

export function Drawer({ open, onOpenChange, title, description, icon, footer, width = "md", children }: DrawerProps) {
   return (
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
         <AnimatePresence>
            {open ? (
               <DialogPrimitive.Portal forceMount>
                  <DialogPrimitive.Overlay asChild forceMount>
                     <motion.div
                        className="scrim fixed inset-0 z-50"
                        variants={scrimVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                     />
                  </DialogPrimitive.Overlay>
                  <DialogPrimitive.Content asChild forceMount onOpenAutoFocus={focarInicial}>
                     <motion.div
                        variants={drawerVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        className={cn(
                           "fixed inset-y-0 right-0 z-50 flex h-full w-full flex-col overflow-hidden border-l border-hairline bg-card shadow-overlay outline-none",
                           DRAWER_WIDTH[width],
                        )}
                     >
                        <Cabecalho title={title} description={description} icon={icon} tamanhoTitulo="drawer" />
                        <div className="scroll-slim min-h-0 flex-1 overflow-y-auto">{children}</div>
                        {footer ? (
                           <footer className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-hairline bg-surface-2/60 px-5 py-3.5">
                              {footer}
                           </footer>
                        ) : null}
                     </motion.div>
                  </DialogPrimitive.Content>
               </DialogPrimitive.Portal>
            ) : null}
         </AnimatePresence>
      </DialogPrimitive.Root>
   );
}
