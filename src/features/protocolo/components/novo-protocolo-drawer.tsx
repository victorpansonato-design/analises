/**
 * Drawer "Novo protocolo" (docs/05 §4): uma tela, meta de menos de 1 minuto.
 *
 * - O CPF vem primeiro (foco inicial) e puxa o que já se sabe da pessoa: nome, celular, e-mail,
 *   vínculo com a UniAnchieta (que SUGERE o tipo, com o porquê) e casos ativos. Caso ativo no mesmo
 *   curso bloqueia o envio com o link para o caso existente (guarda `semDuplicado` da máquina).
 * - Só aparece o campo que o tipo pede: origem em externa e diploma; subtipo em retorno; "estudou
 *   fora" em retorno sem vínculo.
 * - Antes de confirmar, o rodapé diz o que vai acontecer (WhatsApp com a lista de documentos, ou
 *   pré-análise automática). Enter num campo NÃO envia: confirmar é sempre o botão.
 * - Fechar no meio guarda o rascunho (sessionStorage); reabrir continua de onde parou.
 * - "Nova análise para este candidato" (`deCasoId`) pré-preenche a partir do caso, menos o CPF, que
 *   chega mascarado: a pessoa confirma o CPF e o lookup segue normal.
 */
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, FilePlus2, RotateCcw, SearchCheck, TriangleAlert, UserRoundSearch } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { DataList } from "@/components/core/data-list";
import { CONTROL, Field } from "@/components/core/field";
import { Notice } from "@/components/core/notice";
import { Drawer } from "@/components/core/overlay";
import { SectionLabel } from "@/components/core/section-label";
import { SegmentedControl } from "@/components/core/segmented-control";
import { SwitchRow } from "@/components/core/switch-row";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { collapseVariants, press } from "@/lib/motion";
import { lista, plural } from "@/lib/format";
import { avisarErro, notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { lerErroApi } from "@/services/api-erro";

import {
   ROTULO_ETAPA,
   ROTULO_MODALIDADE,
   ROTULO_SUBTIPO_RETORNO,
   ROTULO_TIPO,
   ROTULO_TIPO_COMPLETO,
   ROTULO_TURNO,
   SubtipoRetornoSchema,
   TIPOS,
   useCaso,
   useCursos,
   type CasoDetalhe,
   type Tipo,
} from "@/features/casos";

import { useCriarProtocolo } from "@/features/protocolo/api/protocolo.mutations";
import { useLookupPessoa } from "@/features/protocolo/api/protocolo.queries";
import { CampoIes } from "@/features/protocolo/components/campo-ies";
import { DocumentosIniciais } from "@/features/protocolo/components/documentos-iniciais";
import {
   ajustarDestino,
   casoDuplicado,
   FORM_VAZIO,
   mascaraCelular,
   mascaraCpf,
   montarNovoProtocolo,
   mostraEstudouFora,
   mostraOrigem,
   mostraSubtipo,
   oQueVaiAcontecer,
   outrosCasosAtivos,
   rascunhoTemConteudo,
   resumoFalhasUpload,
   somenteDigitos,
   sugerirTipo,
} from "@/features/protocolo/domain/protocolo";
import { useRascunhoProtocoloStore } from "@/features/protocolo/stores/rascunho-protocolo.store";
import { cpfValido, NovoProtocoloFormSchema, type NovoProtocoloForm } from "@/features/protocolo/types/protocolo.schema";

export interface NovoProtocoloDrawerProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   /** Caso criado. O drawer não se fecha sozinho: quem abriu decide (fechar e abrir o caso). */
   onCriado: (casoId: string) => void;
   onAbrirCaso: (casoId: string) => void;
   /** "Nova análise para este candidato": pré-preenche a partir deste caso. */
   deCasoId?: string | null;
}

const FORM_ID = "form-novo-protocolo";
const OPCOES_TIPO = TIPOS.map(t => ({ value: t, label: ROTULO_TIPO[t], ariaLabel: ROTULO_TIPO_COMPLETO[t] }));
const OPCOES_SUBTIPO = SubtipoRetornoSchema.options.map(s => ({ value: s, label: ROTULO_SUBTIPO_RETORNO[s] }));
const SELECT = cn(CONTROL, "h-9 cursor-pointer appearance-none pr-8");

function Select({ children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
   return (
      <div className="relative">
         <select {...props} className={SELECT}>
            {children}
         </select>
         <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-ink-4" aria-hidden />
      </div>
   );
}

/** Contato vindo do caso de origem só serve se não estiver mascarado. */
function contatoLimpo(valor: string | null): string | null {
   return valor && !valor.includes("*") ? valor : null;
}

/** Valores do rascunho salvo, se ele é deste mesmo ponto de partida (`deCasoId`). */
function rascunhoAplicavel(deCasoId: string | null): Partial<NovoProtocoloForm> | null {
   const r = useRascunhoProtocoloStore.getState();
   return rascunhoTemConteudo(r.valores) && (r.deCasoId ?? null) === deCasoId ? r.valores : null;
}

interface ErroEnvio {
   mensagem: string;
   casoId: string | null;
}

export function NovoProtocoloDrawer({ open, onOpenChange, onCriado, onAbrirCaso, deCasoId = null }: NovoProtocoloDrawerProps) {
   const salvarRascunho = useRascunhoProtocoloStore(s => s.salvar);
   const descartarRascunho = useRascunhoProtocoloStore(s => s.descartar);
   const form = useForm<NovoProtocoloForm>({ resolver: zodResolver(NovoProtocoloFormSchema), defaultValues: FORM_VAZIO });
   const { control, setValue, getValues, formState } = form;
   const [arquivos, setArquivos] = useState<File[]>([]);
   const [recuperado, setRecuperado] = useState(false);
   const [verVestibular, setVerVestibular] = useState(false);
   const [erroEnvio, setErroEnvio] = useState<ErroEnvio | null>(null);
   const tipoTocado = useRef(false);
   const preenchidoDoCaso = useRef(false);
   const preenchidoPeloCpf = useRef({ nome: "", celular: "", email: "" });

   const [cpf, tipo, subtipo, cursoId, turno, modalidade, optInWhatsapp, estudouFora] = useWatch({
      control,
      name: ["cpf", "tipo", "subtipo", "cursoId", "turno", "modalidade", "optInWhatsapp", "estudouForaNoPeriodo"],
   });
   const cpfOk = cpfValido(cpf);
   const cpfInvalidoAgora = cpf.length === 11 && !cpfOk;

   const cursos = useCursos();
   const lookup = useLookupPessoa(open ? cpf : "");
   const dadosCpf = cpfOk ? lookup.data : undefined;
   const casoOrigem = useCaso(open ? deCasoId : null);
   const criar = useCriarProtocolo();

   const curso = cursos.data?.find(c => c.id === cursoId);
   const duplicado = casoDuplicado(dadosCpf, cursoId);
   const outros = outrosCasosAtivos(dadosCpf, cursoId);
   const sugestao = dadosCpf ? sugerirTipo(dadosCpf) : null;

   // Ao abrir: continua o rascunho (do mesmo "de caso") ou começa limpo. O aviso é estado de tela
   // (ajustado no render, quando `open` muda); os valores vão para o formulário no efeito.
   const [abertoVisto, setAbertoVisto] = useState(false);
   if (open !== abertoVisto) {
      setAbertoVisto(open);
      if (open) {
         setRecuperado(rascunhoAplicavel(deCasoId) !== null);
         setErroEnvio(null);
      }
   }
   useEffect(() => {
      if (!open) return;
      const valores = rascunhoAplicavel(deCasoId);
      form.reset({ ...FORM_VAZIO, ...(valores ?? {}) });
      tipoTocado.current = valores !== null;
      preenchidoDoCaso.current = valores !== null;
   }, [open, deCasoId, form]);

   // Rascunho automático: cada mudança vai para o sessionStorage.
   useEffect(() => {
      if (!open) return;
      return form.subscribe({
         formState: { values: true },
         callback: ({ values }) => {
            if (rascunhoTemConteudo(values)) salvarRascunho(values, deCasoId);
            else if (useRascunhoProtocoloStore.getState().valores) descartarRascunho();
         },
      });
   }, [open, deCasoId, form, salvarRascunho, descartarRascunho]);

   // "Nova análise para este candidato": tudo menos o CPF.
   useEffect(() => {
      const c: CasoDetalhe | undefined = casoOrigem.data;
      if (!open || !c || preenchidoDoCaso.current) return;
      preenchidoDoCaso.current = true;
      tipoTocado.current = true;
      setValue("nome", c.candidato.nome);
      const cel = contatoLimpo(c.candidato.celular);
      if (cel) setValue("celular", somenteDigitos(cel, 11));
      setValue("email", contatoLimpo(c.candidato.email) ?? "");
      setValue("optInWhatsapp", c.candidato.optInWhatsapp);
      setValue("tipo", c.tipo);
      setValue("subtipo", c.tipo === "RETORNO" ? c.subtipo : null);
      setValue("estudouForaNoPeriodo", c.origem.estudouForaNoPeriodo);
      setValue("iesNome", c.origem.iesNome ?? "");
      setValue("cursoOrigemNome", c.origem.cursoNome ?? "");
   }, [open, casoOrigem.data, setValue]);

   // Lookup do CPF: preenche o que estiver vazio (ou que veio de um CPF anterior) e sugere o tipo.
   useEffect(() => {
      if (!dadosCpf) return;
      const p = dadosCpf.pessoa;
      if (p) {
         const novos = { nome: p.nome, celular: somenteDigitos(p.celular ?? "", 11), email: p.email ?? "" };
         for (const campo of ["nome", "celular", "email"] as const) {
            const atual = getValues(campo);
            if (novos[campo] && (!atual || atual === preenchidoPeloCpf.current[campo])) {
               setValue(campo, novos[campo], { shouldDirty: true });
               preenchidoPeloCpf.current[campo] = novos[campo];
            }
         }
      }
      const s = sugerirTipo(dadosCpf);
      if (s && !tipoTocado.current) escolherTipo(s.tipo, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps -- reage só a um novo resultado de lookup
   }, [dadosCpf]);

   function escolherTipo(t: Tipo, peloUsuario = true) {
      if (peloUsuario) tipoTocado.current = true;
      setValue("tipo", t, { shouldValidate: formState.isSubmitted });
      if (!mostraSubtipo(t)) {
         setValue("subtipo", null);
         setValue("estudouForaNoPeriodo", null);
      }
   }

   function escolherSubtipo(s: NovoProtocoloForm["subtipo"]) {
      setValue("subtipo", s, { shouldValidate: formState.isSubmitted });
      setValue("estudouForaNoPeriodo", mostraEstudouFora("RETORNO", s) ? (getValues("estudouForaNoPeriodo") ?? false) : null);
   }

   function escolherCurso(id: string) {
      setValue("cursoId", id, { shouldValidate: formState.isSubmitted });
      const ajuste = ajustarDestino(
         cursos.data?.find(c => c.id === id),
         getValues("turno"),
         getValues("modalidade"),
      );
      setValue("turno", ajuste.turno);
      setValue("modalidade", ajuste.modalidade);
   }

   function descartar() {
      descartarRascunho();
      form.reset(FORM_VAZIO);
      setArquivos([]);
      setRecuperado(false);
      setErroEnvio(null);
      tipoTocado.current = false;
      preenchidoDoCaso.current = false;
      preenchidoPeloCpf.current = { nome: "", celular: "", email: "" };
   }

   const enviar = form.handleSubmit(v => {
      if (duplicado) return;
      const destino = cursos.data?.find(c => c.id === v.cursoId);
      if (!destino) {
         form.setError("cursoId", { message: "Escolha o curso de destino" });
         return;
      }
      setErroEnvio(null);
      criar.mutate(
         { protocolo: montarNovoProtocolo(v, destino), arquivos },
         {
            onSuccess: ({ caso, falhas }) => {
               notificar({ titulo: "Protocolo aberto", detalhe: `${caso.protocolo} · ${caso.candidato.nome}` });
               if (falhas.length > 0) {
                  notificar({
                     tom: "warn",
                     titulo: "Protocolo aberto, mas faltou anexar",
                     detalhe: `${resumoFalhasUpload(falhas)} Anexe pela aba Documentos.`,
                     duracao: 8000,
                  });
               }
               descartar();
               onCriado(caso.id);
            },
            onError: error => {
               const e = lerErroApi(error);
               if (e.status === 409 || e.status === 422) {
                  setErroEnvio({
                     mensagem: e.message,
                     casoId: e.status === 409 ? (casoDuplicado(lookup.data, v.cursoId)?.id ?? null) : null,
                  });
                  if (e.status === 409) void lookup.refetch();
                  return;
               }
               avisarErro(error, "Não foi possível abrir o protocolo");
            },
         },
      );
   });

   // Enter num campo não envia: confirmar é sempre o botão (docs/05 §4, nada de envio acidental).
   function segurarEnter(e: KeyboardEvent<HTMLFormElement>) {
      if (e.key === "Enter" && e.target instanceof HTMLInputElement) e.preventDefault();
   }

   const bloqueio = duplicado
      ? `Já existe um caso ativo deste candidato para ${duplicado.destino.cursoNome}. Abra o caso existente.`
      : null;
   const aviso = oQueVaiAcontecer({ tipo, subtipo, estudouForaNoPeriodo: estudouFora, optInWhatsapp });
   const erros = formState.errors;

   return (
      <Drawer
         open={open}
         onOpenChange={onOpenChange}
         title="Novo protocolo"
         description="Comece pelo CPF: o que já sabemos da pessoa aparece sozinho."
         icon={FilePlus2}
         width="lg"
         footer={
            <>
               <p
                  className={cn(
                     "mr-auto min-w-0 flex-1 basis-64 text-[11.5px] leading-relaxed",
                     bloqueio ? "font-medium text-crit-ink" : "text-ink-3",
                  )}
               >
                  {bloqueio ?? aviso}
               </p>
               <Button variant="ghost" onClick={() => onOpenChange(false)}>
                  Fechar
               </Button>
               <Button variant="primary" type="submit" form={FORM_ID} disabled={!!duplicado || criar.isPending}>
                  {criar.isPending ? "Abrindo…" : "Abrir protocolo"}
               </Button>
            </>
         }
      >
         <form id={FORM_ID} onSubmit={enviar} onKeyDown={segurarEnter} noValidate className="space-y-7 p-5">
            {recuperado ? (
               <Notice
                  tone="info"
                  title="Continuando o rascunho"
                  action={
                     <Button variant="ghost" size="xs" icon={<RotateCcw />} onClick={descartar}>
                        Descartar rascunho
                     </Button>
                  }
               >
                  Os campos voltaram como estavam. Arquivos anexados não ficam no rascunho.
               </Notice>
            ) : null}

            {/* 1. Candidato */}
            <section className="space-y-4" aria-labelledby="np-candidato">
               <SectionLabel as="h3">
                  <span id="np-candidato">Candidato</span>
               </SectionLabel>
               {deCasoId && !cpfOk ? (
                  <Notice tone="info" icon={UserRoundSearch} title="Confirme o CPF do candidato">
                     O CPF não é copiado do caso
                     {casoOrigem.data ? ` ${casoOrigem.data.protocolo} (${casoOrigem.data.candidato.cpfMascarado})` : ""}. Digite para
                     conferir e buscar o cadastro.
                  </Notice>
               ) : null}
               <Controller
                  control={control}
                  name="cpf"
                  render={({ field }) => (
                     <Field
                        label="CPF"
                        required
                        error={cpfInvalidoAgora ? "CPF inválido. Confira os 11 dígitos." : erros.cpf?.message}
                        help={
                           !cpfOk
                              ? "Só números. Com 11 dígitos buscamos o cadastro."
                              : lookup.isFetching
                                ? "Buscando cadastro…"
                                : lookup.isError
                                  ? "Não foi possível buscar o cadastro agora. Preencha os dados à mão."
                                  : dadosCpf?.encontrada
                                    ? "Cadastro encontrado: conferimos nome, celular e e-mail."
                                    : "Sem cadastro na UniAnchieta: preencha os dados abaixo."
                        }
                     >
                        {props => (
                           <Input
                              {...props}
                              data-autofocus
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="000.000.000-00"
                              className="max-w-56 font-mono"
                              value={mascaraCpf(field.value)}
                              onChange={e => field.onChange(somenteDigitos(e.target.value, 11))}
                              onBlur={field.onBlur}
                              ref={field.ref}
                           />
                        )}
                     </Field>
                  )}
               />

               {duplicado ? (
                  <Notice
                     tone="crit"
                     icon={TriangleAlert}
                     title="Já existe um caso ativo para este curso"
                     action={
                        <Button size="xs" onClick={() => onAbrirCaso(duplicado.id)}>
                           Abrir caso existente
                        </Button>
                     }
                  >
                     {duplicado.protocolo} · {ROTULO_TIPO_COMPLETO[duplicado.tipo]} · {ROTULO_ETAPA[duplicado.etapa]}. Um candidato não pode
                     ter dois casos ativos no mesmo curso.
                  </Notice>
               ) : null}
               {outros.length > 0 ? (
                  <Notice tone="info" title={`Também tem ${plural(outros.length, "caso ativo", "casos ativos")}`}>
                     {lista(outros.map(o => `${o.destino.cursoNome} (${ROTULO_ETAPA[o.etapa].toLowerCase()})`))}. Não impede este protocolo.
                  </Notice>
               ) : null}
               {sugestao ? (
                  <Notice tone="info" icon={SearchCheck} title="Vínculo encontrado">
                     {sugestao.porque}
                  </Notice>
               ) : null}

               <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo" required error={erros.nome?.message} className="sm:col-span-2">
                     {props => <Input {...props} autoComplete="off" {...form.register("nome")} />}
                  </Field>
                  <Controller
                     control={control}
                     name="celular"
                     render={({ field }) => (
                        <Field label="Celular com DDD" required error={erros.celular?.message}>
                           {props => (
                              <Input
                                 {...props}
                                 inputMode="tel"
                                 autoComplete="off"
                                 placeholder="(00) 00000-0000"
                                 className="font-mono"
                                 value={mascaraCelular(field.value)}
                                 onChange={e => field.onChange(somenteDigitos(e.target.value, 11))}
                                 onBlur={field.onBlur}
                                 ref={field.ref}
                              />
                           )}
                        </Field>
                     )}
                  />
                  <Field label="E-mail" hint="opcional" error={erros.email?.message}>
                     {props => <Input {...props} type="email" autoComplete="off" {...form.register("email")} />}
                  </Field>
               </div>

               <Controller
                  control={control}
                  name="optInWhatsapp"
                  render={({ field }) => (
                     <SwitchRow
                        label="Pode receber mensagens pelo WhatsApp"
                        description={
                           field.value
                              ? "O candidato recebe a lista de documentos, os lembretes e a proposta pelo WhatsApp."
                              : "Nenhuma mensagem automática sai: documentos e proposta dependem de contato manual. A proposta também não pode ser enviada pelo sistema."
                        }
                        checked={field.value}
                        onCheckedChange={field.onChange}
                     />
                  )}
               />

               {dadosCpf?.dadosVestibular ? (
                  <div>
                     <motion.button
                        type="button"
                        whileTap={press}
                        aria-expanded={verVestibular}
                        onClick={() => setVerVestibular(v => !v)}
                        className="flex items-center gap-1.5 text-[12px] font-medium text-ink-3 transition-colors hover:text-ink"
                     >
                        <ChevronDown className={cn("size-3.5 transition-transform", !verVestibular && "-rotate-90")} aria-hidden />
                        Dados do vestibular
                     </motion.button>
                     <AnimatePresence initial={false}>
                        {verVestibular ? (
                           <motion.div
                              variants={collapseVariants}
                              initial="initial"
                              animate="animate"
                              exit="exit"
                              className="overflow-hidden"
                           >
                              <DataList
                                 className="mt-3"
                                 columns={2}
                                 items={Object.entries(dadosCpf.dadosVestibular).map(([label, value]) => ({
                                    label,
                                    value: value === null || value === undefined ? null : String(value),
                                 }))}
                              />
                           </motion.div>
                        ) : null}
                     </AnimatePresence>
                  </div>
               ) : null}
            </section>

            {/* 2. Solicitação */}
            <section className="space-y-4" aria-labelledby="np-solicitacao">
               <SectionLabel as="h3">
                  <span id="np-solicitacao">Solicitação</span>
               </SectionLabel>
               <Field
                  label="Tipo"
                  required
                  error={erros.tipo?.message}
                  help={
                     sugestao && sugestao.tipo !== tipo
                        ? `O cadastro sugere ${ROTULO_TIPO_COMPLETO[sugestao.tipo].toLowerCase()}.`
                        : undefined
                  }
               >
                  {() => (
                     <SegmentedControl
                        options={OPCOES_TIPO}
                        value={tipo}
                        onChange={t => escolherTipo(t)}
                        layoutId="novo-protocolo-tipo"
                        ariaLabel="Tipo de solicitação"
                        full
                     />
                  )}
               </Field>

               {mostraSubtipo(tipo) ? (
                  <Field label="Retorno" required error={erros.subtipo?.message}>
                     {() => (
                        <SegmentedControl
                           options={OPCOES_SUBTIPO}
                           value={subtipo}
                           onChange={escolherSubtipo}
                           layoutId="novo-protocolo-subtipo"
                           ariaLabel="Subtipo do retorno"
                           full
                        />
                     )}
                  </Field>
               ) : null}
               {mostraEstudouFora(tipo, subtipo) ? (
                  <SwitchRow
                     label="Estudou em outra instituição nesse período?"
                     description={
                        estudouFora
                           ? "Vamos pedir o histórico da outra instituição ao candidato."
                           : "A análise usa só o histórico interno: começa sem pedir documentos."
                     }
                     checked={estudouFora === true}
                     onCheckedChange={v => setValue("estudouForaNoPeriodo", v)}
                  />
               ) : null}

               <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                     label="Curso de destino"
                     required
                     error={
                        erros.cursoId?.message ??
                        (cursos.isError ? "Não foi possível carregar os cursos. Feche e abra de novo." : undefined)
                     }
                     className="sm:col-span-3"
                  >
                     {props => (
                        <Select {...props} value={cursoId} onChange={e => escolherCurso(e.target.value)} disabled={!cursos.data}>
                           <option value="">{cursos.data ? "Escolha o curso" : "Carregando cursos…"}</option>
                           {(cursos.data ?? []).map(c => (
                              <option key={c.id} value={c.id}>
                                 {c.nome}
                              </option>
                           ))}
                        </Select>
                     )}
                  </Field>
                  <Field label="Turno" required error={erros.turno?.message}>
                     {props => (
                        <Select
                           {...props}
                           value={turno ?? ""}
                           disabled={!curso}
                           onChange={e =>
                              setValue("turno", (e.target.value || null) as NovoProtocoloForm["turno"], {
                                 shouldValidate: formState.isSubmitted,
                              })
                           }
                        >
                           <option value="">{curso ? "Escolha" : "Escolha o curso antes"}</option>
                           {(curso?.turnos ?? []).map(t => (
                              <option key={t} value={t}>
                                 {ROTULO_TURNO[t]}
                              </option>
                           ))}
                        </Select>
                     )}
                  </Field>
                  <Field label="Modalidade" required error={erros.modalidade?.message} className="sm:col-span-2">
                     {props => (
                        <Select
                           {...props}
                           value={modalidade ?? ""}
                           disabled={!curso}
                           onChange={e =>
                              setValue("modalidade", (e.target.value || null) as NovoProtocoloForm["modalidade"], {
                                 shouldValidate: formState.isSubmitted,
                              })
                           }
                        >
                           <option value="">{curso ? "Escolha" : "Escolha o curso antes"}</option>
                           {(curso?.modalidades ?? []).map(m => (
                              <option key={m} value={m}>
                                 {ROTULO_MODALIDADE[m]}
                              </option>
                           ))}
                        </Select>
                     )}
                  </Field>
               </div>

               {mostraOrigem(tipo) ? (
                  <div className="grid gap-4 sm:grid-cols-2">
                     <Controller
                        control={control}
                        name="iesNome"
                        render={({ field }) => (
                           <Field label="Instituição de origem" required error={erros.iesNome?.message}>
                              {props => (
                                 <CampoIes
                                    id={props.id}
                                    invalido={props["aria-invalid"]}
                                    describedBy={props["aria-describedby"]}
                                    valor={field.value}
                                    onChange={(nome, iesId) => {
                                       field.onChange(nome);
                                       setValue("iesId", iesId);
                                    }}
                                 />
                              )}
                           </Field>
                        )}
                     />
                     <Field label="Curso de origem" hint="opcional">
                        {props => <Input {...props} autoComplete="off" {...form.register("cursoOrigemNome")} />}
                     </Field>
                  </div>
               ) : null}
            </section>

            {/* 3. Documentos */}
            <section className="space-y-3" aria-labelledby="np-documentos">
               <SectionLabel as="h3" action={<span className="text-[11px] text-ink-4">opcional</span>}>
                  <span id="np-documentos">Documentos já recebidos</span>
               </SectionLabel>
               <p className="text-[12px] leading-relaxed text-ink-3">
                  Só se o candidato já mandou para você. O resto ele envia pelo WhatsApp.
               </p>
               <DocumentosIniciais arquivos={arquivos} onChange={setArquivos} />
            </section>

            {erroEnvio ? (
               <Notice
                  tone="crit"
                  title="O protocolo não foi aberto"
                  action={
                     erroEnvio.casoId ? (
                        <Button size="xs" onClick={() => erroEnvio.casoId && onAbrirCaso(erroEnvio.casoId)}>
                           Abrir caso existente
                        </Button>
                     ) : null
                  }
               >
                  {erroEnvio.mensagem}
               </Notice>
            ) : null}
         </form>
      </Drawer>
   );
}
