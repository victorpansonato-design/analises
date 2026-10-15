/**
 * Uma linha do checklist. Estado em ponto + palavra (aceito sem ponto, recusado o único vermelho),
 * arquivos com canal e carimbo, leitura automática de legibilidade só quando pede atenção.
 *
 * - Ações só para quem tem a capacidade; o motivo de cada ação indisponível aparece em texto.
 * - Documento de identidade (sensível): quem não pode ver enxerga só o nome do arquivo (docs/04 §3).
 * - A linha inteira aceita arrastar e soltar o arquivo, além do botão "Anexar".
 */
import { Check, FileText, Paperclip, Ban, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Hint } from "@/components/core/hint";
import { Status } from "@/components/core/status";
import { Tag } from "@/components/core/tag";
import { Button } from "@/components/ui/button";
import { stamp } from "@/lib/format";
import { cn } from "@/lib/utils";

import { ANEXO, AVISO_LEGIBILIDADE, TOM_STATUS_DOCUMENTO, motivoNaoAnexar, motivoNaoAvaliar } from "@/features/documentos/domain/checklist";
import {
   ROTULO_CANAL,
   ROTULO_MOTIVO_RECUSA,
   ROTULO_STATUS_DOCUMENTO,
   type Arquivo,
   type ItemChecklist,
   type MotivoRecusa,
} from "@/features/documentos/types/documento.schema";

export interface PermissoesDocumento {
   /** `null` = o perfil não avalia; string = avalia, mas não agora (motivo). */
   avaliar: { habilitada: boolean; motivo: string | null } | null;
   anexar: { habilitada: boolean; motivo: string | null } | null;
   verIdentidade: boolean;
}

interface ItemDocumentoProps {
   item: ItemChecklist;
   agora: Date;
   permissoes: PermissoesDocumento;
   ocupado: boolean;
   onAbrir: (arquivo: Arquivo) => void;
   onAceitar: () => void;
   onRecusar: () => void;
   onDispensar: () => void;
   onAnexar: (arquivo: File) => void;
}

const SEM_IDENTIDADE = "Seu perfil vê só o nome deste arquivo (documento de identidade)";

export function ItemDocumento({
   item,
   agora,
   permissoes,
   ocupado,
   onAbrir,
   onAceitar,
   onRecusar,
   onDispensar,
   onAnexar,
}: ItemDocumentoProps) {
   const input = useRef<HTMLInputElement>(null);
   const [arrastando, setArrastando] = useState(false);
   const bloqueioAbrir = item.sensivel && !permissoes.verIdentidade ? SEM_IDENTIDADE : null;

   const avaliar = permissoes.avaliar;
   const motivoAceitar = motivoNaoAvaliar(item, "ACEITO");
   const motivoRecusar = motivoNaoAvaliar(item, "RECUSADO");
   const motivoDispensar = motivoNaoAvaliar(item, "DISPENSADO");
   const anexo = permissoes.anexar;
   const motivoAnexo = anexo ? (anexo.habilitada ? motivoNaoAnexar(item) : anexo.motivo) : null;
   const podeSoltar = !!anexo && !motivoAnexo && !ocupado;

   // Uma explicação só, visível, para as ações que não estão disponíveis neste item.
   const explicacao = !avaliar
      ? null
      : !avaliar.habilitada
        ? avaliar.motivo
        : item.arquivos.length === 0 && item.status !== "DISPENSADO"
          ? "Aceitar e recusar ficam disponíveis quando chegar um arquivo."
          : null;

   function soltar(e: DragEvent<HTMLLIElement>) {
      e.preventDefault();
      setArrastando(false);
      const f = e.dataTransfer.files?.[0];
      if (f && podeSoltar) onAnexar(f);
   }

   const legibilidade = item.legibilidade === "DUVIDOSA" || item.legibilidade === "RUIM" ? AVISO_LEGIBILIDADE[item.legibilidade] : null;

   return (
      <li
         onDragOver={e => {
            if (!podeSoltar) return;
            e.preventDefault();
            setArrastando(true);
         }}
         onDragLeave={() => setArrastando(false)}
         onDrop={soltar}
         className={cn(
            "flex flex-col gap-3 px-5 py-4 transition-colors duration-150 sm:flex-row sm:items-start",
            arrastando && "bg-surface-hover",
         )}
      >
         <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-3">
            <FileText className="size-4" aria-hidden />
         </span>

         <div className="min-w-0 flex-1 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
               <p className="text-[13px] font-medium text-ink">{item.nome}</p>
               <Tag>{item.obrigatorio ? "Obrigatório" : "Opcional"}</Tag>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
               <Status tone={TOM_STATUS_DOCUMENTO[item.status]} solid={item.status === "RECUSADO"}>
                  {ROTULO_STATUS_DOCUMENTO[item.status]}
               </Status>
               {item.status === "RECUSADO" && item.motivoRecusa ? (
                  <span className="text-[12px] text-ink-3">
                     Motivo: {ROTULO_MOTIVO_RECUSA[item.motivoRecusa as MotivoRecusa] ?? item.motivoRecusa}
                  </span>
               ) : null}
               {legibilidade && item.status !== "ACEITO" ? (
                  <span className="inline-flex items-center gap-1">
                     <Status tone={legibilidade.tom}>{legibilidade.texto}</Status>
                     <Hint label="a legibilidade">
                        Leitura automática do arquivo, feita quando ele chega. É um sinal para conferir com atenção, não uma decisão: quem
                        aceita ou recusa é você.
                     </Hint>
                  </span>
               ) : null}
            </div>

            {item.arquivos.length > 0 ? (
               <ul className="space-y-1 pt-0.5">
                  {item.arquivos.map(a => (
                     <li key={a.id} className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                        <span className="truncate text-[12.5px] text-ink-2">{a.nome}</span>
                        <Tag>{ROTULO_CANAL[a.canal]}</Tag>
                        <time dateTime={a.recebidoEm} className="font-mono text-[10.5px] text-ink-4">
                           {stamp(a.recebidoEm, agora)}
                        </time>
                        <Button variant="ghost" size="xs" disabled={!!bloqueioAbrir} onClick={() => onAbrir(a)}>
                           Abrir
                        </Button>
                     </li>
                  ))}
                  {bloqueioAbrir ? <li className="text-[11.5px] text-ink-4">{bloqueioAbrir}.</li> : null}
               </ul>
            ) : (
               <p className="text-[12px] text-ink-3">Nenhum arquivo recebido ainda.</p>
            )}

            {explicacao ? <p className="text-[11.5px] font-medium text-ink-3">{explicacao}</p> : null}
            {anexo && motivoAnexo && item.status !== "ACEITO" && item.status !== "DISPENSADO" ? (
               <p className="text-[11.5px] text-ink-4">Anexar indisponível. {motivoAnexo}.</p>
            ) : null}
         </div>

         <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:justify-end">
            {avaliar?.habilitada && !motivoAceitar ? (
               <Button icon={<Check />} size="xs" disabled={ocupado} onClick={onAceitar}>
                  Aceitar
               </Button>
            ) : null}
            {avaliar?.habilitada && !motivoRecusar ? (
               <Button variant="ghost" icon={<X />} size="xs" disabled={ocupado} onClick={onRecusar}>
                  Recusar
               </Button>
            ) : null}
            {avaliar?.habilitada && !motivoDispensar ? (
               <Button variant="ghost" icon={<Ban />} size="xs" disabled={ocupado} onClick={onDispensar}>
                  Dispensar
               </Button>
            ) : null}
            {anexo && !motivoAnexo ? (
               <>
                  <Button variant="ghost" icon={<Paperclip />} size="xs" disabled={ocupado} onClick={() => input.current?.click()}>
                     Anexar
                  </Button>
                  <input
                     ref={input}
                     type="file"
                     accept={ANEXO.aceitar}
                     className="sr-only"
                     tabIndex={-1}
                     aria-label={`Anexar arquivo a ${item.nome}`}
                     onChange={e => {
                        const f = e.currentTarget.files?.[0];
                        e.currentTarget.value = "";
                        if (f) onAnexar(f);
                     }}
                  />
               </>
            ) : null}
         </div>
      </li>
   );
}
