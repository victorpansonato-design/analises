/**
 * Busca e comandos (⌘K / Ctrl+K; docs/05 §5). Busca por RA, CPF (só dígitos), nome sem acento ou
 * protocolo em todas as etapas; o resultado mostra etapa e responsável. Comandos levam a tela para
 * o estado certo sem procurar botão.
 */
import { Command as CommandPrimitive } from "cmdk";
import { AlertTriangle, BarChart3, FilePlus2, Hand, ListChecks, Moon, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Kbd } from "@/components/core/kbd";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { CommandEmpty, CommandGroup, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { notificar } from "@/lib/notify";
import { registrarUi } from "@/services/telemetria";
import { useThemeStore } from "@/stores/theme.store";

import { useMe } from "@/features/sessao";

import { usePegarProximo } from "@/features/casos/api/casos.mutations";
import { useBuscaCasos } from "@/features/casos/api/casos.queries";
import { ETAPAS_PEGAR_PROXIMO } from "@/features/casos/domain/acoes";
import { MATRIZ, temCapacidade } from "@/features/casos/domain/permissoes";
import { StatusEtapa } from "@/features/casos/components/status-etapa";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";

interface BuscaGlobalProps {
   aberta: boolean;
   onAbertaChange: (aberta: boolean) => void;
}

export function BuscaGlobal({ aberta, onAbertaChange }: BuscaGlobalProps) {
   const [termo, setTermo] = useState("");
   const { data, isFetching } = useBuscaCasos(termo);
   const { data: me } = useMe();
   const url = useCasosUrlState();
   const pegarProximo = usePegarProximo();
   const toggleTheme = useThemeStore(s => s.toggleTheme);
   const navegar = useNavigate();

   const papeis = me?.papeis ?? [];
   const podeProtocolo = papeis.some(p => MATRIZ.NOVO_PROTOCOLO.includes(p));
   const podeGestao = temCapacidade(papeis, "VER_GESTAO");
   const podePegar = papeis.some(p => (ETAPAS_PEGAR_PROXIMO[p]?.length ?? 0) > 0);

   function fechar(depois: () => void) {
      onAbertaChange(false);
      setTermo("");
      depois();
   }

   const resultados = termo.trim().length >= 2 ? (data?.itens ?? []) : [];

   return (
      <Dialog open={aberta} onOpenChange={onAbertaChange}>
         <DialogContent className="top-[12vh] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 sm:max-w-xl" showCloseButton={false}>
            <DialogTitle className="sr-only">Buscar e comandos</DialogTitle>
            <DialogDescription className="sr-only">Busque um caso por nome, RA, CPF ou protocolo, ou escolha um comando.</DialogDescription>
            <CommandPrimitive shouldFilter={false} loop className="flex flex-col">
               <div className="flex h-12 items-center gap-2 border-b border-hairline px-4">
                  <Search aria-hidden className="size-4 shrink-0 text-ink-4" />
                  <CommandPrimitive.Input
                     value={termo}
                     onValueChange={setTermo}
                     placeholder="Buscar RA, CPF, nome ou protocolo…"
                     className="h-full flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-ink-4"
                  />
                  <Kbd>Esc</Kbd>
               </div>
               <CommandList className="scroll-slim max-h-[60vh] p-2">
                  {termo.trim().length >= 2 ? (
                     <>
                        <CommandEmpty className="px-3 py-6 text-center text-[12.5px] text-ink-3">
                           {isFetching ? "Buscando…" : "Nenhum caso encontrado. Confira o número ou tente parte do nome."}
                        </CommandEmpty>
                        {resultados.length > 0 ? (
                           <CommandGroup
                              heading="Casos"
                              className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-4"
                           >
                              {resultados.map(c => (
                                 <CommandItem
                                    key={c.id}
                                    value={c.id}
                                    onSelect={() =>
                                       fechar(() => {
                                          registrarUi("ui.caso_aberto", { origem: "busca" });
                                          url.abrirCaso(c.id);
                                       })
                                    }
                                    className="flex items-center gap-3 py-2"
                                 >
                                    <span className="min-w-0 flex-1">
                                       <span className="block truncate text-[13px] font-medium text-ink">{c.candidato.nome}</span>
                                       <span className="block truncate font-mono text-[11px] text-ink-4">
                                          {c.candidato.ra ? `RA ${c.candidato.ra} · ` : ""}
                                          {c.protocolo} · {c.destino.cursoNome}
                                       </span>
                                    </span>
                                    <span className="flex shrink-0 flex-col items-end gap-0.5">
                                       <StatusEtapa etapa={c.etapa} />
                                       <span className="text-[11px] text-ink-4">{c.responsavel?.nome ?? ""}</span>
                                    </span>
                                 </CommandItem>
                              ))}
                           </CommandGroup>
                        ) : null}
                     </>
                  ) : (
                     <p className="px-3 py-2 text-[12px] text-ink-4">
                        Digite ao menos 2 caracteres para buscar. CPF e RA podem ser só números.
                     </p>
                  )}
                  {termo.trim().length >= 2 && (data?.total ?? 0) > resultados.length ? (
                     <CommandGroup>
                        <CommandItem value="todos-resultados" onSelect={() => fechar(() => url.buscarAluno(termo))}>
                           <Search aria-hidden /> Ver todos os protocolos encontrados ({data?.total})
                        </CommandItem>
                     </CommandGroup>
                  ) : null}
                  <CommandSeparator className="my-2" />
                  <CommandGroup
                     heading="Comandos"
                     className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:text-ink-4"
                  >
                     {podeProtocolo ? (
                        <CommandItem value="novo-protocolo" onSelect={() => fechar(() => url.abrirNovoProtocolo())}>
                           <FilePlus2 aria-hidden />
                           Novo protocolo
                           <Kbd className="ml-auto">P</Kbd>
                        </CommandItem>
                     ) : null}
                     {podePegar ? (
                        <CommandItem
                           value="pegar-proximo"
                           onSelect={() =>
                              fechar(() =>
                                 pegarProximo.mutate(undefined, {
                                    onSuccess: caso => {
                                       if (caso) url.abrirCaso(caso.id);
                                       else notificar({ tom: "info", titulo: "Nada sem responsável na sua etapa agora" });
                                    },
                                 }),
                              )
                           }
                        >
                           <Hand aria-hidden />
                           Pegar próximo
                           <Kbd className="ml-auto">N</Kbd>
                        </CommandItem>
                     ) : null}
                     <CommandItem value="todas-analises" onSelect={() => fechar(url.verTodas)}>
                        <ListChecks aria-hidden />
                        Ver todas as análises
                     </CommandItem>
                     <CommandItem
                        value="atrasados"
                        onSelect={() => fechar(() => (url.setFiltro("atrasados", true), url.setVisao("TODOS")))}
                     >
                        <AlertTriangle aria-hidden />
                        Mostrar só atrasados
                     </CommandItem>
                     {podeGestao ? (
                        <CommandItem value="indicadores" onSelect={() => fechar(() => navegar("/gestao"))}>
                           <BarChart3 aria-hidden />
                           Abrir indicadores da gestão
                        </CommandItem>
                     ) : null}
                     <CommandItem value="tema" onSelect={() => fechar(toggleTheme)}>
                        <Moon aria-hidden />
                        Alternar tema claro e escuro
                     </CommandItem>
                  </CommandGroup>
               </CommandList>
            </CommandPrimitive>
         </DialogContent>
      </Dialog>
   );
}
