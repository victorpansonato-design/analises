/** Identificação do protocolo em tela inteira, com retorno e acesso às demais análises do aluno. */
import { ArrowLeft, Files, Check, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { fullDate } from "@/lib/format";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import { ROTULO_MODALIDADE, ROTULO_TIPO_COMPLETO, ROTULO_TURNO, type CasoDetalhe } from "@/features/casos/types/caso.schema";

export function FaixaIdentidade({ caso, onVoltar }: { caso: CasoDetalhe; onVoltar?: () => void }) {
   const { buscarAluno } = useCasosUrlState();
   const [params] = useSearchParams();
   const dosPareceres = params.get("voltar") === "pareceres";
   return (
      <header className="caso-identidade border-b border-hairline px-5 py-5 sm:px-8 print:hidden">
         <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <Button variant="ghost" size="xs" icon={<ArrowLeft aria-hidden />} onClick={onVoltar}>
               {dosPareceres ? "Voltar aos pareceres" : "Voltar às análises"}
            </Button>
            <Button size="sm" icon={<Files aria-hidden />} onClick={() => buscarAluno(caso.candidato.ra ?? caso.candidato.nome)}>
               Análises deste aluno
            </Button>
         </div>
         <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
               <h1 className="text-[25px] leading-tight font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
                  {caso.candidato.nome}
               </h1>
               <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-3">
                  <span className="font-mono text-ink-2">RA {caso.candidato.ra ?? "não informado"}</span>
                  <span className={caso.matriculado ? "mat-sim inline-flex items-center gap-1" : "mat-nao inline-flex items-center gap-1"}>
                     {caso.matriculado ? <Check aria-hidden className="size-3.5" /> : <X aria-hidden className="size-3.5" />}
                     {caso.matriculado ? "Matriculado" : "Não matriculado"}
                  </span>
                  <span>Incluída em {fullDate(caso.criadoEm)}</span>
               </p>
            </div>
            <span className="caso-protocolo rounded-md bg-surface-2 px-3 py-2 font-mono text-[12px] text-ink-2">{caso.protocolo}</span>
         </div>
         <p className="mt-4 flex flex-wrap gap-x-2 gap-y-1 text-[13px] text-ink-2">
            <span className="font-medium">{caso.destino.cursoNome}</span>
            <span aria-hidden>·</span>
            <span>
               {ROTULO_MODALIDADE[caso.destino.modalidade]}
               {caso.destino.modalidade === "PRESENCIAL" ? ` ${ROTULO_TURNO[caso.destino.turno].toLowerCase()}` : ""}
            </span>
            <span aria-hidden>·</span>
            <span>{ROTULO_TIPO_COMPLETO[caso.tipo]}</span>
            <span aria-hidden>·</span>
            <span>Ciclo {caso.destino.ciclo}</span>
         </p>
      </header>
   );
}
