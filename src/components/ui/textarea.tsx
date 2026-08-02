import * as React from "react"

import { cn } from "#/lib/utils.ts"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        // Same reasoning as Input — see the note there on why this is not `bg-transparent`.
        "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-[var(--input-bg)] px-3 py-2 text-base text-[var(--text-primary)] shadow-xs transition-[color,box-shadow,border-color,background-color] duration-150 ease-out outline-none placeholder:text-[var(--placeholder)] hover:border-ring/50 focus-visible:border-ring focus-visible:bg-[var(--input-bg-focus)] focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
