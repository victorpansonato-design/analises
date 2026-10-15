import {
   BookOpenCheck,
   Calculator,
   ChevronDown,
   CircleAlert,
   LoaderCircle,
   RotateCcw,
   Search,
   SlidersHorizontal,
   UserRound,
   Wallet,
} from "lucide-react";
import { useEffect, useState } from "react";

import { CONTROL, Field } from "@/components/core/field";
import { EmptyPanel } from "@/components/core/empty-panel";
import { SegmentedControl } from "@/components/core/segmented-control";
import { Status } from "@/components/core/status";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { Tag } from "@/components/core/tag";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

import { calcularDispensa, conferirMensalidades, DESCONTOS_VAZIOS, moedaDispensa } from "../domain";
import { useAlunoDispensa, useCatalogoDispensa } from "../queries";
import type { AlunoDispensa, DescontosDispensa, GradeDispensa } from "../types";
import { FinanceiroDispensa } from "./financeiro-dispensa";

const PERFIS = { normal: "Normal", ceu: "CEU", prouni50: "ProUni 50%" } as const;

export function CalculoDispensa() {
   const [modo, setModo] = useState<"aluno" | "manual">("aluno");
   const [ra, setRa] = useState("");
   const [consulta, setConsulta] = useState("");
   const [erroRa, setErroRa] = useState("");
   const catalogo = useCatalogoDispensa();
   const aluno = useAlunoDispensa(consulta);

   useEffect(() => {
      const titulo = document.title;
      document.title = "Cálculo de Dispensa | UNIANCHIETA";
      return () => {
         document.title = titulo;
      };
   }, []);

   function consultar() {
      if (!/^\d{4,12}$/.test(ra.trim())) {
         setErroRa("Informe um RA válido, com 4 a 12 números.");
         return;
      }
      setErroRa("");
      if (consulta === ra.trim()) void aluno.refetch();
      else setConsulta(ra.trim());
   }

   const dadosProntos = modo === "manual" || (consulta && aluno.data);

   return (
      <div id="conteudo" className="flex min-w-0 flex-col gap-5">
         <header className="flex items-start justify-between gap-6 px-1">
            <div>
               <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.03em]">Cálculo de Dispensa</h1>
               <p className="mt-1.5 text-[13px] text-ink-3">Da grade à mensalidade. Calcule, simule e confira os valores do aluno.</p>
            </div>
            <SegmentedControl
               ariaLabel="Forma de cálculo"
               layoutId="modo-dispensa"
               value={modo}
               onChange={valor => {
                  setModo(valor);
                  setConsulta("");
               }}
               options={[
                  { value: "aluno", label: "Consultar por RA", icon: <UserRound className="size-3.5" aria-hidden /> },
                  { value: "manual", label: "Cálculo manual", icon: <SlidersHorizontal className="size-3.5" aria-hidden /> },
               ]}
            />
         </header>

         {modo === "aluno" && (
            <Surface className="flex items-center gap-8" aria-label="Consulta por RA">
               <form
                  onSubmit={e => {
                     e.preventDefault();
                     consultar();
                  }}
                  className="flex shrink-0 items-end gap-3"
               >
                  <Field label="RA do aluno" error={erroRa} className="w-64">
                     {props => (
                        <Input
                           {...props}
                           inputMode="numeric"
                           maxLength={12}
                           placeholder="Ex.: 2026001"
                           autoComplete="off"
                           value={ra}
                           onChange={e => {
                              setRa(e.target.value);
                              setErroRa("");
                              setConsulta("");
                           }}
                        />
                     )}
                  </Field>
                  <Button
                     type="submit"
                     variant="primary"
                     size="md"
                     disabled={aluno.isFetching}
                     icon={aluno.isFetching ? <LoaderCircle className="animate-spin" aria-hidden /> : <Search aria-hidden />}
                  >
                     {aluno.isFetching ? "Consultando…" : "Buscar aluno"}
                  </Button>
               </form>
               <div className="border-l border-hairline pl-8 text-[12px] leading-relaxed text-ink-3">
                  <p className="font-medium text-ink-2">Uma consulta, todas as informações.</p>
                  <p>Curso, contrato, bolsa e dispensas do histórico, reunidos pelo RA.</p>
               </div>
            </Surface>
         )}

         {catalogo.isPending || (consulta && aluno.isFetching) ? (
            <Surface aria-busy="true" aria-label="Carregando dados do cálculo" className="flex flex-col gap-4">
               <Skeleton className="h-10 w-80" />
               <Skeleton className="h-36 w-full" />
               <span className="sr-only">Carregando informações…</span>
            </Surface>
         ) : catalogo.isError || (consulta && aluno.isError) ? (
            <Surface>
               <EmptyPanel
                  icon={CircleAlert}
                  title="Não foi possível consultar os dados"
                  message="Tente novamente. Você também pode fazer um cálculo manual quando o catálogo estiver disponível."
                  action={
                     <Button
                        onClick={() => {
                           void catalogo.refetch();
                           if (consulta) void aluno.refetch();
                        }}
                        icon={<RotateCcw aria-hidden />}
                     >
                        Tentar novamente
                     </Button>
                  }
               />
            </Surface>
         ) : consulta && aluno.data === null ? (
            <Surface>
               <EmptyPanel
                  icon={UserRound}
                  title="Aluno não encontrado"
                  message={`Não encontramos o RA ${consulta}. Confira o número ou use o cálculo manual para continuar.`}
                  action={
                     <Button
                        onClick={() => {
                           setModo("manual");
                           setConsulta("");
                        }}
                        icon={<SlidersHorizontal aria-hidden />}
                     >
                        Fazer cálculo manual
                     </Button>
                  }
               />
            </Surface>
         ) : dadosProntos && catalogo.data ? (
            <WorkspaceDispensa
               key={modo === "manual" ? "manual" : consulta}
               catalogo={catalogo.data}
               aluno={modo === "aluno" ? (aluno.data ?? undefined) : undefined}
            />
         ) : (
            <Surface className="py-14">
               <EmptyPanel
                  icon={BookOpenCheck}
                  title="Tudo começa pelo RA"
                  message="Localize o aluno para carregar sua grade. As disciplinas dispensadas já ficam fora do cálculo e a bolsa entra automaticamente."
                  action={
                     <Button
                        variant="link"
                        onClick={() => {
                           setRa("2026001");
                           setConsulta("2026001");
                        }}
                     >
                        Consultar RA 2026001
                     </Button>
                  }
               />
               <div className="mx-auto mt-10 flex max-w-3xl justify-between gap-8 border-t border-hairline pt-7 text-[12px] text-ink-3">
                  <p>
                     <Search className="mb-2 size-4 text-brand-text" aria-hidden />
                     <strong className="block font-medium text-ink">Localize o aluno</strong>Selecione o período que quer conferir.
                  </p>
                  <p>
                     <Calculator className="mb-2 size-4 text-brand-text" aria-hidden />
                     <strong className="block font-medium text-ink">Confira o cálculo</strong>Revise a grade e simule ajustes, se precisar.
                  </p>
                  <p>
                     <Wallet className="mb-2 size-4 text-brand-text" aria-hidden />
                     <strong className="block font-medium text-ink">Veja o financeiro</strong>Compare o previsto com cada mensalidade.
                  </p>
               </div>
            </Surface>
         )}
      </div>
   );
}

function WorkspaceDispensa({ catalogo, aluno }: { catalogo: GradeDispensa[]; aluno?: AlunoDispensa }) {
   const inicial = aluno ? catalogo.find(g => g.id === aluno.vinculos[0]?.gradeId) : catalogo.find(g => g.id === "0-2026-2-Noturno-2");
   const [gradeId, setGradeId] = useState(inicial?.id ?? (aluno ? "" : catalogo[0]?.id) ?? "");
   const grade = catalogo.find(g => g.id === gradeId);
   const vinculo = aluno?.vinculos.find(v => v.gradeId === gradeId);
   const [selecionadas, setSelecionadas] = useState<string[]>(
      inicial?.disciplinas.filter(d => !aluno?.vinculos[0]?.dispensadas.includes(d.id)).map(d => d.id) ?? [],
   );
   const [descontos, setDescontos] = useState<DescontosDispensa>({ ...(aluno?.vinculos[0]?.descontos ?? DESCONTOS_VAZIOS) });
   const [contrato, setContrato] = useState(String((inicial?.contrato ?? 0) / 100));
   const [ajustes, setAjustes] = useState(!aluno);
   const [financeiro, setFinanceiro] = useState(false);
   const [errosNumericos, setErrosNumericos] = useState<Record<string, boolean>>({});
   const [revisao, setRevisao] = useState(0);

   if (!grade)
      return (
         <Surface>
            <EmptyPanel
               icon={BookOpenCheck}
               title="Grade não disponível"
               message="Não há contrato e disciplinas disponíveis para este vínculo. Faça uma consulta manual ou solicite a conferência do cadastro."
            />
         </Surface>
      );

   const contratoCentavos = Math.round(Number(contrato) * 100);
   const contratoValido = contrato !== "" && Number.isFinite(contratoCentavos) && contratoCentavos > 0;
   const valido = contratoValido && !Object.values(errosNumericos).some(Boolean);
   const resultado = calcularDispensa(grade, selecionadas, descontos, contratoValido ? contratoCentavos : 0);
   const originais = grade.disciplinas.filter(d => !vinculo?.dispensadas.includes(d.id)).map(d => d.id);
   const alterado = Boolean(
      aluno &&
      (!vinculo ||
         contratoCentavos !== grade.contrato ||
         JSON.stringify(descontos) !== JSON.stringify(vinculo.descontos) ||
         originais.some(id => !selecionadas.includes(id)) ||
         selecionadas.some(id => !originais.includes(id))),
   );
   const linhasFinanceiro = vinculo ? conferirMensalidades(vinculo.mensalidades, resultado) : [];
   const diferencas = linhasFinanceiro.filter(m => m.diferenca !== 0).length;

   function carregarGrade(id: string) {
      const nova = catalogo.find(g => g.id === id);
      if (!nova) return;
      const v = aluno?.vinculos.find(item => item.gradeId === id);
      setGradeId(id);
      setSelecionadas(nova.disciplinas.filter(d => !v?.dispensadas.includes(d.id)).map(d => d.id));
      setDescontos({ ...(v?.descontos ?? DESCONTOS_VAZIOS) });
      setContrato(String(nova.contrato / 100));
      setErrosNumericos({});
      setRevisao(prev => prev + 1);
   }

   function mudarFiltro(chave: "ano" | "periodo" | "curso" | "curriculo" | "turno" | "serie", valor: string) {
      const candidatos = catalogo.filter(g => String(g[chave]) === valor);
      const score = (g: GradeDispensa) =>
         ["ano", "curso", "turno", "serie"].reduce(
            (s, k) => s + (g[k as keyof GradeDispensa] === grade?.[k as keyof GradeDispensa] ? 1 : 0),
            0,
         ) + (g.periodo.split("/")[1] === grade?.periodo.split("/")[1] ? 1 : 0);
      const proxima = [...candidatos].sort((a, b) => score(b) - score(a))[0];
      if (proxima) carregarGrade(proxima.id);
   }

   return (
      <>
         <Surface className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-5">
               <div className="flex min-w-0 items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand-text">
                     <UserRound className="size-5" aria-hidden />
                  </span>
                  <div>
                     <h2 className="text-[17px] font-semibold">{aluno?.nome ?? "Cálculo manual"}</h2>
                     <div className="mt-1 flex items-center gap-2 text-[12px] text-ink-3">
                        {aluno ? (
                           <>
                              <span className="tabular-nums">RA {aluno.ra}</span>
                              <span aria-hidden>·</span>
                              <span>Dados do cadastro acadêmico</span>
                           </>
                        ) : (
                           <span>Selecione a oferta e informe as condições para simular.</span>
                        )}
                     </div>
                  </div>
               </div>
               <div className="flex items-center gap-3">
                  {aluno && (
                     <Field label="Período letivo" className="w-36">
                        {props => (
                           <select {...props} value={gradeId} onChange={e => carregarGrade(e.target.value)} className={cn(CONTROL, "h-9")}>
                              {aluno.vinculos.map(v => {
                                 const g = catalogo.find(c => c.id === v.gradeId);
                                 return g ? (
                                    <option key={g.id} value={g.id}>
                                       {g.periodo}
                                    </option>
                                 ) : null;
                              })}
                              {!vinculo && <option value={gradeId}>{grade.periodo} · manual</option>}
                           </select>
                        )}
                     </Field>
                  )}
                  {aluno && (
                     <Button aria-expanded={ajustes} onClick={() => setAjustes(!ajustes)} icon={<SlidersHorizontal aria-hidden />}>
                        Ajustar parâmetros
                     </Button>
                  )}
               </div>
            </div>
            {ajustes ? (
               <FiltrosGrade grade={grade} catalogo={catalogo} onChange={mudarFiltro} />
            ) : (
               <dl className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-6 border-t border-hairline pt-4 text-[13px]">
                  <div>
                     <dt className="mb-1 text-[11px] text-ink-3">Curso</dt>
                     <dd className="font-medium">{grade.curso}</dd>
                  </div>
                  <div>
                     <dt className="mb-1 text-[11px] text-ink-3">Currículo</dt>
                     <dd>{grade.curriculo}</dd>
                  </div>
                  <div>
                     <dt className="mb-1 text-[11px] text-ink-3">Turno</dt>
                     <dd>{grade.turno}</dd>
                  </div>
                  <div>
                     <dt className="mb-1 text-[11px] text-ink-3">Série</dt>
                     <dd>{grade.serie}º período</dd>
                  </div>
               </dl>
            )}
            {alterado && (
               <div className="flex items-center justify-between gap-3 rounded-lg bg-warn-soft px-3 py-2 text-[12px] text-warn-ink">
                  <span>Simulação ajustada. O cadastro original do aluno foi preservado.</span>
                  <Button
                     size="xs"
                     variant="ghost"
                     onClick={() =>
                        carregarGrade(
                           aluno?.vinculos.find(v => catalogo.find(c => c.id === v.gradeId)?.periodo === grade.periodo)?.gradeId ??
                              aluno?.vinculos[0]?.gradeId ??
                              gradeId,
                        )
                     }
                     icon={<RotateCcw aria-hidden />}
                  >
                     Restaurar cadastro
                  </Button>
               </div>
            )}
         </Surface>

         <div className="grid grid-cols-[minmax(0,1fr)_330px] items-start gap-5">
            <div className="flex min-w-0 flex-col gap-5">
               <Surface padded={false} className="overflow-hidden">
                  <SurfaceHeader
                     className="p-5"
                     title="Disciplinas do período"
                     subtitle="Selecione apenas as disciplinas que entram no cálculo."
                     action={
                        <Tag>
                           {selecionadas.length} de {grade.disciplinas.length} a cursar
                        </Tag>
                     }
                  />
                  <table className="w-full text-[12px]">
                     <caption className="sr-only">
                        Disciplinas de {grade.curso}, {grade.periodo}. Valores mensais proporcionais aos créditos.
                     </caption>
                     <thead className="bg-surface-2 text-left text-[11px] font-medium text-ink-3">
                        <tr>
                           <th scope="col" className="w-16 px-5 py-3">
                              Cursar
                           </th>
                           <th scope="col" className="py-3">
                              Disciplina
                           </th>
                           <th scope="col" className="px-3 py-3 text-center">
                              Créditos
                           </th>
                           <th scope="col" className="px-3 py-3 text-right">
                              Valor mensal
                           </th>
                           <th scope="col" className="pr-5 pl-3 py-3">
                              Histórico
                           </th>
                        </tr>
                     </thead>
                     <tbody>
                        {grade.disciplinas.map((d, i) => {
                           const cursar = selecionadas.includes(d.id);
                           const dispensada = vinculo?.dispensadas.includes(d.id);
                           return (
                              <tr
                                 key={d.id}
                                 className={cn(
                                    "border-b border-hairline last:border-0 transition-colors hover:bg-surface-hover",
                                    !cursar && "bg-surface-2/40",
                                 )}
                              >
                                 <td className="px-5 py-4">
                                    <input
                                       id={`dispensa-${d.id}`}
                                       type="checkbox"
                                       className="size-4 cursor-pointer accent-brand"
                                       aria-label={`Cursar ${d.nome}`}
                                       checked={cursar}
                                       onChange={e =>
                                          setSelecionadas(prev => (e.target.checked ? [...prev, d.id] : prev.filter(id => id !== d.id)))
                                       }
                                    />
                                 </td>
                                 <th scope="row" className={cn("py-4 text-left font-medium", !cursar && "text-ink-3")}>
                                    <label htmlFor={`dispensa-${d.id}`} className="cursor-pointer">
                                       {d.nome}
                                    </label>
                                    {!cursar && <span className="mt-0.5 block text-[10.5px] font-normal text-ink-3">Fora do cálculo</span>}
                                 </th>
                                 <td className="px-3 py-4 text-center tabular-nums text-ink-3">{d.creditos}</td>
                                 <td className="px-3 py-4 text-right whitespace-nowrap tabular-nums">
                                    {moedaDispensa(resultado.valores[i])}
                                 </td>
                                 <td className="pr-5 pl-3 py-4">
                                    {vinculo ? (
                                       <Status tone={dispensada ? "info" : "ok"}>{dispensada ? "Dispensada" : "A cursar"}</Status>
                                    ) : (
                                       <span className="text-ink-3">—</span>
                                    )}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                     <tfoot className="border-t border-hairline bg-surface-2/50">
                        <tr>
                           <td colSpan={3} className="px-5 py-3 text-ink-3">
                              {grade.disciplinas.length - selecionadas.length} fora do cálculo · {moedaDispensa(resultado.dispensado)}
                           </td>
                           <td colSpan={2} className="px-5 py-3 text-right font-semibold tabular-nums">
                              A cursar: {moedaDispensa(resultado.base)}
                           </td>
                        </tr>
                     </tfoot>
                  </table>
               </Surface>

               <Surface className="flex flex-col gap-4">
                  <SurfaceHeader
                     title="Contrato e descontos"
                     subtitle={
                        vinculo
                           ? "Condições carregadas do cadastro. Você pode ajustá-las nesta simulação."
                           : "Informe as condições de pagamento para este cálculo."
                     }
                  />
                  <div key={`condicoes-${revisao}`} className="grid grid-cols-3 gap-4">
                     <Field label="Regra de cálculo">
                        {props => (
                           <select
                              {...props}
                              value={descontos.perfil}
                              onChange={e => setDescontos(prev => ({ ...prev, perfil: e.target.value as DescontosDispensa["perfil"] }))}
                              className={cn(CONTROL, "h-9.5")}
                           >
                              {Object.entries(PERFIS).map(([valor, rotulo]) => (
                                 <option key={valor} value={valor}>
                                    {rotulo}
                                 </option>
                              ))}
                           </select>
                        )}
                     </Field>
                     <Field label="Contrato mensal (R$)" error={!contratoValido ? "Informe um valor maior que zero." : undefined}>
                        {props => (
                           <Input
                              {...props}
                              type="number"
                              min="0.01"
                              step="0.01"
                              value={contrato}
                              onChange={e => setContrato(e.target.value)}
                           />
                        )}
                     </Field>
                     <CampoDesconto
                        label="Bolsa comercial (%)"
                        chave="bolsa"
                        descontos={descontos}
                        onChange={setDescontos}
                        onValidade={invalido => setErrosNumericos(prev => ({ ...prev, bolsa: invalido }))}
                     />
                  </div>
                  {descontos.perfil === "ceu" && (
                     <p className="rounded-lg bg-brand-soft px-3 py-2.5 text-[12px] text-brand-text">
                        CEU: contrato − dispensas − bolsa comercial; acrescente 10% ao saldo e divida por 2.
                     </p>
                  )}
                  {descontos.perfil === "prouni50" && (
                     <p className="rounded-lg bg-brand-soft px-3 py-2.5 text-[12px] text-brand-text">
                        ProUni 50%: contrato − bolsa comercial, dividido por 2. As dispensas não reduzem a base desta regra.
                     </p>
                  )}
                  <details className="group border-t border-hairline pt-3">
                     <summary className="flex cursor-pointer list-none items-center justify-between text-[12px] font-medium text-ink-2">
                        Outros descontos e antecipação
                        <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden />
                     </summary>
                     <div key={`extras-${revisao}`} className="mt-4 grid grid-cols-3 gap-4">
                        <CampoDesconto
                           label="Desconto fixo (R$)"
                           chave="fixo"
                           descontos={descontos}
                           onChange={setDescontos}
                           onValidade={invalido => setErrosNumericos(prev => ({ ...prev, fixo: invalido }))}
                        />
                        <CampoDesconto
                           label="Antecipado 1 (%)"
                           chave="antecipado1"
                           descontos={descontos}
                           onChange={setDescontos}
                           onValidade={invalido => setErrosNumericos(prev => ({ ...prev, antecipado1: invalido }))}
                        />
                        <CampoDesconto
                           label="Antecipado 2 (%)"
                           chave="antecipado2"
                           descontos={descontos}
                           onChange={setDescontos}
                           onValidade={invalido => setErrosNumericos(prev => ({ ...prev, antecipado2: invalido }))}
                        />
                     </div>
                     <p className="mt-3 text-[11.5px] text-ink-3">
                        O desconto fixo entra após a regra de cálculo. A antecipação aplica um desconto adicional sobre a mensalidade
                        resultante.
                     </p>
                  </details>
               </Surface>
            </div>

            <Surface className="sticky top-5 flex flex-col gap-4" aria-label="Resultado do cálculo">
               <SurfaceHeader title="Memória de cálculo" action={<Tag>{PERFIS[descontos.perfil]}</Tag>} />
               <dl className="flex flex-col gap-3 text-[12px] tabular-nums">
                  <LinhaValor label="Contrato mensal" valor={contratoValido ? contratoCentavos : 0} />
                  <LinhaValor
                     label={descontos.perfil === "prouni50" ? "Dispensas (não aplicadas)" : "Disciplinas fora do cálculo"}
                     valor={resultado.dispensado}
                     sinal={descontos.perfil === "prouni50" ? "" : "−"}
                  />
                  <LinhaValor label={`Bolsa comercial · ${descontos.bolsa}%`} valor={resultado.bolsa} sinal="−" />
                  {descontos.perfil === "ceu" && <LinhaValor label="Acréscimo CEU · 10%" valor={resultado.acrescimoCeu} sinal="+" />}
                  {descontos.perfil !== "normal" && <LinhaValor label="Após dividir por 2" valor={resultado.valorPerfil} />}
                  {descontos.fixo > 0 && <LinhaValor label="Desconto fixo aplicado" valor={resultado.fixo} sinal="−" />}
               </dl>
               <div className="border-t border-hairline pt-4" aria-live="polite" aria-atomic="true">
                  <p className="text-[12px] font-medium text-ink-2">Mensalidade calculada</p>
                  <p className="mt-1 text-[32px] font-semibold tracking-[-0.03em] text-brand-text tabular-nums">
                     {valido ? moedaDispensa(resultado.regular) : "—"}
                  </p>
                  <p className="mt-1 text-[11.5px] text-ink-3">
                     {valido ? `${grade.periodo} · pagamento regular` : "Corrija os campos para conferir o resultado."}
                  </p>
               </div>
               {(descontos.antecipado1 > 0 || descontos.antecipado2 > 0) && (
                  <dl className="flex flex-col gap-2 rounded-lg bg-surface-2 p-3 text-[11.5px] tabular-nums">
                     <LinhaValor label={`Antecipado 1 · ${descontos.antecipado1}%`} valor={resultado.antecipado1} />
                     <LinhaValor label={`Antecipado 2 · ${descontos.antecipado2}%`} valor={resultado.antecipado2} />
                  </dl>
               )}
               {aluno ? (
                  <>
                     <Button
                        variant="primary"
                        size="md"
                        full
                        disabled={!vinculo || !valido}
                        icon={<Wallet aria-hidden />}
                        onClick={() => setFinanceiro(true)}
                     >
                        Ver financeiro
                        {vinculo && valido && diferencas > 0 && (
                           <span className="rounded-full bg-on-brand/20 px-1.5 text-[11px]">{diferencas}</span>
                        )}
                     </Button>
                     <p className="text-[11.5px] leading-relaxed text-ink-3">
                        {!vinculo
                           ? "A oferta selecionada não possui um vínculo financeiro para este aluno."
                           : alterado
                             ? "Compare as mensalidades lançadas com os valores desta simulação."
                             : diferencas > 0
                               ? `${diferencas} mensalidades com diferença. Abra para conferir.`
                               : "As mensalidades do período coincidem com o cálculo."}
                     </p>
                  </>
               ) : (
                  <p className="border-t border-hairline pt-3 text-[11.5px] leading-relaxed text-ink-3">
                     Para conferir as mensalidades lançadas, consulte o aluno pelo RA.
                  </p>
               )}
               {!selecionadas.length && (
                  <p className="text-[11.5px] text-warn-ink">
                     Nenhuma disciplina selecionada.
                     {descontos.perfil === "prouni50" ? " O ProUni 50% mantém a base integral." : " O valor a cursar é zero."}
                  </p>
               )}
            </Surface>
         </div>
         {vinculo && aluno && (
            <FinanceiroDispensa
               open={financeiro}
               onOpenChange={setFinanceiro}
               aluno={aluno}
               periodo={grade.periodo}
               resultado={resultado}
               mensalidades={vinculo.mensalidades}
               alterado={alterado}
            />
         )}
      </>
   );
}

function LinhaValor({ label, valor, sinal = "" }: { label: string; valor: number; sinal?: string }) {
   return (
      <div className="flex items-baseline justify-between gap-3">
         <dt className="text-ink-3">{label}</dt>
         <dd className="shrink-0 font-medium">
            {sinal && `${sinal} `}
            {moedaDispensa(valor)}
         </dd>
      </div>
   );
}

function CampoDesconto({
   label,
   chave,
   descontos,
   onChange,
   onValidade,
}: {
   label: string;
   chave: "bolsa" | "fixo" | "antecipado1" | "antecipado2";
   descontos: DescontosDispensa;
   onChange: (d: DescontosDispensa) => void;
   onValidade: (invalido: boolean) => void;
}) {
   const [erro, setErro] = useState(false);
   const [rascunho, setRascunho] = useState<string | null>(null);
   const percentual = chave !== "fixo";
   return (
      <Field
         label={label}
         error={erro ? (percentual ? "Informe um percentual de 0 a 100." : "Informe um valor a partir de zero.") : undefined}
      >
         {props => (
            <Input
               {...props}
               type="number"
               min="0"
               max={percentual ? 100 : undefined}
               step="0.01"
               value={rascunho ?? (percentual ? descontos[chave] : descontos[chave] / 100)}
               onChange={e => {
                  const valor = Number(e.target.value);
                  const invalido = e.target.value === "" || !Number.isFinite(valor) || valor < 0 || (percentual && valor > 100);
                  setErro(invalido);
                  onValidade(invalido);
                  setRascunho(invalido ? e.target.value : null);
                  if (!invalido) onChange({ ...descontos, [chave]: percentual ? valor : Math.round(valor * 100) });
               }}
            />
         )}
      </Field>
   );
}

function FiltrosGrade({
   grade,
   catalogo,
   onChange,
}: {
   grade: GradeDispensa;
   catalogo: GradeDispensa[];
   onChange: (k: "ano" | "periodo" | "curso" | "curriculo" | "turno" | "serie", valor: string) => void;
}) {
   const campos = [
      { chave: "ano", label: "Ano do contrato", valores: [...new Set(catalogo.map(g => String(g.ano)))].sort().reverse() },
      {
         chave: "periodo",
         label: "Período letivo",
         valores: [...new Set(catalogo.filter(g => g.ano === grade.ano).map(g => g.periodo))].sort().reverse(),
      },
      { chave: "curso", label: "Curso", valores: [...new Set(catalogo.map(g => g.curso))] },
      {
         chave: "curriculo",
         label: "Currículo",
         valores: [...new Set(catalogo.filter(g => g.curso === grade.curso && g.ano === grade.ano).map(g => g.curriculo))],
      },
      {
         chave: "turno",
         label: "Turno",
         valores: [...new Set(catalogo.filter(g => g.curso === grade.curso && g.periodo === grade.periodo).map(g => g.turno))],
      },
      {
         chave: "serie",
         label: "Série",
         valores: [
            ...new Set(
               catalogo
                  .filter(g => g.curso === grade.curso && g.periodo === grade.periodo && g.turno === grade.turno)
                  .map(g => String(g.serie)),
            ),
         ],
      },
   ] as const;
   return (
      <div className="grid grid-cols-[1fr_1fr_2fr_1.2fr_1fr_1fr] gap-3 border-t border-hairline pt-4">
         {campos.map(c => (
            <Field key={c.chave} label={c.label}>
               {props => (
                  <select
                     {...props}
                     className={cn(CONTROL, "h-9")}
                     value={String(grade[c.chave])}
                     onChange={e => onChange(c.chave, e.target.value)}
                  >
                     {c.valores.map(v => (
                        <option key={v} value={v}>
                           {c.chave === "serie" ? `${v}º período` : v}
                        </option>
                     ))}
                  </select>
               )}
            </Field>
         ))}
      </div>
   );
}
