import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Lightbulb, Plus } from 'lucide-react'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { useThemeContext } from '#/lib/theme-context'
import { cn } from '#/lib/utils'
import { defaultCardColor, glassBackground, resolveTextColor } from '#/lib/widget-colors'

const NOTE_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1']

export function UnassignedIdeas({ onHide }: { onHide: () => void }) {
  const { ideas, addIdea } = useCharmStore()
  const { theme } = useThemeContext()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const allUnassigned = ideas
    .filter((i) => i.status === 'idea' && !i.scheduledDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  const unassigned = allUnassigned.slice(0, 3)
  const remaining = allUnassigned.length - unassigned.length

  function commitDraft() {
    const title = draft.trim()
    if (title) addIdea({ title })
    setDraft('')
    setAdding(false)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') commitDraft()
    if (e.key === 'Escape') {
      setDraft('')
      setAdding(false)
    }
  }

  return (
    <WidgetCard
      title="Unassigned Ideas"
      icon={<Lightbulb className="size-4" />}
      onHide={onHide}
      headerAction={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition duration-150 ease-out hover:opacity-90 hover:shadow-md active:scale-95"
        >
          <Plus className="size-3.5" /> Add idea
        </button>
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        {adding && (
          <div className="w-full max-w-[220px] rotate-1 rounded-xl bg-[var(--surface-nested)] p-3 shadow-sm">
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={commitDraft}
              placeholder="Quick concept..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--charm-ink-soft)]"
            />
          </div>
        )}
        {unassigned.length === 0 && !adding ? (
          <div className="flex items-center gap-3 py-1">
            <CharmMascot mood="calm" size={40} />
            <p className="text-sm text-[var(--charm-ink-soft)]">Nothing here yet. Add a concept before it slips away.</p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {unassigned.map((idea, i) => {
              const color = idea.color ?? defaultCardColor(idea.id, theme)
              const textColor = resolveTextColor(color)
              const softTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(26,18,32,0.65)'
              return (
                <motion.div
                  key={idea.id}
                  layout
                  initial={{ opacity: 0, scale: 0.85, y: 8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  className={cn(
                    'charm-glass w-full max-w-[220px] rounded-xl p-3 transition-shadow duration-150 ease-out hover:shadow-md',
                    NOTE_TILTS[i % NOTE_TILTS.length],
                  )}
                  style={{ background: glassBackground(color) }}
                >
                  <p className="text-sm font-medium" style={{ color: textColor }}>
                    {idea.title}
                  </p>
                  {idea.hook && (
                    <p className="mt-1 line-clamp-2 text-xs" style={{ color: softTextColor }}>
                      {idea.hook}
                    </p>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
        <span className="text-xs text-[var(--charm-ink-soft)]">
          {remaining > 0 ? `+${remaining} more in the scrapbook` : 'Full scrapbook: calendar, references, series & more'}
        </span>
        <Link
          to="/scrapbook"
          className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-nested)] px-2.5 py-1 text-xs font-medium text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:text-[var(--charm-ink)] hover:shadow-sm active:scale-95"
        >
          Open scrapbook <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </WidgetCard>
  )
}
