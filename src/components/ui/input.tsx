import * as React from "react"

import { cn } from "#/lib/utils.ts"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // An input gets its own surface rather than `bg-transparent`. Transparent meant typed text
        // sat directly on whatever drifted past underneath — the mesh gradient, a coloured widget —
        // so legibility changed as the background animated. A defined field also makes it obvious
        // where to click, which transparent-on-glass did not.
        "h-9 w-full min-w-0 rounded-md border border-input bg-[var(--input-bg)] px-3 py-1 text-base text-[var(--text-primary)] shadow-xs transition-[color,box-shadow,border-color,background-color] duration-150 ease-out outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-[var(--placeholder)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "hover:border-ring/50",
        "focus-visible:border-ring focus-visible:bg-[var(--input-bg-focus)] focus-visible:ring-[3px] focus-visible:ring-ring/50",
        "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
        className
      )}
      {...props}
    />
  )
}

export { Input }
