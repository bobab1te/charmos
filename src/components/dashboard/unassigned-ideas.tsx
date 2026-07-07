import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Lightbulb, Plus } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { cn } from '#/lib/utils'

const NOTE_TILTS = ['-rotate-2', 'rotate-1', '-rotate-1']
const NOTE_COLORS = ['bg-[var(--charm-pink)]', 'bg-[var(--charm-yellow)]', 'bg-[var(--charm-blue)]']

export function UnassignedIdeas({ onHide }: { onHide: () => void }) {
  const { ideas, addIdea } = useCharmStore()
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')

  const unassigned = ideas
    .filter((i) => i.status === 'idea' && !i.scheduledDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 3)

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
          className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition hover:opacity-90"
        >
          <Plus className="size-3.5" /> Add idea
        </button>
      }
    >
      <div className="flex flex-wrap items-start gap-3">
        {adding && (
          <div className="w-full max-w-[220px] rotate-1 rounded-xl bg-white/80 p-3 shadow-sm">
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
          <p className="text-sm text-[var(--charm-ink-soft)]">
            No raw concepts waiting. Add one before it slips away.
          </p>
        ) : (
          unassigned.map((idea, i) => (
            <div
              key={idea.id}
              className={cn(
                'w-full max-w-[220px] rounded-xl p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md',
                NOTE_TILTS[i % NOTE_TILTS.length],
                NOTE_COLORS[i % NOTE_COLORS.length],
              )}
            >
              <p className="text-sm font-medium text-[var(--charm-ink)]">{idea.title}</p>
              {idea.hook && <p className="mt-1 line-clamp-2 text-xs text-[var(--charm-ink)]/70">{idea.hook}</p>}
            </div>
          ))
        )}
      </div>
    </WidgetCard>
  )
}
