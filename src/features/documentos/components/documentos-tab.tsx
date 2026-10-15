/**
 * Aba Documentos (docs/05 §3.4). O checklist do tipo com o estado de cada item; o documento chega
 * por qualquer canal (WhatsApp, link, consultor, sistema interno) e a tela funciona igual.
 *
 * - Contagem com denominador ("5/6 obrigatórios"). Todo obrigatório aceito = o caso vai SOZINHO para
 *   a pré-análise; a aba avisa quando isso acontece por uma ação daqui.
 * - Recusar dispara a mensagem ao candidato automaticamente (modal mostra a prévia).
 * - Régua visível: quando sai o próximo lembrete automático (sem campo manual de "próximo contato").
 * - Nenhuma ação primária aqui: a primária do caso mora no card "Próximo passo".
 * - Ação desabilitada sempre com o motivo em texto.
 */
import { BellRing, Check, History, ShieldCheck } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { EmptyPanel } from "@/components/core/empty-panel";
import { Hint } from "@/components/core/hint";
import { MeterBar } from "@/components/core/meter-bar";
import { Surface, SurfaceHeader } from "@/components/core/surface";
import { Tag } from "@/components/core/tag";
import { AsyncState } from "@/components/ui/async-state";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAgora } from "@/hooks/use-agora";
import { int, lista, plural, stamp } from "@/lib/format";
import { notificar } from "@/lib/notify";

import {
   REGUA,
   ROTULO_TIPO_COMPLETO,
   acaoDoCaso,
   invalidarTudoDoCaso,
   proximoLembreteDocumentos,
   useLembrarDocumentos,
   type AcaoDisponivel,
   type CasoDetalhe,
} from "@/features/casos";
import { SEM_OPT_IN } from "@/features/comunicacao";

import {
   useAnexarDocumento,
   useAvaliarDocumento,
   useMigrarHistoricoInterno,
   useVisualizarArquivo,
} from "@/features/documentos/api/documentos.mutations";
import { useDocumentos } from "@/features/documentos/api/documentos.queries";
import { ItemDocumento, type PermissoesDocumento } from "@/features/documentos/components/item-documento";
import { ModalRecusa } from "@/features/documentos/components/modal-recusa";
import { VisualizadorDocumento } from "@/features/documentos/components/visualizador-documento";
import {
   ID_HISTORICO_INTERNO,
   contarChecklist,
   motivoArquivoInvalido,
   motivoNaoAvaliar,
   usaHistoricoInterno,
} from "@/features/documentos/domain/checklist";
import type { Arquivo, ItemChecklist, MotivoRecusa } from "@/features/documentos/types/documento.schema";

export interface DocumentosTabProps {
   caso: CasoDetalhe;
}

function estado(acao: AcaoDisponivel | null): { habilitada: boolean; motivo: string | null } | null {
   return acao ? { habilitada: acao.habilitada, motivo: acao.motivos[0] ?? null } : null;
}

/** Primeira ação (das que o perfil tem) habilitada; senão, a primeira com seu motivo. */
function qualquer(...acoes: (AcaoDisponivel | null)[]): { habilitada: boolean; motivo: string | null } | null {
   const existentes = acoes.filter((a): a is AcaoDisponivel => !!a);
   return estado(existentes.find(a => a.habilitada) ?? existentes[0] ?? null);
}

export function DocumentosTab({ caso }: DocumentosTabProps) {
   const queryClient = useQueryClient();
   const docs = useDocumentos(caso.id);
   const agora = useAgora();
   const avaliar = useAvaliarDocumento(caso);
   const anexar = useAnexarDocumento(caso);
   const migrar = useMigrarHistoricoInterno(caso);
   const visualizar = useVisualizarArquivo(caso.id);
   const lembrar = useLembrarDocumentos(caso.id);

   const [recusando, setRecusando] = useState<ItemChecklist | null>(null);
   const [aberto, setAberto] = useState<{ item: ItemChecklist; arquivo: Arquivo } | null>(null);

   // "Documentos completos": quando uma ação daqui fecha o checklist, o caso muda de etapa sozinho.
   const esperandoAvanco = useRef(false);
   const etapaVista = useRef(caso.etapa);
   useEffect(() => {
      if (etapaVista.current === caso.etapa) return;
      if (esperandoAvanco.current && caso.etapa === "PRE_ANALISE") {
         notificar({
            titulo: "Documentos completos. A pré-análise começou.",
            detalhe: "O candidato foi avisado pelo WhatsApp. A grade fica pronta em instantes.",
         });
      }
      esperandoAvanco.current = false;
      etapaVista.current = caso.etapa;
   }, [caso.etapa]);

   const itens = docs.data ?? [];
   const contagem = contarChecklist(itens);
   const acaoSolicitar = acaoDoCaso(caso, "SOLICITAR_DOCUMENTO");
   const acaoAvaliar = acaoDoCaso(caso, "AVALIAR_DOCUMENTO");
   const permissoes: PermissoesDocumento = {
      avaliar: estado(acaoAvaliar),
      anexar: qualquer(acaoSolicitar, acaoAvaliar),
      verIdentidade: acaoDoCaso(caso, "VER_DOCUMENTO_IDENTIDADE")?.habilitada ?? false,
   };
   const ocupado = avaliar.isPending || anexar.isPending || migrar.isPending;
   const emDocumentos = caso.etapa === "AGUARDANDO_DOCUMENTOS";
   const optIn = caso.candidato.optInWhatsapp;

   // Lembrar agora: motivo visível sempre que não der.
   const motivoLembrar = !acaoSolicitar
      ? "Seu perfil não envia lembretes ao candidato"
      : !acaoSolicitar.habilitada
        ? (acaoSolicitar.motivos[0] ?? "Lembrete indisponível neste caso")
        : !emDocumentos
          ? "Lembretes só valem na etapa Documentos"
          : contagem.faltando === 0
            ? "Não há documento obrigatório pendente para lembrar"
            : !optIn
              ? SEM_OPT_IN
              : null;

   const proximo = emDocumentos ? proximoLembreteDocumentos(caso.etapaDesde, agora) : null;
   const dias = lista(REGUA.documentos.lembretesDias.map(d => `D+${d}`));
   const regua = !emDocumentos
      ? null
      : contagem.faltando === 0
        ? "Nada pendente com o candidato: os lembretes automáticos param."
        : !optIn
          ? "Lembretes automáticos parados: o candidato não autorizou o WhatsApp."
          : proximo
            ? `Próximo lembrete automático: ${stamp(proximo, agora).replace(/^./, c => c.toLowerCase())}`
            : `Os lembretes automáticos (${dias}) terminaram. A partir de D+${REGUA.documentos.tarefaConsultorDia}, o consultor fala com o candidato.`;

   const historico = itens.find(i => i.id === ID_HISTORICO_INTERNO);
   const motivoMigrar = !permissoes.anexar
      ? "Seu perfil não migra o histórico"
      : !permissoes.anexar.habilitada
        ? permissoes.anexar.motivo
        : null;

   function avaliarItem(item: ItemChecklist, status: "ACEITO" | "DISPENSADO" | "RECUSADO", motivoRecusa?: MotivoRecusa, texto?: string) {
      avaliar.mutate(
         { checklistId: item.id, status, motivoRecusa, texto: texto || undefined },
         {
            onSuccess: () => {
               if (status !== "RECUSADO") esperandoAvanco.current = true;
               setRecusando(null);
               if (aberto?.item.id === item.id) setAberto(null);
               const titulo =
                  status === "ACEITO" ? "Documento aceito" : status === "DISPENSADO" ? "Documento dispensado" : "Documento recusado";
               const detalhe =
                  status === "RECUSADO"
                     ? optIn
                        ? "O candidato recebeu a mensagem com o motivo e a dica."
                        : "A mensagem não saiu: o candidato não autorizou o WhatsApp."
                     : item.nome;
               notificar({ titulo, detalhe });
            },
         },
      );
   }

   function anexarArquivo(item: ItemChecklist, arquivo: File) {
      const invalido = motivoArquivoInvalido(arquivo);
      if (invalido) {
         notificar({ tom: "warn", titulo: "Arquivo não anexado", detalhe: `${invalido}.` });
         return;
      }
      anexar.mutate(
         { checklistId: item.id, arquivo },
         { onSuccess: () => notificar({ titulo: "Arquivo anexado", detalhe: `${item.nome}: agora está a conferir.` }) },
      );
   }

   function abrir(item: ItemChecklist, arquivo: Arquivo) {
      setAberto({ item, arquivo });
      visualizar.mutate({ checklistId: item.id, arquivoId: arquivo.id });
   }

   const alvoAberto = aberto ? (itens.find(i => i.id === aberto.item.id) ?? aberto.item) : null;
   const acoesGaveta =
      aberto && alvoAberto && permissoes.avaliar?.habilitada ? (
         <>
            {!motivoNaoAvaliar(alvoAberto, "RECUSADO") ? (
               <Button variant="ghost" disabled={ocupado} onClick={() => setRecusando(alvoAberto)}>
                  Recusar
               </Button>
            ) : null}
            {!motivoNaoAvaliar(alvoAberto, "ACEITO") ? (
               <Button
                  variant="primary"
                  className="acao-destaque"
                  data-tom="liberadas"
                  icon={<Check />}
                  disabled={ocupado}
                  onClick={() => avaliarItem(alvoAberto, "ACEITO")}
               >
                  Aceitar documento
               </Button>
            ) : (
               <span className="text-[12px] text-ink-3">{motivoNaoAvaliar(alvoAberto, "ACEITO")}.</span>
            )}
         </>
      ) : undefined;

   return (
      <div className="space-y-4">
         <Surface>
            <SurfaceHeader
               title="Documentos"
               subtitle={`Checklist de ${ROTULO_TIPO_COMPLETO[caso.tipo].toLowerCase()}. Chega pelo WhatsApp, pelo link de envio ou anexado pela equipe.`}
               action={
                  caso.noGed ? (
                     <span className="inline-flex items-center gap-1">
                        <Tag className="gap-1">
                           <ShieldCheck className="size-3" aria-hidden />
                           Análise já no GED
                        </Tag>
                        <Hint label="o selo do GED" align="right">
                           Os documentos aceitos já foram arquivados no GED da instituição. A análise usa essas cópias.
                        </Hint>
                     </span>
                  ) : undefined
               }
            />
            {docs.data ? (
               <div className="mt-4 space-y-2">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                     <span className="text-[12px] text-ink-3">
                        <span className="font-mono text-[13px] font-medium text-ink">
                           {int(contagem.obrigatoriosOk)}/{int(contagem.obrigatorios)}
                        </span>{" "}
                        obrigatórios
                     </span>
                     {contagem.aConferir > 0 ? (
                        <span className="text-[12px] text-ink-3">
                           {plural(contagem.aConferir, "recebido a conferir", "recebidos a conferir")}
                        </span>
                     ) : null}
                     {contagem.faltando > 0 ? (
                        <span className="text-[12px] text-ink-3">
                           {plural(contagem.faltando, "faltando com o candidato", "faltando com o candidato")}
                        </span>
                     ) : null}
                  </div>
                  <MeterBar
                     value={contagem.obrigatorios ? contagem.obrigatoriosOk / contagem.obrigatorios : 1}
                     tone={contagem.completo ? "ink" : "brand"}
                     label={`${contagem.obrigatoriosOk} de ${contagem.obrigatorios} obrigatórios`}
                  />
               </div>
            ) : null}

            {emDocumentos || acaoSolicitar ? (
               <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline pt-4">
                  <div className="min-w-0">
                     {regua ? <p className="text-[12.5px] text-ink-2">{regua}</p> : null}
                     {motivoLembrar ? <p className="text-[11.5px] text-ink-4">Lembrar agora indisponível. {motivoLembrar}.</p> : null}
                  </div>
                  <Button
                     className="acao-destaque"
                     data-tom="liberadas"
                     icon={<BellRing />}
                     disabled={!!motivoLembrar || lembrar.isPending}
                     onClick={() =>
                        lembrar.mutate(undefined, {
                           onSuccess: () =>
                              notificar({
                                 titulo: "Lembrete enviado pelo WhatsApp",
                                 detalhe: "Ele aparece na linha do tempo com o status de entrega.",
                              }),
                        })
                     }
                  >
                     {lembrar.isPending ? "Enviando…" : "Lembrar agora pelo WhatsApp"}
                  </Button>
               </div>
            ) : null}

            {usaHistoricoInterno(caso.tipo) ? (
               <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-hairline pt-4">
                  <div className="min-w-0">
                     <p className="text-[12.5px] text-ink-2">
                        Histórico interno{" "}
                        {historico?.status === "ACEITO" && historico.arquivos[0]
                           ? `migrado ${stamp(historico.arquivos[historico.arquivos.length - 1].recebidoEm, agora).toLowerCase()}`
                           : "ainda não migrado"}
                     </p>
                     <p className="text-[11.5px] text-ink-4">
                        {motivoMigrar
                           ? `Migrar indisponível. ${motivoMigrar}.`
                           : "Vem do sistema acadêmico com as disciplinas cursadas aqui. Migre de novo se ele mudou depois da abertura."}
                     </p>
                  </div>
                  <Button
                     variant="ghost"
                     icon={<History />}
                     disabled={!!motivoMigrar || ocupado}
                     onClick={() =>
                        migrar.mutate(undefined, {
                           onSuccess: () => {
                              esperandoAvanco.current = true;
                              notificar({
                                 titulo: "Histórico interno migrado",
                                 detalhe: "A versão atual do sistema acadêmico já está no checklist.",
                              });
                           },
                        })
                     }
                  >
                     {migrar.isPending ? "Migrando…" : historico?.status === "ACEITO" ? "Migrar de novo" : "Migrar histórico interno"}
                  </Button>
               </div>
            ) : null}
         </Surface>

         <Surface padded={false}>
            <AsyncState
               isLoading={docs.isLoading}
               isError={docs.isError}
               isEmpty={itens.length === 0}
               loading={
                  <div className="space-y-4 p-5" aria-busy>
                     {[0, 1, 2].map(i => (
                        <div key={i} className="flex gap-3">
                           <Skeleton className="size-8 rounded-lg" />
                           <div className="flex-1 space-y-2">
                              <Skeleton className="h-3.5 w-1/2" />
                              <Skeleton className="h-3 w-1/3" />
                           </div>
                        </div>
                     ))}
                  </div>
               }
               error={
                  <EmptyPanel
                     compact
                     tone="crit"
                     title="Não carregamos o checklist"
                     message="O servidor não respondeu. Tente de novo em instantes."
                     action={
                        <Button size="xs" onClick={() => invalidarTudoDoCaso(queryClient, caso.id)}>
                           Tentar de novo
                        </Button>
                     }
                  />
               }
               empty={
                  <EmptyPanel
                     compact
                     title="Este tipo não pede documentos"
                     message="O checklist vem do tipo do pedido. Sem itens, a análise começa direto pela pré-análise."
                  />
               }
            >
               <ul className="divide-y divide-hairline">
                  {itens.map(item => (
                     <ItemDocumento
                        key={item.id}
                        item={item}
                        agora={agora}
                        permissoes={permissoes}
                        ocupado={ocupado}
                        onAbrir={a => abrir(item, a)}
                        onAceitar={() => avaliarItem(item, "ACEITO")}
                        onRecusar={() => setRecusando(item)}
                        onDispensar={() => avaliarItem(item, "DISPENSADO")}
                        onAnexar={f => anexarArquivo(item, f)}
                     />
                  ))}
               </ul>
               {permissoes.anexar?.habilitada ? (
                  <p className="border-t border-hairline px-5 py-3 text-[11.5px] text-ink-4">
                     Recebeu o arquivo por fora? Arraste até o documento ou use Anexar. PDF ou imagem.
                  </p>
               ) : null}
            </AsyncState>
         </Surface>

         <VisualizadorDocumento
            alvo={aberto}
            visualizacao={visualizar.data}
            carregando={visualizar.isPending}
            erro={visualizar.isError}
            agora={agora}
            onOpenChange={v => !v && setAberto(null)}
            onTentarDeNovo={() => aberto && visualizar.mutate({ checklistId: aberto.item.id, arquivoId: aberto.arquivo.id })}
            acoes={acoesGaveta}
         />

         <ModalRecusa
            caso={caso}
            item={recusando}
            enviando={avaliar.isPending}
            onOpenChange={v => !v && setRecusando(null)}
            onConfirmar={(motivo, texto) => recusando && avaliarItem(recusando, "RECUSADO", motivo, texto)}
         />
      </div>
   );
}
