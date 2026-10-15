import { AnimatePresence, motion } from "motion/react";
import { useCallback } from "react";
import { useLocation } from "react-router-dom";

import { Check, ChevronUp, KeyRound, LogOut } from "lucide-react";

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
   Sidebar,
   SidebarContent,
   SidebarFooter,
   SidebarGroup,
   SidebarGroupContent,
   SidebarMenu,
   SidebarRail,
   useSidebar,
} from "@/components/ui/sidebar";
import { env } from "@/config/env";
import { NAVEGACAO } from "@/config/navigation";
import { temCapacidade } from "@/features/casos";
import { ACESSOS, PAPEL_DO_ACESSO, ROTULO_ACESSO, acessoDoPapel, useMe, usePapelSimuladoStore } from "@/features/sessao";
import { useAuth } from "@/hooks/use-auth";
import { ITEM_MOTION_TRANSITION, isPathActive } from "@/layout/sidebar/sidebar.constants";
import { SidebarNavigationItem, SidebarSectionLabel } from "@/layout/sidebar/sidebar-navigation-item";

import { SystemLogo } from "./system-logo";

interface UserCardProps {
   collapsed: boolean;
   email: string;
   name: string;
   onLogout: () => void;
   sector?: string | null;
}

function getInitials(name: string): string {
   return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? "")
      .join("");
}

export function AppSidebar() {
   const { pathname } = useLocation();
   const { isMobile, setOpenMobile, state } = useSidebar();
   const { user, logout } = useAuth();
   const collapsed = !isMobile && state === "collapsed";
   const { data: me } = useMe();
   const itens = NAVEGACAO.filter(
      item => (!item.capacidade || temCapacidade(me?.papeis ?? [], item.capacidade)) && (!item.acesso || me?.acesso === item.acesso),
   );

   const handleNavigate = useCallback(() => {
      if (isMobile) setOpenMobile(false);
   }, [isMobile, setOpenMobile]);

   return (
      <Sidebar collapsible="icon" variant="inset" className="print:hidden" role="complementary" aria-label="Navegação e preferências">
         <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex h-full min-h-0 flex-col"
         >
            <SystemLogo />

            <SidebarContent className="gap-4 px-2 py-4 group-data-[collapsible=icon]:px-1">
               <nav aria-label="Navegação principal" className="flex flex-col gap-4">
                  <SidebarGroup className="px-2 py-1 group-data-[collapsible=icon]:px-0">
                     <SidebarSectionLabel collapsed={collapsed}>Captação</SidebarSectionLabel>
                     <SidebarGroupContent>
                        <SidebarMenu>
                           {itens.map(item => (
                              <SidebarNavigationItem
                                 key={item.caminho}
                                 active={isPathActive(pathname, item.caminho)}
                                 collapsed={collapsed}
                                 icon={item.icone}
                                 isMobile={isMobile}
                                 label={item.rotulo}
                                 onNavigate={handleNavigate}
                                 path={item.caminho}
                              />
                           ))}
                        </SidebarMenu>
                     </SidebarGroupContent>
                  </SidebarGroup>
               </nav>
            </SidebarContent>

            <SidebarFooter className="gap-2 border-t border-sidebar-border p-3 group-data-[collapsible=icon]:px-1.5">
               {user ? (
                  <UserCard collapsed={collapsed} email={user.email} name={user.nome} onLogout={() => void logout()} sector={user.setor} />
               ) : null}
               {env.useMocks ? <AcessoMenu collapsed={collapsed} /> : null}
            </SidebarFooter>
         </motion.div>

         <SidebarRail />
      </Sidebar>
   );
}

function UserCard({ collapsed, email, name, onLogout, sector }: UserCardProps) {
   return (
      <motion.div
         layout
         transition={ITEM_MOTION_TRANSITION}
         className="flex items-center gap-3 rounded-md bg-sidebar-accent/40 px-2.5 py-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      >
         <motion.div
            layout="position"
            transition={ITEM_MOTION_TRANSITION}
            className="grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
            aria-hidden
         >
            <span className="text-xs font-semibold">{getInitials(name)}</span>
         </motion.div>

         <AnimatePresence initial={false} mode="popLayout">
            {!collapsed && (
               <motion.div
                  key="user-details"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={ITEM_MOTION_TRANSITION}
                  className="flex min-w-0 flex-1 items-center gap-2"
               >
                  <div className="flex min-w-0 flex-1 flex-col leading-tight">
                     <span className="truncate text-sm font-medium text-sidebar-foreground">{name}</span>
                     <span className="truncate text-[11px] text-muted-foreground">{sector ?? email}</span>
                  </div>
                  <button
                     type="button"
                     aria-label="Sair"
                     onClick={onLogout}
                     className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive-soft hover:text-destructive disabled:pointer-events-none disabled:opacity-50"
                  >
                     <LogOut className="size-3.5" />
                  </button>
               </motion.div>
            )}
         </AnimatePresence>
      </motion.div>
   );
}

/**
 * Acesso da simulação (só com dados simulados ligados): Todos, Gestão comercial ou Coordenadores.
 * A sessão real vem do SSO; o tema mora só no canto superior direito.
 */
function AcessoMenu({ collapsed }: { collapsed: boolean }) {
   const papel = usePapelSimuladoStore(store => store.papel);
   const setPapel = usePapelSimuladoStore(store => store.setPapel);
   const atual = acessoDoPapel(papel);

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <button
               type="button"
               className="group flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
               title={`Acesso: ${ROTULO_ACESSO[atual]}`}
            >
               <motion.span layout="position" transition={ITEM_MOTION_TRANSITION} className="grid size-4 shrink-0 place-items-center">
                  <KeyRound className="size-3.5" />
               </motion.span>

               <AnimatePresence initial={false} mode="popLayout">
                  {!collapsed && (
                     <motion.span
                        key="acesso-label"
                        initial={{ opacity: 0, x: -5 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -5 }}
                        transition={ITEM_MOTION_TRANSITION}
                        className="flex min-w-0 flex-1 items-center gap-2"
                     >
                        <span className="text-left">Acesso</span>
                        <span className="ml-auto truncate text-[11px] text-ink-4">{ROTULO_ACESSO[atual]}</span>
                        <ChevronUp className="size-3 text-muted-foreground" />
                     </motion.span>
                  )}
               </AnimatePresence>
            </button>
         </DropdownMenuTrigger>
         <DropdownMenuContent side="top" align="start" className="w-[220px]">
            <DropdownMenuLabel className="text-[12px] font-semibold text-ink-3">Entrar como (simulação)</DropdownMenuLabel>
            {ACESSOS.map(acesso => (
               <DropdownMenuItem
                  key={acesso}
                  onSelect={() => {
                     if (acesso === atual) return;
                     setPapel(PAPEL_DO_ACESSO[acesso]);
                     window.location.reload();
                  }}
                  className="flex items-center gap-2"
               >
                  <span className="flex-1">{ROTULO_ACESSO[acesso]}</span>
                  {acesso === atual ? <Check className="size-3.5 text-brand-text" /> : null}
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
