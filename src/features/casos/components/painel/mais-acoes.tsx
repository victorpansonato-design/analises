/**
 * "Mais ações" (docs/05 §3.3): o resto de `acoesDisponiveis`, agrupado em Fluxo, Caso, Exportar e
 * Atenção. Ação desabilitada continua no menu com o motivo escrito embaixo (nunca some sem
 * explicação). Encerrar e cancelar abrem modal com motivo obrigatório.
 */
import { Link2, MoreHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
   DropdownMenu,
   DropdownMenuContent,
   DropdownMenuGroup,
   DropdownMenuItem,
   DropdownMenuLabel,
   DropdownMenuSeparator,
   DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";

import { ACOES_DESTRUTIVAS, ROTULO_ACAO, acaoDoCaso, type NomeAcao } from "@/features/casos/domain/acoes";
import { registrarDesabilitada } from "@/features/casos/components/painel/use-acoes-do-caso";
import type { CasoDetalhe } from "@/features/casos/types/caso.schema";

const GRUPOS: { titulo: string; acoes: readonly NomeAcao[] }[] = [
   {
      titulo: "Fluxo",
      acoes: ["ADIAR", "RETOMAR", "SOLICITAR_REANALISE", "DOCUMENTOS_COMPLETOS", "ENCERRAR_PERDIDO", "CANCELAR", "REABRIR"],
   },
   { titulo: "Caso", acoes: ["ASSUMIR", "ATRIBUIR", "ALTERAR_DESTINO", "NOVO_PROTOCOLO"] },
   { titulo: "Exportar", acoes: ["EXPORTAR"] },
   { titulo: "Atenção", acoes: ["MARCAR_OUVIDORIA", "ESCALAR", "REGISTRAR_PENDENCIA"] },
];

function rotulo(caso: CasoDetalhe, acao: NomeAcao): string {
   if (acao === "MARCAR_OUVIDORIA" && caso.flags.ouvidoria) return "Retirar ouvidoria";
   if (acao === "ESCALAR" && caso.flags.escalado) return "Retirar escalonamento";
   if (acao === "REGISTRAR_PENDENCIA" && caso.pendencia) return "Resolver pendência externa";
   return ROTULO_ACAO[acao];
}

interface MaisAcoesProps {
   caso: CasoDetalhe;
   /** Ações já mostradas no card (não repetem no menu). */
   excluir: readonly NomeAcao[];
   onExecutar: (acao: NomeAcao) => void;
}

export function MaisAcoes({ caso, excluir, onExecutar }: MaisAcoesProps) {
   const grupos = GRUPOS.map(g => ({
      ...g,
      itens: g.acoes
         .filter(a => !excluir.includes(a))
         .flatMap(a => {
            const disp = acaoDoCaso(caso, a);
            return disp ? [{ acao: a, disp }] : [];
         }),
   })).filter(g => g.itens.length > 0);

   async function copiarLink() {
      try {
         await navigator.clipboard.writeText(window.location.href);
         notificar({ titulo: "Link do caso copiado", detalhe: "Quem abrir cai exatamente aqui." });
      } catch {
         notificar({ tom: "warn", titulo: "Não foi possível copiar", detalhe: "Copie o endereço da barra do navegador." });
      }
   }

   return (
      <DropdownMenu>
         <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" icon={<MoreHorizontal aria-hidden />}>
               Mais ações
            </Button>
         </DropdownMenuTrigger>
         <DropdownMenuContent align="end" className="w-72">
            {grupos.map((g, i) => (
               <DropdownMenuGroup key={g.titulo}>
                  {i > 0 ? <DropdownMenuSeparator /> : null}
                  <DropdownMenuLabel className="text-[11px] font-semibold text-ink-4">{g.titulo}</DropdownMenuLabel>
                  {g.itens.map(({ acao, disp }) => (
                     <DropdownMenuItem
                        key={acao}
                        aria-disabled={!disp.habilitada}
                        onSelect={e => {
                           if (!disp.habilitada) {
                              e.preventDefault();
                              registrarDesabilitada(acao, disp.motivos[0]);
                              return;
                           }
                           onExecutar(acao);
                        }}
                        className={cn("flex flex-col items-start gap-0.5 text-[13px]", !disp.habilitada && "cursor-not-allowed")}
                     >
                        <span
                           className={cn(!disp.habilitada ? "text-ink-4" : ACOES_DESTRUTIVAS.includes(acao) ? "text-crit-ink" : "text-ink")}
                        >
                           {rotulo(caso, acao)}
                        </span>
                        {!disp.habilitada && disp.motivos[0] ? (
                           <span className="text-[11.5px] leading-snug text-ink-4">{disp.motivos[0]}</span>
                        ) : null}
                     </DropdownMenuItem>
                  ))}
               </DropdownMenuGroup>
            ))}
            {grupos.length > 0 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem onSelect={() => void copiarLink()} className="flex items-center gap-2 text-[13px]">
               <Link2 aria-hidden className="size-3.5 text-ink-3" />
               Copiar link do caso
            </DropdownMenuItem>
         </DropdownMenuContent>
      </DropdownMenu>
   );
}
