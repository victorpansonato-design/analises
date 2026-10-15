/**
 * Recorte do painel: tipo, curso e modalidade (selects preenchidos, nunca contornados). O ciclo é o
 * da tela (chave `ciclo` do integrador) e aparece como fato, não como controle. "Limpar recorte"
 * só existe quando há recorte: botão que não faz nada não aparece.
 */
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ModalidadeSchema, ROTULO_MODALIDADE, ROTULO_TIPO, TIPOS, useCursos } from "@/features/casos";
import type { ChaveIndicadores } from "@/features/indicadores/hooks/use-indicadores-url";
import type { FiltrosIndicadores } from "@/features/indicadores/types/indicadores.schema";

const TODOS = "__todos__";

interface FiltrosProps {
   filtros: FiltrosIndicadores;
   definir: (chave: ChaveIndicadores, valor: string | null) => void;
   limpar: () => void;
}

export function FiltrosIndicadoresBarra({ filtros, definir, limpar }: FiltrosProps) {
   const cursos = useCursos();
   const recortado = !!(filtros.tipo || filtros.curso || filtros.modalidade);
   return (
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Recorte do painel">
         <Filtro
            rotulo="Tipo"
            valor={filtros.tipo}
            todos="Todos os tipos"
            opcoes={TIPOS.map(t => ({ valor: t, rotulo: ROTULO_TIPO[t] }))}
            onChange={v => definir("ind_tipo", v)}
         />
         <Filtro
            rotulo="Curso"
            valor={filtros.curso}
            todos={cursos.isLoading ? "Carregando cursos" : "Todos os cursos"}
            opcoes={(cursos.data ?? []).map(c => ({ valor: c.id, rotulo: c.nome }))}
            onChange={v => definir("ind_curso", v)}
         />
         <Filtro
            rotulo="Modalidade"
            valor={filtros.modalidade}
            todos="Todas as modalidades"
            opcoes={ModalidadeSchema.options.map(m => ({ valor: m, rotulo: ROTULO_MODALIDADE[m] }))}
            onChange={v => definir("ind_modalidade", v)}
         />
         {recortado ? (
            <Button variant="ghost" size="xs" onClick={limpar}>
               Limpar recorte
            </Button>
         ) : null}
      </div>
   );
}

interface FiltroProps {
   rotulo: string;
   valor: string | null;
   todos: string;
   opcoes: { valor: string; rotulo: string }[];
   onChange: (valor: string | null) => void;
}

function Filtro({ rotulo, valor, todos, opcoes, onChange }: FiltroProps) {
   return (
      <Select value={valor ?? TODOS} onValueChange={v => onChange(v === TODOS ? null : v)}>
         <SelectTrigger size="sm" aria-label={rotulo} className="min-w-[150px] text-[12.5px]">
            <SelectValue placeholder={todos} />
         </SelectTrigger>
         <SelectContent>
            <SelectItem value={TODOS}>{todos}</SelectItem>
            {opcoes.map(o => (
               <SelectItem key={o.valor} value={o.valor}>
                  {o.rotulo}
               </SelectItem>
            ))}
         </SelectContent>
      </Select>
   );
}
