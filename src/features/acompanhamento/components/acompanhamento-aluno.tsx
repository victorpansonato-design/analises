/**
 * Página do aluno: acompanha o pedido do protocolo à matrícula, sem login. Uma coluna estreita, porque
 * o link chega pelo WhatsApp e é aberto no celular. Serve à rota pública e à prévia da equipe.
 *
 * Ordem de leitura: quem é e qual sonho (topo azul) → o que fazer agora (se for a vez do aluno) →
 * andamento → ajuda. Depois da matrícula, o topo vira comemoração e entram RA, senha e app.
 */
import {
   Check,
   ChevronLeft,
   ChevronRight,
   Clock,
   Copy,
   GraduationCap,
   KeyRound,
   LinkIcon,
   PartyPopper,
   RotateCcw,
   Smartphone,
   X,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState, type ReactNode } from "react";

import logoAnchieta from "@/assets/images/grupo-anchieta.png";
import { EmptyPanel } from "@/components/core/empty-panel";
import { AsyncState } from "@/components/ui/async-state";
import { Skeleton } from "@/components/ui/skeleton";
import { env } from "@/config/env";
import { useAgora } from "@/hooks/use-agora";
import { fullDate, stamp, time } from "@/lib/format";
import { emphasis, press } from "@/lib/motion";
import { notificar } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { lerErroApi } from "@/services/api-erro";

import { ROTULO_MODALIDADE, ROTULO_TIPO_COMPLETO, ROTULO_TURNO } from "@/features/casos";

import { useAcompanhamento } from "@/features/acompanhamento/api/acompanhamento.queries";
import { IconeWhatsapp } from "@/features/acompanhamento/components/icone-whatsapp";
import { CONTATO_ALUNO, linkWhatsapp } from "@/features/acompanhamento/domain/acompanhamento";
import { momentoReal, momentosSimulados } from "@/features/acompanhamento/domain/simulacao";
import { rotuloSituacao, saudacao, textoDoPasso, tituloDoPasso } from "@/features/acompanhamento/domain/textos";
import type { AcompanhamentoPublico, EstadoPasso } from "@/features/acompanhamento/types/acompanhamento.schema";

interface AcompanhamentoAlunoProps {
   token: string;
   /** Dentro da prévia da equipe: sem altura mínima de tela. */
   embutido?: boolean;
}

export function AcompanhamentoAluno({ token, embutido = false }: AcompanhamentoAlunoProps) {
   const consulta = useAcompanhamento(token);
   const naoEncontrado = lerErroApi(consulta.error).status === 404;
   const sim = useSimulacao(consulta.data);
   const dados = sim.dados;
   return (
      <div className={cn("acompanhamento flex flex-col bg-workspace text-ink", embutido ? "min-h-full" : "min-h-dvh")}>
         <div className="mx-auto flex w-full max-w-150 flex-col gap-4 px-4 pt-5 pb-6">
            <header className="flex items-center justify-between gap-3 pb-1">
               <img src={logoAnchieta} alt="Grupo Anchieta" width={385} height={137} className="logo-acompanhamento h-10 w-auto" />
               <span className="text-right text-[12px] text-ink-3">Acompanhamento da sua matrícula</span>
            </header>
            <AsyncState
               isLoading={consulta.isLoading}
               isError={consulta.isError}
               loading={<Esqueleto />}
               error={
                  <section className="rounded-2xl bg-card">
                     <EmptyPanel
                        icon={LinkIcon}
                        tone={naoEncontrado ? "plain" : "crit"}
                        title={naoEncontrado ? "Não encontramos este acompanhamento" : "Não conseguimos carregar agora"}
                        message={
                           naoEncontrado
                              ? "Confira se o link está completo. Se precisar, peça um novo pelo WhatsApp."
                              : "Verifique sua conexão e tente de novo em instantes."
                        }
                        action={<BotaoWhatsapp />}
                     />
                  </section>
               }
            >
               {dados ? <Conteudo dados={dados} /> : null}
            </AsyncState>
         </div>
         {dados ? (
            <WhatsappFlutuante protocolo={dados.protocolo} simulacao={env.useMocks ? <ControleSimulacao sim={sim} /> : undefined} />
         ) : null}
      </div>
   );
}

// ── Simulação (só com dados simulados) ─────────────────────────────────────────────────────────

/**
 * Avançar e voltar as etapas só na tela, para ver como o aluno acompanha o processo inteiro. Estado
 * local: não chama a API e não muda nada na análise. `null` = mostrando o caso real.
 */
function useSimulacao(real: AcompanhamentoPublico | undefined) {
   const [momento, setMomento] = useState<number | null>(null);
   const [agora] = useState(() => new Date().toISOString());
   const momentos = useMemo(() => (real ? momentosSimulados(real, agora) : []), [real, agora]);
   const base = real ? momentoReal(real, momentos) : 0;
   const atual = momento ?? base;
   const ir = (delta: number) => setMomento(Math.min(momentos.length - 1, Math.max(0, atual + delta)));
   return {
      dados: momento === null ? real : momentos[momento],
      simulando: momento !== null,
      podeVoltar: atual > 0,
      podeAvancar: atual < momentos.length - 1,
      avancar: () => ir(1),
      voltar: () => ir(-1),
      restaurar: () => setMomento(null),
   };
}

function ControleSimulacao({ sim }: { sim: ReturnType<typeof useSimulacao> }) {
   const botao =
      "inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-[12px] font-medium transition-colors hover:bg-white/15 disabled:opacity-35 disabled:hover:bg-transparent";
   return (
      <div
         role="group"
         aria-label="Simulação: muda só a tela, nada na análise"
         title="Simulação: muda só a tela, nada na análise"
         className="controle-simulacao pointer-events-auto flex items-center gap-0.5 rounded-full p-1 pl-3"
      >
         <span className="mr-1 text-[11px] opacity-70">{sim.simulando ? "Simulando" : "Simular"}</span>
         <motion.button
            type="button"
            whileTap={press}
            className={botao}
            disabled={!sim.podeVoltar}
            onClick={sim.voltar}
            aria-label="Voltar etapa"
         >
            <ChevronLeft aria-hidden className="size-4" />
         </motion.button>
         <motion.button type="button" whileTap={press} className={botao} disabled={!sim.podeAvancar} onClick={sim.avancar}>
            Avançar etapa
            <ChevronRight aria-hidden className="size-4" />
         </motion.button>
         {sim.simulando ? (
            <motion.button type="button" whileTap={press} className={botao} onClick={sim.restaurar} aria-label="Voltar ao andamento real">
               <RotateCcw aria-hidden className="size-3.5" />
            </motion.button>
         ) : null}
      </div>
   );
}

function Esqueleto() {
   return (
      <div aria-label="Carregando o acompanhamento" className="flex flex-col gap-4">
         <Skeleton className="h-64 w-full rounded-2xl" />
         <Skeleton className="h-80 w-full rounded-2xl" />
      </div>
   );
}

function Conteudo({ dados }: { dados: AcompanhamentoPublico }) {
   const agora = useAgora();
   const matriculado = dados.situacao === "MATRICULADO";
   return (
      <div className="flex flex-col gap-4">
         <Topo dados={dados} />
         {matriculado ? <DadosDeAcesso dados={dados} /> : null}
         {matriculado ? <BaixarApp /> : null}
         {dados.aguardandoAluno ? <SuaVez dados={dados} /> : null}
         {dados.situacao === "PAUSADO" ? (
            <Aviso titulo="Sua solicitação está pausada">
               Combinamos de retomar mais adiante. Se quiser adiantar ou mudou de ideia, é só chamar a gente no WhatsApp.
            </Aviso>
         ) : null}
         <Andamento dados={dados} />
         <Ajuda protocolo={dados.protocolo} />
         <footer className="px-1 pt-1 text-[12px] leading-relaxed text-ink-4">
            <p>Última atualização: {stamp(dados.atualizadoEm, agora)}. A página se atualiza sozinha.</p>
            <p className="mt-2">
               Este link é pessoal: não compartilhe. Para corrigir dados ou tirar dúvidas, fale com a nossa equipe informando o protocolo{" "}
               <span className="font-mono text-ink-3">{dados.protocolo}</span>.
            </p>
         </footer>
      </div>
   );
}

// ── Topo ───────────────────────────────────────────────────────────────────────────────────────

function Topo({ dados }: { dados: AcompanhamentoPublico }) {
   const { titulo, texto } = saudacao(dados);
   const total = dados.passos.length;
   const feitos = dados.passos.filter(p => p.estado === "FEITO").length;
   const final = dados.situacao === "MATRICULADO" || dados.situacao === "CONCLUIDO";
   const passoAtual = Math.min(total, feitos + 1);
   const progresso = final ? 1 : (feitos + 0.5) / total;
   const c = dados.curso;
   return (
      <section aria-labelledby="acompanhamento-titulo" className="topo-aluno relative overflow-hidden rounded-2xl p-6">
         {final ? <Confete /> : null}
         <p className="relative flex flex-wrap items-center justify-between gap-2 text-[12px] text-white/80">
            <span>{ROTULO_TIPO_COMPLETO[dados.tipo]}</span>
            <span>
               Protocolo <span className="font-mono text-white">{dados.protocolo}</span>
            </span>
         </p>
         {dados.situacao === "MATRICULADO" ? (
            <motion.p
               initial={{ opacity: 0, y: 6 }}
               animate={{ opacity: 1, y: 0 }}
               transition={{ duration: 0.5, ease: emphasis, delay: 0.2 }}
               className="selo-boas-vindas relative mt-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold"
            >
               <PartyPopper aria-hidden className="size-3.5" />
               Boas-vindas à UniAnchieta
            </motion.p>
         ) : null}
         <h1 id="acompanhamento-titulo" className="relative mt-4 text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] text-white">
            {titulo}
         </h1>
         <p className="relative mt-2 text-[14px] leading-relaxed text-white/85">{texto}</p>

         <div className="relative mt-5 flex items-center gap-3 rounded-xl bg-white/12 p-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-white/15">
               <GraduationCap aria-hidden className="size-5 text-white" />
            </span>
            <div className="min-w-0">
               <p className="truncate text-[15px] font-medium text-white">{c.nome}</p>
               <p className="mt-0.5 text-[12px] text-white/75">
                  {ROTULO_MODALIDADE[c.modalidade]}
                  {c.modalidade === "PRESENCIAL" ? ` ${ROTULO_TURNO[c.turno].toLowerCase()}` : ""} · Ingresso em {c.ciclo}
               </p>
            </div>
         </div>

         <div className="relative mt-5">
            <div className="flex items-baseline justify-between text-[12px] text-white/80">
               <span>{final ? "Tudo pronto" : `Passo ${passoAtual} de ${total}`}</span>
               <span className="font-medium text-white">{rotuloSituacao(dados)}</span>
            </div>
            <div
               className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20"
               role="progressbar"
               aria-label="Andamento do pedido"
               aria-valuemin={0}
               aria-valuemax={total}
               aria-valuenow={final ? total : feitos}
            >
               <motion.div
                  className="barra-assinatura h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round(progresso * 100)}%` }}
                  transition={{ duration: 0.9, ease: emphasis, delay: 0.15 }}
               />
            </div>
         </div>
      </section>
   );
}

/** Comemoração discreta: alguns pontos que caem uma vez (respeita "reduzir movimento"). */
const PECAS = [
   [8, 0.1, "a"],
   [18, 0.35, "b"],
   [29, 0.05, "c"],
   [41, 0.25, "a"],
   [53, 0.45, "b"],
   [64, 0.15, "c"],
   [74, 0.3, "a"],
   [85, 0.05, "b"],
   [93, 0.4, "c"],
] as const;

function Confete() {
   return (
      <div aria-hidden className="pointer-events-none absolute inset-0">
         {PECAS.map(([x, atraso, tom], i) => (
            <motion.span
               key={i}
               className={cn("confete absolute top-0 block rounded-[2px]", `confete-${tom}`)}
               style={{ left: `${x}%`, width: i % 2 ? 6 : 8, height: i % 2 ? 10 : 6 }}
               initial={{ y: -16, opacity: 0, rotate: 0 }}
               animate={{ y: [-16, 40 + (i % 3) * 22], opacity: [0, 1, 0.9, 0], rotate: i % 2 ? 160 : -120 }}
               transition={{ duration: 2.4, delay: 0.3 + atraso, ease: "easeOut" }}
            />
         ))}
      </div>
   );
}

// ── Depois da matrícula ────────────────────────────────────────────────────────────────────────

function DadosDeAcesso({ dados }: { dados: AcompanhamentoPublico }) {
   const copiarRa = async () => {
      if (!dados.ra) return;
      try {
         await navigator.clipboard.writeText(dados.ra);
         notificar({ titulo: "RA copiado" });
      } catch {
         notificar({ tom: "warn", titulo: "Não foi possível copiar", detalhe: "Selecione o número e copie manualmente." });
      }
   };
   return (
      <section aria-labelledby="acesso-titulo" className="rounded-2xl bg-card p-5">
         <h2 id="acesso-titulo" className="text-[16px] font-semibold text-ink">
            Seus dados de acesso
         </h2>
         <p className="mt-1 text-[13px] text-ink-3">Use para entrar no app e no portal do aluno.</p>
         <dl className="mt-4 grid gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-2 px-4 py-3">
               <div className="min-w-0">
                  <dt className="text-[12px] text-ink-3">RA (seu número de aluno)</dt>
                  <dd className="mt-0.5 font-mono text-[20px] tracking-[0.02em] text-ink">{dados.ra ?? "Em geração"}</dd>
               </div>
               {dados.ra ? (
                  <motion.button
                     type="button"
                     whileTap={press}
                     onClick={() => void copiarRa()}
                     className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-card px-3.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-3"
                  >
                     <Copy aria-hidden className="size-3.5" />
                     Copiar
                  </motion.button>
               ) : null}
            </div>
            <div className="flex items-start gap-3 rounded-xl bg-surface-2 px-4 py-3">
               <KeyRound aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-3" />
               <div className="min-w-0">
                  <dt className="text-[12px] text-ink-3">Senha inicial</dt>
                  <dd className="mt-0.5 text-[14px] font-medium text-ink">Seu CPF, só os números (sem pontos nem traço)</dd>
                  <dd className="mt-1 text-[12px] leading-relaxed text-ink-3">
                     {dados.tipo === "TRANSFERENCIA_INTERNA" || dados.tipo === "RETORNO"
                        ? "Se você já trocou a senha antes, continue usando a sua."
                        : "Troque a senha no primeiro acesso."}
                  </dd>
               </div>
            </div>
         </dl>
      </section>
   );
}

function BaixarApp() {
   return (
      <section aria-labelledby="app-titulo" className="flex items-start gap-4 rounded-2xl bg-card p-5">
         <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-text">
            <Smartphone aria-hidden className="size-6" />
         </span>
         <div className="min-w-0 flex-1">
            <h2 id="app-titulo" className="text-[15px] font-semibold text-ink">
               Baixe o app Grupo Anchieta
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">Sua vida acadêmica na palma da mão. Entre com seu RA e senha.</p>
            <motion.a
               whileTap={press}
               href={CONTATO_ALUNO.appGrupoAnchieta}
               target="_blank"
               rel="noopener noreferrer"
               className="mt-3 inline-flex h-9.5 items-center gap-2 rounded-full bg-brand px-4.5 text-[13px] font-medium text-on-brand transition-colors hover:bg-brand-hover"
            >
               Baixar na App Store
            </motion.a>
         </div>
      </section>
   );
}

// ── Durante o processo ─────────────────────────────────────────────────────────────────────────

function SuaVez({ dados }: { dados: AcompanhamentoPublico }) {
   const proposta = dados.passos.some(p => p.passo === "PROPOSTA" && p.estado === "ATUAL");
   return (
      <Aviso titulo={proposta ? "Sua proposta está esperando por você" : "Precisamos de você para seguir"}>
         {proposta
            ? "Enviamos a proposta pelo WhatsApp. Leia com calma e responda por lá: estamos prontos para tirar suas dúvidas."
            : "Faltam alguns documentos. Enviamos a lista pelo WhatsApp; assim que chegarem, seguimos com a análise."}
      </Aviso>
   );
}

function Aviso({ titulo, children }: { titulo: string; children: ReactNode }) {
   return (
      <section className="rounded-2xl bg-brand-soft p-5">
         <h2 className="text-[15px] font-semibold text-brand-text">{titulo}</h2>
         <p className="mt-1 text-[13px] leading-relaxed text-ink-2">{children}</p>
      </section>
   );
}

function Andamento({ dados }: { dados: AcompanhamentoPublico }) {
   return (
      <section aria-labelledby="andamento-titulo" className="rounded-2xl bg-card p-5">
         <div className="flex items-center justify-between gap-3">
            <h2 id="andamento-titulo" className="text-[16px] font-semibold text-ink">
               Andamento
            </h2>
            <span className="rounded-full bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand-text">{rotuloSituacao(dados)}</span>
         </div>
         <ol className="mt-5">
            {dados.passos.map((p, i) => {
               const ultimo = i === dados.passos.length - 1;
               return (
                  <li key={p.passo} className="relative flex gap-4 pb-6 last:pb-0">
                     {!ultimo ? (
                        <span
                           aria-hidden
                           className={cn(
                              "absolute top-8 bottom-1 left-3.25 w-0.5 rounded-full",
                              p.estado === "FEITO" ? "bg-success/60" : "bg-hairline-strong",
                           )}
                        />
                     ) : null}
                     <Marcador estado={p.estado} />
                     <div className="min-w-0 pt-0.5">
                        <p className={cn("text-[14px] font-medium", p.estado === "PROXIMO" ? "text-ink-3" : "text-ink")}>
                           {tituloDoPasso(p.passo, dados.tipo)}
                           <span className="sr-only">: {ROTULO_ESTADO[p.estado]}</span>
                        </p>
                        <p className={cn("mt-0.5 text-[13px] leading-relaxed", p.estado === "PROXIMO" ? "text-ink-4" : "text-ink-3")}>
                           {textoDoPasso(p.passo, p.estado, dados)}
                        </p>
                        {p.em ? (
                           <p className="mt-1 text-[12px] text-ink-4">
                              {p.estado === "ATUAL" ? "Desde " : ""}
                              {fullDate(p.em)}, {time(p.em)}
                           </p>
                        ) : null}
                     </div>
                  </li>
               );
            })}
         </ol>
      </section>
   );
}

const ROTULO_ESTADO: Record<EstadoPasso, string> = {
   FEITO: "concluído",
   ATUAL: "em andamento",
   PROXIMO: "próximo",
   INTERROMPIDO: "interrompido",
};

function Marcador({ estado }: { estado: EstadoPasso }) {
   if (estado === "FEITO")
      return (
         <span className="relative z-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
            <Check aria-hidden className="size-4" strokeWidth={2.5} />
         </span>
      );
   if (estado === "ATUAL")
      return (
         <span className="relative z-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-brand text-on-brand">
            <motion.span
               aria-hidden
               className="absolute inset-0 rounded-full bg-brand"
               animate={{ scale: [1, 1.55], opacity: [0.35, 0] }}
               transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
            />
            <Clock aria-hidden className="relative size-4" />
         </span>
      );
   if (estado === "INTERROMPIDO")
      return (
         <span className="relative z-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-3 text-ink-3">
            <X aria-hidden className="size-4" />
         </span>
      );
   return (
      <span className="relative z-1 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2">
         <span aria-hidden className="size-1.5 rounded-full bg-ink-4" />
      </span>
   );
}

// ── Ajuda (WhatsApp) ───────────────────────────────────────────────────────────────────────────

function Ajuda({ protocolo }: { protocolo: string }) {
   return (
      <section aria-labelledby="ajuda-titulo" className="flex items-start gap-4 rounded-2xl bg-card p-5">
         <span className="whatsapp-marca flex size-12 shrink-0 items-center justify-center rounded-full">
            <IconeWhatsapp className="size-6" />
         </span>
         <div className="min-w-0 flex-1">
            <h2 id="ajuda-titulo" className="text-[15px] font-semibold text-ink">
               Ficou com alguma dúvida?
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-3">
               Fale com a nossa equipe no WhatsApp <span className="whitespace-nowrap text-ink-2">{CONTATO_ALUNO.whatsappRotulo}</span>.
            </p>
            <BotaoWhatsapp protocolo={protocolo} className="mt-3" />
         </div>
      </section>
   );
}

function BotaoWhatsapp({ protocolo, className }: { protocolo?: string; className?: string }) {
   return (
      <motion.a
         whileTap={press}
         href={linkWhatsapp(protocolo)}
         target="_blank"
         rel="noopener noreferrer"
         className={cn(
            "whatsapp-botao inline-flex h-9.5 items-center gap-2 rounded-full px-4.5 text-[13px] font-medium transition-colors",
            className,
         )}
      >
         <IconeWhatsapp className="size-4" />
         Conversar no WhatsApp
      </motion.a>
   );
}

/** Sempre à mão: fica preso ao rodapé da área rolável (funciona na página e dentro da prévia). */
function WhatsappFlutuante({ protocolo, simulacao }: { protocolo: string; simulacao?: ReactNode }) {
   return (
      <div className="pointer-events-none sticky bottom-0 z-10 mx-auto mt-auto flex w-full max-w-150 items-end justify-between gap-3 px-4 pb-4">
         {simulacao ?? <span />}
         <motion.a
            whileTap={press}
            href={linkWhatsapp(protocolo)}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Tirar dúvidas no WhatsApp ${CONTATO_ALUNO.whatsappRotulo}`}
            className="whatsapp-flutuante pointer-events-auto flex size-14 items-center justify-center rounded-full"
         >
            <IconeWhatsapp className="size-7" />
         </motion.a>
      </div>
   );
}
