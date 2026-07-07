import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'

interface MetricCardProps {
  label: string
  value: string
  icon: ReactNode
  hint?: string
  accentClass?: string
  onHide: () => void
}

export function MetricCard({ label, value, icon, hint, accentClass, onHide }: MetricCardProps) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className="charm-glass relative flex flex-col gap-3 rounded-2xl p-5"
    >
      <div className="flex items-start justify-between">
        <div
          className={cn(
            'flex size-9 items-center justify-center rounded-xl text-white',
            accentClass ?? 'bg-[var(--accent)]',
          )}
        >
          {icon}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`${label} widget settings`}
              className="rounded-full p-1.5 text-[var(--charm-ink-soft)] transition hover:bg-white/50 hover:text-[var(--charm-ink)]"
            >
              <Settings className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="charm-glass border-0">
            <DropdownMenuItem onSelect={onHide}>Hide widget</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div>
        <p className="font-display-bold text-2xl font-semibold text-[var(--charm-ink)] sm:text-3xl">{value}</p>
        <p className="mt-0.5 text-sm text-[var(--charm-ink-soft)]">{label}</p>
        {hint && <p className="mt-1 text-xs text-[var(--charm-ink-soft)]/80">{hint}</p>}
      </div>
    </motion.div>
  )
}
