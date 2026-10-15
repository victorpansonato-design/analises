import type * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "placeholder:text-ink-4 aria-invalid:ring-2 aria-invalid:ring-crit/60 flex field-sizing-content min-h-16 w-full resize-y rounded-md bg-surface-2 px-3 py-2 text-[13px] leading-relaxed text-ink transition-colors outline-none hover:bg-surface-3 focus:bg-surface-2 focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
