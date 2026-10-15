/**
 * Bolha de WhatsApp: a mensagem EXATAMENTE como o candidato a vê (quebras de linha e botões de
 * resposta rápida). Serve à prévia do envio, à recusa de documento e à linha do tempo, para a equipe
 * reconhecer de relance o que saiu do sistema e o que o candidato escreveu.
 *
 * - Saída (enviada pela UniAnchieta) encosta à direita, em `brand-soft`; entrada, à esquerda, neutra.
 * - Variável vazia aparece destacada (`[documentos]`): é o que bloqueia o envio.
 * - Os botões são representação, não ação: não recebem foco.
 */
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { rotuloVariavel, segmentarPrevia } from "@/features/comunicacao/domain/mensagem";

interface BolhaWhatsappProps {
   texto: string;
   botoes?: readonly string[];
   direcao?: "SAIDA" | "ENTRADA";
   /** Variáveis vazias apontadas pela API (destacadas no texto). */
   faltando?: readonly string[];
   /** Linha sob a bolha (selo, status de entrega). */
   rodape?: ReactNode;
   className?: string;
}

export function BolhaWhatsapp({ texto, botoes = [], direcao = "SAIDA", faltando = [], rodape, className }: BolhaWhatsappProps) {
   const saida = direcao === "SAIDA";
   return (
      <div className={cn("flex flex-col gap-1.5", saida ? "items-end" : "items-start", className)}>
         <div
            className={cn(
               "max-w-[min(100%,420px)] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed whitespace-pre-line text-ink",
               saida ? "rounded-tr-sm bg-brand-soft" : "rounded-tl-sm bg-surface-2",
            )}
         >
            {segmentarPrevia(texto, faltando).map((t, i) =>
               t.faltando ? (
                  <mark
                     key={i}
                     title={`Falta: ${rotuloVariavel(t.faltando)}`}
                     className="rounded-sm bg-warn-soft px-1 font-medium text-warn-ink"
                  >
                     {t.texto}
                  </mark>
               ) : (
                  <span key={i}>{t.texto}</span>
               ),
            )}
         </div>
         {botoes.length > 0 ? (
            <ul
               aria-label="Botões de resposta rápida"
               className={cn("flex max-w-[min(100%,420px)] flex-wrap gap-1.5", saida && "justify-end")}
            >
               {botoes.map(b => (
                  <li key={b} className="rounded-full bg-surface-2 px-3 py-1 text-[12px] font-medium text-brand-text">
                     {b}
                  </li>
               ))}
            </ul>
         ) : null}
         {rodape ? <div className={cn("flex flex-wrap items-center gap-2", saida && "justify-end")}>{rodape}</div> : null}
      </div>
   );
}
