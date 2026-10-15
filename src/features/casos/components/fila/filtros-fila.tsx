/** Filtros frequentes à vista. Busca de aluno atravessa etapas; curso e oferta compõem. */
import { Search, X } from "lucide-react";
import { useState } from "react";
import { Field, CONTROL } from "@/components/core/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { useCursos } from "@/features/casos/api/casos.queries";
import { useCasosUrlState } from "@/features/casos/hooks/use-casos-url-state";
import { ROTULO_TIPO, ROTULO_ORDEM, ORDENS, type Ordem } from "@/features/casos/types/caso.schema";
import { tiposDoProcesso } from "@/features/casos/domain/processos";

export function FiltrosFila() {
   const url = useCasosUrlState();
   const { filtros, setFiltro, setBusca, setOferta, setOrdem } = url;
   const { data: cursos } = useCursos();
   const cursoAtual = cursos?.find(c => c.id === filtros.curso)?.nome ?? filtros.curso ?? "";
   const [aluno, setAluno] = useState(filtros.q);
   const [curso, setCurso] = useState(cursoAtual);
   const [anterior, setAnterior] = useState({ q: filtros.q, curso: cursoAtual });
   if (anterior.q !== filtros.q || anterior.curso !== cursoAtual) {
      setAnterior({ q: filtros.q, curso: cursoAtual });
      setAluno(filtros.q);
      setCurso(cursoAtual);
   }
   const buscarAluno = useDebouncedCallback(setBusca, 250);
   const buscarCurso = useDebouncedCallback((v: string) => setFiltro("curso", v.trim() || null), 250);
   const oferta = filtros.modalidade ? `${filtros.modalidade}${filtros.turno ? `:${filtros.turno}` : ""}` : "";
   const filtrado = !!(filtros.q || filtros.curso || filtros.modalidade || filtros.tipo || filtros.somenteAtrasados);
   const coordenacao = filtros.etapa === "AGUARDANDO_COORDENACAO";
   return (
      <div className="flex flex-col gap-3">
         {coordenacao && !filtros.q ? (
            <p className="text-[13px] text-ink-2">Encontre seu curso e responda às perguntas que aguardam a coordenação.</p>
         ) : null}
         <div className="grid items-end gap-3 md:grid-cols-[minmax(240px,1.5fr)_minmax(180px,1fr)_minmax(180px,.8fr)]">
            <Field label="Buscar aluno ou protocolo">
               {props => (
                  <div className="relative">
                     <Search aria-hidden className="pointer-events-none absolute top-3 left-3 size-4 text-ink-3" />
                     <Input
                        {...props}
                        type="search"
                        className="h-10 pl-9"
                        placeholder="RA, nome completo, CPF ou protocolo"
                        value={aluno}
                        onChange={e => {
                           setAluno(e.target.value);
                           buscarAluno(e.target.value);
                        }}
                        onKeyDown={e => {
                           if (e.key === "Enter") {
                              buscarAluno.cancel();
                              setBusca(aluno);
                           }
                        }}
                     />
                  </div>
               )}
            </Field>
            <Field label="Pesquisar curso">
               {props => (
                  <Input
                     {...props}
                     type="search"
                     className="h-10"
                     list="cursos-da-fila"
                     placeholder="Digite o nome do curso"
                     value={curso}
                     onChange={e => {
                        setCurso(e.target.value);
                        buscarCurso(e.target.value);
                     }}
                  />
               )}
            </Field>
            <datalist id="cursos-da-fila">
               {cursos?.map(c => (
                  <option key={c.id} value={c.nome} />
               ))}
            </datalist>
            <Field label="Modalidade e turno">
               {props => (
                  <select {...props} className={`${CONTROL} h-10`} value={oferta} onChange={e => setOferta(e.target.value)}>
                     <option value="">Todos</option>
                     <option value="PRESENCIAL:DIURNO">Presencial diurno</option>
                     <option value="PRESENCIAL:NOTURNO">Presencial noturno</option>
                     <option value="SEMIPRESENCIAL">Híbrido</option>
                     <option value="EAD">EAD</option>
                  </select>
               )}
            </Field>
         </div>
         <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {/* Processo com um tipo só (interna, aproveitamento) dispensa o filtro de tipo. */}
            {tiposDoProcesso(filtros.processo).length > 1 ? (
               <label className="flex items-center gap-2 text-[12px] whitespace-nowrap text-ink-2">
                  Tipo de solicitação
                  <select
                     className={`${CONTROL} h-8 w-auto max-w-[190px]`}
                     value={filtros.tipo ?? ""}
                     onChange={e => setFiltro("tipo", e.target.value || null)}
                  >
                     <option value="">Todos</option>
                     {tiposDoProcesso(filtros.processo).map(t => (
                        <option key={t} value={t}>
                           {ROTULO_TIPO[t]}
                        </option>
                     ))}
                  </select>
               </label>
            ) : null}
            <label className="flex items-center gap-2 text-[12px] whitespace-nowrap text-ink-2">
               <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={filtros.somenteAtrasados}
                  onChange={e => setFiltro("atrasados", e.target.checked)}
               />
               Só atrasadas
            </label>
            <label className="ml-auto flex items-center gap-2 text-[12px] whitespace-nowrap text-ink-2">
               Ordenar
               <select className={`${CONTROL} h-8 w-auto`} value={filtros.ordem} onChange={e => setOrdem(e.target.value as Ordem)}>
                  {ORDENS.map(o => (
                     <option key={o} value={o}>
                        {ROTULO_ORDEM[o]}
                     </option>
                  ))}
               </select>
            </label>
            {filtrado ? (
               <Button
                  variant="ghost"
                  size="xs"
                  icon={<X aria-hidden />}
                  onClick={() => {
                     buscarAluno.cancel();
                     buscarCurso.cancel();
                     setAluno("");
                     setCurso("");
                     url.limparPesquisa();
                  }}
               >
                  Limpar pesquisa
               </Button>
            ) : null}
         </div>
         {filtros.q ? (
            <p className="text-[12px] text-ink-3">Pesquisa em todas as etapas. Cada resultado é um protocolo independente.</p>
         ) : null}
      </div>
   );
}
