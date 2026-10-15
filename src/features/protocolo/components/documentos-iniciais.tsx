/**
 * Documentos que o candidato já mandou ao consultor (opcional). Arrastar e soltar ou escolher. Os
 * arquivos só sobem depois que o caso existe, cada um no primeiro item pendente do checklist; a
 * analista confere e reclassifica na aba Documentos. Não entram no rascunho (arquivo não persiste).
 */
import { FileText, Upload, X } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import { int } from "@/lib/format";
import { cn } from "@/lib/utils";

const ACEITOS = ".pdf,.jpg,.jpeg,.png,.heic,.webp";

interface DocumentosIniciaisProps {
   arquivos: readonly File[];
   onChange: (arquivos: File[]) => void;
}

function tamanho(bytes: number): string {
   if (bytes < 1024 * 1024) return `${int(Math.max(1, bytes / 1024))} KB`;
   return `${int(bytes / (1024 * 1024))} MB`;
}

export function DocumentosIniciais({ arquivos, onChange }: DocumentosIniciaisProps) {
   const input = useRef<HTMLInputElement>(null);
   const [sobre, setSobre] = useState(false);

   function adicionar(lista: FileList | null) {
      if (!lista?.length) return;
      const novos = [...lista].filter(f => !arquivos.some(a => a.name === f.name && a.size === f.size));
      onChange([...arquivos, ...novos]);
   }

   function soltar(e: DragEvent<HTMLDivElement>) {
      e.preventDefault();
      setSobre(false);
      adicionar(e.dataTransfer.files);
   }

   return (
      <div>
         <div
            onDragOver={e => {
               e.preventDefault();
               setSobre(true);
            }}
            onDragLeave={() => setSobre(false)}
            onDrop={soltar}
            className={cn(
               "flex flex-col items-center gap-2 rounded-xl px-4 py-5 text-center transition-colors",
               sobre ? "bg-brand-soft" : "bg-surface-2",
            )}
         >
            <Upload className="size-4 text-ink-4" aria-hidden />
            <p className="text-[12px] text-ink-3">Arraste os arquivos para cá (PDF ou foto)</p>
            <Button size="xs" onClick={() => input.current?.click()}>
               Escolher arquivos
            </Button>
            <input
               ref={input}
               type="file"
               multiple
               accept={ACEITOS}
               className="sr-only"
               tabIndex={-1}
               aria-label="Escolher arquivos"
               onChange={e => {
                  adicionar(e.target.files);
                  e.target.value = "";
               }}
            />
         </div>
         {arquivos.length > 0 ? (
            <ul className="mt-2 divide-y divide-hairline" aria-label="Arquivos para anexar">
               {arquivos.map(a => (
                  <li key={`${a.name}-${a.size}`} className="flex items-center gap-2.5 py-2">
                     <FileText className="size-3.5 shrink-0 text-ink-4" aria-hidden />
                     <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{a.name}</span>
                     <span className="font-mono text-[11px] text-ink-4">{tamanho(a.size)}</span>
                     <Button
                        variant="ghost"
                        size="xs"
                        square
                        aria-label={`Remover ${a.name}`}
                        icon={<X />}
                        onClick={() => onChange(arquivos.filter(x => x !== a))}
                     />
                  </li>
               ))}
            </ul>
         ) : null}
      </div>
   );
}
