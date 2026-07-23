import { Settings } from 'lucide-react'
import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu'
import { cn } from '#/lib/utils'

interface WidgetCardProps {
  title: string
  icon?: ReactNode
  onHide?: () => void
  className?: string
  children: ReactNode
  headerAction?: ReactNode
}

export function WidgetCard({
  title,
  icon,
  onHide,
  className,
  children,
  headerAction,
}: WidgetCardProps) {
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      className={cn(
        'charm-glass relative flex h-full flex-col rounded-2xl p-5 transition-shadow duration-150 ease-out hover:shadow-lg',
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold tracking-tight text-[var(--charm-ink)]">
          {icon}
          {title}
        </h2>
        <div className="flex items-center gap-1">
          {headerAction}
          {onHide && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label={`${title} widget settings`}
                  className="rounded-full p-1.5 text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-90"
                >
                  <Settings className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="charm-glass border-0">
                <DropdownMenuItem onSelect={onHide}>Hide widget</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </motion.section>
  )
}
