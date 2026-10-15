/**
 * Iniciais (design system §12, Avatar): nunca retrato de banco de imagens. Sem nome, sem avatar:
 * iniciais fabricadas são dado inventado. Decorativo (`aria-hidden`): o nome sempre aparece em texto
 * ou no `title` ao lado.
 */
import { cn } from "@/lib/utils";

const SIZE = {
   xs: "size-6 text-[10px]",
   sm: "size-8 text-[11px]",
   md: "size-9 text-[12px]",
   lg: "size-12 text-[15px]",
} as const;

const TONE = {
   neutral: "bg-surface-2 text-ink-2",
   strong: "bg-surface-3 text-ink",
   brand: "bg-brand text-on-brand",
   onBrand: "bg-white/15 text-on-brand",
} as const;

function iniciais(nome: string): string {
   const partes = nome.split(/\s+/).filter(p => p.length > 2 || /^[A-ZÀ-Ú]/.test(p));
   const primeira = partes[0]?.[0] ?? "";
   const ultima = partes.length > 1 ? (partes[partes.length - 1][0] ?? "") : "";
   return `${primeira}${ultima}`.toUpperCase();
}

interface InitialsProps {
   nome: string;
   size?: keyof typeof SIZE;
   tone?: keyof typeof TONE;
   className?: string;
}

export function Initials({ nome, size = "xs", tone = "neutral", className }: InitialsProps) {
   return (
      <span
         aria-hidden
         className={cn(
            "inline-flex shrink-0 items-center justify-center rounded-full font-medium select-none",
            SIZE[size],
            TONE[tone],
            className,
         )}
      >
         {iniciais(nome)}
      </span>
   );
}
