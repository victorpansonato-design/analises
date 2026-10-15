/**
 * Aba Dados (docs/05 §3.4): os campos do formulário antigo, agrupados e editáveis inline conforme
 * permissão. Campo vazio aparece como "Não informado". CPF mascarado por padrão; revelar é um clique
 * explícito que gera log de acesso e volta a mascarar ao trocar de caso (docs/04 §3).
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import { DataList, type DataItem } from "@/components/core/data-list";
import { Field } from "@/components/core/field";
import { SectionLabel } from "@/components/core/section-label";
import { SwitchRow } from "@/components/core/switch-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cpf as formatarCpf, fullDate, int, stamp } from "@/lib/format";
import { notificar } from "@/lib/notify";

import { useEditarCaso, useRevelarDado } from "@/features/casos/api/casos.mutations";
import { useVestibular } from "@/features/casos/api/casos.queries";
import { acaoDoCaso } from "@/features/casos/domain/acoes";
import {
   ROTULO_ETAPA,
   ROTULO_MODALIDADE,
   ROTULO_SUBTIPO_RETORNO,
   ROTULO_TIPO_COMPLETO,
   ROTULO_TURNO,
   type CasoDetalhe,
} from "@/features/casos/types/caso.schema";

type Grupo = "candidato" | "origem" | "ingresso";

function Secao({
   titulo,
   onEditar,
   editando,
   motivoBloqueio,
   children,
}: {
   titulo: string;
   onEditar?: () => void;
   editando?: boolean;
   motivoBloqueio?: string;
   children: ReactNode;
}) {
   return (
      <section className="space-y-3">
         <SectionLabel
            action={
               onEditar && !editando ? (
                  <Button
                     variant="ghost"
                     size="xs"
                     icon={<Pencil aria-hidden />}
                     onClick={onEditar}
                     className="acao-destaque -my-1 -mr-2"
                     data-tom="novas"
                  >
                     Editar
                  </Button>
               ) : motivoBloqueio && !editando ? (
                  <span className="text-[11px] text-ink-4">{motivoBloqueio}</span>
               ) : null
            }
         >
            {titulo}
         </SectionLabel>
         {children}
      </section>
   );
}

function CpfRevelavel({ caso }: { caso: CasoDetalhe }) {
   const revelar = useRevelarDado(caso.id);
   const [visivel, setVisivel] = useState<string | null>(null);
   const pode = acaoDoCaso(caso, "REVELAR_CPF");
   return (
      <span className="inline-flex items-center gap-1.5">
         <span className="font-mono">{visivel ? formatarCpf(visivel) : caso.candidato.cpfMascarado}</span>
         {pode?.habilitada ? (
            <button
               type="button"
               aria-label={visivel ? "Ocultar CPF" : "Mostrar CPF"}
               onClick={() => {
                  if (visivel) setVisivel(null);
                  else revelar.mutate("CPF", { onSuccess: valor => setVisivel(valor) });
               }}
               className="flex size-6 items-center justify-center rounded-full text-ink-4 transition-colors hover:bg-surface-2 hover:text-ink"
            >
               {visivel ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
            </button>
         ) : null}
         {visivel ? <span className="text-[11px] font-normal text-ink-4">acesso registrado</span> : null}
      </span>
   );
}

const CandidatoSchema = z.object({
   nome: z.string().trim().min(3, "Informe o nome completo"),
   celular: z.string().refine(v => v.replace(/\D/g, "").length >= 10, "Informe o celular com DDD"),
   email: z.union([z.literal(""), z.email("E-mail inválido")]),
   outroRa: z.string(),
   optInWhatsapp: z.boolean(),
});
type CandidatoForm = z.infer<typeof CandidatoSchema>;

function EditarCandidato({ caso, onFim }: { caso: CasoDetalhe; onFim: () => void }) {
   const editar = useEditarCaso(caso);
   const form = useForm<CandidatoForm>({
      resolver: zodResolver(CandidatoSchema),
      defaultValues: {
         nome: caso.candidato.nome,
         celular: caso.candidato.celular ?? "",
         email: caso.candidato.email ?? "",
         outroRa: caso.candidato.outroRa ?? "",
         optInWhatsapp: caso.candidato.optInWhatsapp,
      },
   });
   const e = form.formState.errors;
   const optIn = useWatch({ control: form.control, name: "optInWhatsapp" });
   const salvar = form.handleSubmit(v =>
      editar.mutate(
         { nome: v.nome, celular: v.celular, email: v.email, outroRa: v.outroRa, optInWhatsapp: v.optInWhatsapp },
         {
            onSuccess: () => {
               notificar({ titulo: "Dados salvos" });
               onFim();
            },
         },
      ),
   );
   return (
      <form
         className="space-y-3"
         onSubmit={ev => {
            ev.preventDefault();
            void salvar();
         }}
      >
         <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Nome" required error={e.nome?.message} className="sm:col-span-2">
               {p => <Input {...p} {...form.register("nome")} data-autofocus autoFocus />}
            </Field>
            <Field label="Celular" required error={e.celular?.message}>
               {p => <Input {...p} inputMode="tel" {...form.register("celular")} />}
            </Field>
            <Field label="E-mail" hint="opcional" error={e.email?.message}>
               {p => <Input {...p} type="email" {...form.register("email")} />}
            </Field>
            <Field label="Outro RA" hint="opcional">
               {p => <Input {...p} {...form.register("outroRa")} />}
            </Field>
         </div>
         <SwitchRow
            label="Autoriza contato pelo WhatsApp"
            description="Sem autorização, o sistema não envia lembretes nem a proposta pelo WhatsApp."
            checked={optIn}
            onCheckedChange={v => form.setValue("optInWhatsapp", v, { shouldDirty: true })}
         />
         <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onFim}>
               Cancelar
            </Button>
            <Button className="acao-destaque" data-tom="novas" type="submit" disabled={editar.isPending}>
               {editar.isPending ? "Salvando…" : "Salvar"}
            </Button>
         </div>
      </form>
   );
}

const OrigemSchema = z.object({ iesNome: z.string(), cursoNome: z.string(), ano: z.string(), semestre: z.string() });
type OrigemForm = z.infer<typeof OrigemSchema>;

function EditarOrigemIngresso({ caso, grupo, onFim }: { caso: CasoDetalhe; grupo: "origem" | "ingresso"; onFim: () => void }) {
   const editar = useEditarCaso(caso);
   const form = useForm<OrigemForm>({
      resolver: zodResolver(OrigemSchema),
      defaultValues: {
         iesNome: caso.origem.iesNome ?? "",
         cursoNome: caso.origem.cursoNome ?? "",
         ano: caso.ingresso.ano ? String(caso.ingresso.ano) : "",
         semestre: caso.ingresso.semestre ? String(caso.ingresso.semestre) : "",
      },
   });
   const salvar = form.handleSubmit(v =>
      editar.mutate(
         grupo === "origem"
            ? { origem: { iesNome: v.iesNome, cursoNome: v.cursoNome } }
            : { ingresso: { ano: Number(v.ano) || undefined, semestre: Number(v.semestre) || undefined } },
         {
            onSuccess: () => {
               notificar({ titulo: "Dados salvos" });
               onFim();
            },
         },
      ),
   );
   return (
      <form
         className="space-y-3"
         onSubmit={ev => {
            ev.preventDefault();
            void salvar();
         }}
      >
         <div className="grid gap-3 sm:grid-cols-2">
            {grupo === "origem" ? (
               <>
                  <Field label="Instituição de origem">{p => <Input {...p} {...form.register("iesNome")} autoFocus />}</Field>
                  <Field label="Curso de origem">{p => <Input {...p} {...form.register("cursoNome")} />}</Field>
               </>
            ) : (
               <>
                  <Field label="Ano de ingresso">{p => <Input {...p} inputMode="numeric" {...form.register("ano")} autoFocus />}</Field>
                  <Field label="Semestre">{p => <Input {...p} inputMode="numeric" {...form.register("semestre")} />}</Field>
               </>
            )}
         </div>
         <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onFim}>
               Cancelar
            </Button>
            <Button className="acao-destaque" data-tom="novas" type="submit" disabled={editar.isPending}>
               {editar.isPending ? "Salvando…" : "Salvar"}
            </Button>
         </div>
      </form>
   );
}

export function AbaDados({ caso, agora }: { caso: CasoDetalhe; agora: Date }) {
   const [editando, setEditando] = useState<Grupo | null>(null);
   const editar = acaoDoCaso(caso, "EDITAR_DADOS");
   const podeEditar = !!editar?.habilitada;
   const bloqueio = editar && !editar.habilitada ? editar.motivos[0] : undefined;
   const { data: vestibular, isLoading: carregandoVestibular } = useVestibular(caso.candidato.pessoaId);
   const r = caso.responsaveis;
   const externo = caso.tipo === "TRANSFERENCIA_EXTERNA" || caso.tipo === "PORTADOR_DIPLOMA" || caso.origem.estudouForaNoPeriodo;

   const candidato: DataItem[] = [
      { label: "Nome", value: caso.candidato.nome, wide: true },
      { label: "CPF", value: <CpfRevelavel caso={caso} /> },
      { label: "RA", value: caso.candidato.ra, mono: true },
      { label: "Celular", value: caso.candidato.celular, mono: true },
      { label: "E-mail", value: caso.candidato.email },
      { label: "Outro RA", value: caso.candidato.outroRa, mono: true },
      {
         label: "Contato pelo WhatsApp",
         value: caso.candidato.optInWhatsapp ? "Autorizado" : "Não autorizado",
         tone: caso.candidato.optInWhatsapp ? "plain" : "crit",
      },
   ];

   return (
      <div className="space-y-7">
         <Secao
            titulo="Candidato"
            onEditar={podeEditar ? () => setEditando("candidato") : undefined}
            editando={editando === "candidato"}
            motivoBloqueio={bloqueio}
         >
            {editando === "candidato" ? (
               <EditarCandidato caso={caso} onFim={() => setEditando(null)} />
            ) : (
               <DataList items={candidato} columns={2} />
            )}
         </Secao>

         <Secao titulo="Destino">
            <DataList
               columns={3}
               items={[
                  { label: "Tipo", value: ROTULO_TIPO_COMPLETO[caso.tipo] },
                  { label: "Retorno", value: caso.subtipo ? ROTULO_SUBTIPO_RETORNO[caso.subtipo] : null },
                  { label: "Curso", value: caso.destino.cursoNome },
                  { label: "Turno", value: ROTULO_TURNO[caso.destino.turno] },
                  { label: "Modalidade", value: ROTULO_MODALIDADE[caso.destino.modalidade] },
                  { label: "Matriz", value: caso.destino.matrizId?.split("-")[1] ?? null, mono: true },
                  { label: "Ciclo", value: caso.destino.ciclo, mono: true },
               ].filter(i => i.label !== "Retorno" || caso.tipo === "RETORNO")}
            />
         </Secao>

         <Secao titulo="Origem" onEditar={podeEditar && externo ? () => setEditando("origem") : undefined} editando={editando === "origem"}>
            {editando === "origem" ? (
               <EditarOrigemIngresso caso={caso} grupo="origem" onFim={() => setEditando(null)} />
            ) : (
               <DataList
                  columns={3}
                  items={[
                     { label: "Instituição", value: caso.origem.iesNome ?? (externo ? null : "UniAnchieta (histórico interno)") },
                     { label: "Curso", value: caso.origem.cursoNome },
                     ...(caso.tipo === "RETORNO"
                        ? [
                             {
                                label: "Estudou em outra instituição no período",
                                value: caso.origem.estudouForaNoPeriodo === null ? null : caso.origem.estudouForaNoPeriodo ? "Sim" : "Não",
                             },
                          ]
                        : []),
                  ]}
               />
            )}
         </Secao>

         <Secao titulo="Ingresso" onEditar={podeEditar ? () => setEditando("ingresso") : undefined} editando={editando === "ingresso"}>
            {editando === "ingresso" ? (
               <EditarOrigemIngresso caso={caso} grupo="ingresso" onFim={() => setEditando(null)} />
            ) : (
               <DataList
                  columns={3}
                  items={[
                     { label: "Ano", value: caso.ingresso.ano, mono: true },
                     { label: "Semestre", value: caso.ingresso.semestre, mono: true },
                     { label: "Período de ingresso", value: caso.ingresso.periodo ? `${int(caso.ingresso.periodo)}º período` : null },
                  ]}
               />
            )}
         </Secao>

         <Secao titulo="Responsáveis">
            <DataList
               columns={2}
               items={[
                  { label: "Consultor", value: r.consultor?.nome },
                  { label: "Analista", value: r.analista?.nome },
                  { label: "Coordenação", value: r.coordenador?.nome },
                  { label: "Matrícula", value: r.matricula?.nome },
               ]}
            />
         </Secao>

         <Secao titulo="Protocolo e datas">
            <DataList
               columns={3}
               items={[
                  { label: "Protocolo", value: caso.protocolo, mono: true },
                  { label: "Aberto em", value: fullDate(caso.criadoEm), mono: true },
                  { label: "Atualizado", value: stamp(caso.atualizadoEm, agora) },
                  { label: "Etapa atual", value: ROTULO_ETAPA[caso.etapa] },
                  { label: "Na etapa desde", value: stamp(caso.etapaDesde, agora) },
                  { label: "Reanálises", value: int(caso.reanalises), mono: true },
                  { label: "Resumo congelado em", value: caso.resumoCongeladoEm ? stamp(caso.resumoCongeladoEm, agora) : null },
                  { label: "Documentos no GED", value: caso.noGed ? "Sim" : "Ainda não" },
               ]}
            />
         </Secao>

         <Secao titulo="Dados do vestibular">
            {carregandoVestibular ? (
               <p className="text-[12px] text-ink-4">Carregando…</p>
            ) : vestibular ? (
               <DataList
                  columns={2}
                  items={Object.entries(vestibular).map(([label, value]) => ({
                     label,
                     value: typeof value === "number" ? int(value) : value,
                     mono: typeof value === "number",
                  }))}
               />
            ) : (
               <p className="text-[12px] text-ink-4">Não informado: o candidato não tem registro de vestibular na instituição.</p>
            )}
         </Secao>
      </div>
   );
}
