import { Check, X, ArrowUpRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { TableCell } from "@/components/ui/table";
import { fullDate } from "@/lib/format";
import { ROTULO_MODALIDADE, ROTULO_TIPO, ROTULO_TURNO, terminaNaAnalise, type CasoResumo } from "@/features/casos/types/caso.schema";
import { StatusEtapa } from "@/features/casos/components/status-etapa";

export function CelulasProtocolo({ caso, onAbrir }: { caso: CasoResumo; onAbrir: (id: string) => void }) {
   const [params] = useSearchParams();
   const destino = new URLSearchParams(params);
   destino.set("caso", caso.id);
   for (const k of ["aba", "filtro", "item", "acao", "hist", "painel", "novo", "conferir"]) destino.delete(k);
   return (
      <>
         <TableCell className="w-[96px] pl-5">
            <Link
               to={`?${destino}`}
               aria-label={`Abrir perfil de ${caso.candidato.nome}, protocolo ${caso.protocolo}`}
               className="perfil-link inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium transition-colors"
               onClick={e => {
                  if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                     e.preventDefault();
                     onAbrir(caso.id);
                  }
               }}
            >
               Perfil
               <ArrowUpRight aria-hidden className="size-3.5" />
            </Link>
         </TableCell>
         <TableCell className="w-[60px] text-center">
            <span
               role="img"
               aria-label={caso.matriculado ? "Matriculado" : "Não matriculado"}
               className={caso.matriculado ? "mat-sim" : "mat-nao"}
            >
               {caso.matriculado ? (
                  <Check aria-hidden className="mx-auto size-5" strokeWidth={2.5} />
               ) : (
                  <X aria-hidden className="mx-auto size-5" />
               )}
            </span>
         </TableCell>
         <TableCell className="w-[146px] font-mono text-[11px] text-ink-2">{caso.protocolo}</TableCell>
         <TableCell className="w-[112px] font-mono text-[12px] text-ink-2">
            {caso.candidato.ra ?? <span className="font-sans text-ink-3">Não informado</span>}
         </TableCell>
         <TableCell className="min-w-[210px] whitespace-normal!">
            <span className="block text-[13px] leading-relaxed font-medium text-ink">{caso.candidato.nome}</span>
         </TableCell>
         <TableCell className="min-w-[195px] whitespace-normal!">
            <span className="block text-[12.5px] font-medium text-ink-2">{caso.destino.cursoNome}</span>
            <span className="mt-1 block text-[11.5px] text-ink-3">
               {ROTULO_MODALIDADE[caso.destino.modalidade]}
               {caso.destino.modalidade === "PRESENCIAL" ? ` · ${ROTULO_TURNO[caso.destino.turno]}` : ""}
            </span>
         </TableCell>
         <TableCell className="min-w-[175px] whitespace-normal!">
            <span className="mb-1 block text-[12px] text-ink-2">{ROTULO_TIPO[caso.tipo]}</span>
            <StatusEtapa etapa={caso.etapa} />
         </TableCell>
         <TableCell className="w-[116px] font-mono text-[11.5px] text-ink-2">
            <time dateTime={caso.criadoEm}>{fullDate(caso.criadoEm)}</time>
         </TableCell>
         <TableCell className="w-[135px] pr-5 font-mono text-[11.5px] text-ink-2">
            {terminaNaAnalise(caso.tipo) ? (
               <span className="font-sans text-[11.5px] text-ink-4">Não se aplica</span>
            ) : caso.liberadoMatriculaEm ? (
               <time dateTime={caso.liberadoMatriculaEm}>{fullDate(caso.liberadoMatriculaEm)}</time>
            ) : (
               <span className="font-sans text-[11.5px] text-ink-3">Ainda não liberada</span>
            )}
         </TableCell>
      </>
   );
}
