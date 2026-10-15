/** Shell institucional com busca rápida, ciclo, notificações e tema. */
import { Check, ChevronDown, FilePlus2, Search, Moon, Sun } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Link, Outlet, useLocation, useSearchParams } from "react-router-dom";

import logoAnchieta from "@/assets/images/grupo-anchieta.png";
import { Kbd } from "@/components/core/kbd";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useAtalho } from "@/hooks/use-atalho";
import { useMediaQuery } from "@/hooks/use-media-query";
import { pageVariants, press } from "@/lib/motion";
import { trocarComRevelacao } from "@/lib/tema";
import { cn } from "@/lib/utils";
import { NAVEGACAO } from "@/config/navigation";
import { AppSidebar } from "@/layout/app-sidebar";
import { isPathActive } from "@/layout/sidebar/sidebar.constants";

import { BuscaGlobal, CICLOS_ATIVOS } from "@/features/casos";
import { SinoNotificacoes } from "@/features/notificacoes";
import { useThemeStore } from "@/stores/theme.store";

function SeletorCiclo() {
   const [params, setParams] = useSearchParams();
   const ciclo = params.get("ciclo");
   const escolher = (valor: string | null) =>
      setParams(
         prev => {
            const next = new URLSearchParams(prev);
            if (valor) next.set("ciclo", valor);
            else next.delete("ciclo");
            return next;
         },
         { replace: true },
      );
   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="xs" iconRight={<ChevronDown aria-hidden />} aria-label={`Ciclo de ingresso: ${ciclo ?? "todos"}`}>
               <span className="hidden text-ink-3 sm:inline">Ciclo</span>
               <span className="font-mono">{ciclo ?? "todos"}</span>
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-[12px] font-semibold text-ink-3">Ciclo de ingresso</DropdownMenuLabel>
            {[null, ...CICLOS_ATIVOS].map(c => (
               <DropdownMenuItem key={c ?? "todos"} onSelect={() => escolher(c)} className="flex items-center gap-2 text-[13px]">
                  <span className="flex-1">{c ?? "Todos os ciclos"}</span>
                  {c === ciclo ? <Check aria-hidden className="size-3.5 text-brand-text" /> : null}
               </DropdownMenuItem>
            ))}
         </DropdownMenuContent>
      </DropdownMenu>
   );
}

export default function MainLayout() {
   const { pathname } = useLocation();
   const [params, setParams] = useSearchParams();
   const emAnalises = pathname === "/analises";
   const tituloDaRota = NAVEGACAO.find(item => isPathActive(pathname, item.caminho))?.rotulo ?? "";
   const listagem = !emAnalises || !params.get("caso");
   const [buscaAberta, setBuscaAberta] = useState(false);
   const theme = useThemeStore(s => s.theme);
   const prefereEscuro = useMediaQuery("(prefers-color-scheme: dark)");
   const escuro = theme === "dark" || (theme === "system" && prefereEscuro);
   const toggleTheme = useThemeStore(s => s.toggleTheme);
   const podeProtocolo = emAnalises;

   useAtalho("k", () => setBuscaAberta(true), { comModificador: true, enabled: emAnalises });

   const abrirProtocolo = () =>
      setParams(prev => {
         const next = new URLSearchParams(prev);
         next.set("novo", "1");
         next.delete("de");
         return next;
      });
   useAtalho("p", abrirProtocolo, { enabled: podeProtocolo });

   const abrirCaso = (casoId: string) =>
      setParams(prev => {
         const next = new URLSearchParams(prev);
         next.set("caso", casoId);
         for (const k of ["aba", "filtro", "item", "acao", "hist", "painel"]) next.delete(k);
         return next;
      });

   return (
      <SidebarProvider defaultOpen={false} className={listagem ? "min-h-svh" : "h-svh overflow-hidden"}>
         <a
            href="#conteudo"
            className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-ink"
         >
            Ir para o conteúdo
         </a>
         <AppSidebar />

         <SidebarInset
            className={cn(
               "bg-workspace text-ink md:peer-data-[variant=inset]:m-0 md:peer-data-[variant=inset]:rounded-none md:peer-data-[variant=inset]:shadow-none",
               listagem ? "min-h-svh" : "overflow-hidden",
            )}
         >
            <header className="academic-header flex h-16 shrink-0 items-center gap-2 px-4 sm:gap-4 sm:px-7 print:hidden">
               <SidebarTrigger className="-ml-1 cursor-pointer text-ink-3 hover:text-ink" />
               <div className="flex shrink-0 items-center gap-3">
                  <Link to="/analises" aria-label="Grupo Anchieta — ir para Análises" className="shrink-0 rounded-sm">
                     <img src={logoAnchieta} alt="Grupo Anchieta" width={385} height={137} className="h-8 w-auto sm:h-11" />
                  </Link>
                  <span className="hidden border-l border-hairline pl-3 text-[12px] text-ink-3 lg:inline">Central acadêmica</span>
               </div>
               {emAnalises ? (
                  <motion.button
                     type="button"
                     whileTap={press}
                     onClick={() => setBuscaAberta(true)}
                     aria-label="Busca rápida por aluno ou protocolo"
                     className="ml-1 flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface-2 px-3.5 text-left text-[12.5px] text-ink-4 transition-colors duration-150 hover:text-ink-3 md:max-w-md"
                  >
                     <Search aria-hidden className="size-3.5 shrink-0" />
                     <span className="hidden min-w-0 flex-1 truncate sm:inline">Busca rápida por aluno ou protocolo…</span>
                     <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
                  </motion.button>
               ) : (
                  <span className="ml-2 text-[13px] font-medium text-ink-2">{tituloDaRota}</span>
               )}
               <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
                  {emAnalises ? <SeletorCiclo /> : null}
                  {emAnalises && params.get("caso") ? (
                     <Button
                        size="sm"
                        icon={<FilePlus2 aria-hidden />}
                        onClick={abrirProtocolo}
                        aria-label="Novo protocolo"
                        title="Novo protocolo (P)"
                     >
                        <span className="hidden lg:inline">Novo protocolo</span>
                     </Button>
                  ) : null}
                  {emAnalises ? <SinoNotificacoes onAbrirCaso={abrirCaso} /> : null}
                  <Button
                     variant="ghost"
                     size="icon"
                     aria-label={escuro ? "Ativar tema claro" : "Ativar tema escuro"}
                     onClick={e => {
                        // Revelação circular a partir do próprio botão (DS §10.21): o único lugar de trocar o tema.
                        const caixa = e.currentTarget.getBoundingClientRect();
                        trocarComRevelacao(toggleTheme, { x: caixa.left + caixa.width / 2, y: caixa.top + caixa.height / 2 });
                     }}
                  >
                     {escuro ? <Sun aria-hidden /> : <Moon aria-hidden />}
                  </Button>
               </div>
            </header>

            <div className={cn("px-3 pt-4 pb-3 sm:px-7 sm:pt-6 sm:pb-5", !listagem && "min-h-0 flex-1 overflow-hidden")}>
               <motion.div
                  key={pathname}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  className={listagem ? undefined : "h-full"}
               >
                  <Outlet />
               </motion.div>
            </div>
            {emAnalises ? <BuscaGlobal aberta={buscaAberta} onAbertaChange={setBuscaAberta} /> : null}
         </SidebarInset>
      </SidebarProvider>
   );
}
