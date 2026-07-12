import { useMemo, useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '#/lib/utils'
import { DraggableIdeaCard } from './idea-card'
import type { IdeaPost } from '#/lib/types'

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function CalendarDay({
  day,
  inMonth,
  ideas,
  onOpenIdea,
}: {
  day: Date
  inMonth: boolean
  ideas: Array<IdeaPost>
  onOpenIdea: (ideaId: string) => void
}) {
  const dayKey = format(day, 'yyyy-MM-dd')
  const { setNodeRef, isOver } = useDroppable({ id: dayKey })
  const visible = ideas.slice(0, 2)
  const overflow = ideas.length - visible.length

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[86px] flex-col gap-1 rounded-lg border border-transparent p-1.5 transition-colors duration-150 ease-out',
        inMonth ? 'bg-white/30' : 'bg-white/10 opacity-50',
        isOver && 'border-[var(--accent)] bg-[var(--accent)]/10',
      )}
    >
      <span
        className={cn(
          'flex size-5 items-center justify-center rounded-full text-[11px] font-semibold',
          isToday(day) ? 'bg-[var(--accent)] text-[var(--accent-foreground)]' : 'text-[var(--charm-ink-soft)]',
        )}
      >
        {format(day, 'd')}
      </span>
      <div className="flex flex-col gap-1">
        {visible.map((idea) => (
          <DraggableIdeaCard key={idea.id} idea={idea} onOpen={onOpenIdea} compact />
        ))}
        {overflow > 0 && <span className="px-0.5 text-[10px] text-[var(--charm-ink-soft)]">+{overflow} more</span>}
      </div>
    </div>
  )
}

export function ScrapbookCalendar({
  ideas,
  onOpenIdea,
}: {
  ideas: Array<IdeaPost>
  onOpenIdea: (ideaId: string) => void
}) {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()))

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor))
    const gridEnd = endOfWeek(endOfMonth(cursor))
    return eachDayOfInterval({ start: gridStart, end: gridEnd })
  }, [cursor])

  const ideasByDay = useMemo(() => {
    const map = new Map<string, Array<IdeaPost>>()
    ideas.forEach((idea) => {
      if (!idea.scheduledDate) return
      const key = format(new Date(idea.scheduledDate), 'yyyy-MM-dd')
      const list = map.get(key) ?? []
      list.push(idea)
      map.set(key, list)
    })
    return map
  }, [ideas])

  return (
    <div className="charm-glass flex flex-col gap-3 rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold text-[var(--charm-ink)]">{format(cursor, 'MMMM yyyy')}</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => subMonths(c, 1))}
            aria-label="Previous month"
            className="rounded-full p-1.5 text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-90"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setCursor(startOfMonth(new Date()))}
            className="rounded-full px-2 py-1 text-xs font-medium text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-95"
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => addMonths(c, 1))}
            aria-label="Next month"
            className="rounded-full p-1.5 text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-90"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
        {WEEKDAY_LABELS.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => (
          <CalendarDay
            key={day.toISOString()}
            day={day}
            inMonth={isSameMonth(day, cursor)}
            ideas={ideasByDay.get(format(day, 'yyyy-MM-dd')) ?? []}
            onOpenIdea={onOpenIdea}
          />
        ))}
      </div>
    </div>
  )
}
