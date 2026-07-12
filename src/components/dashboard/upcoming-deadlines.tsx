import { format } from 'date-fns'
import { CalendarDays } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { getUpcomingDeadlines } from '#/lib/derived'
import { cn } from '#/lib/utils'

const urgencyDot: Record<string, string> = {
  red: 'bg-[var(--urgency-red)]',
  orange: 'bg-[var(--urgency-orange)]',
  green: 'bg-[var(--urgency-green)]',
}

export function UpcomingDeadlines({ onHide }: { onHide: () => void }) {
  const { deals, brands } = useCharmStore()
  const deadlines = getUpcomingDeadlines(deals, brands, 5)

  return (
    <WidgetCard title="Upcoming Deadlines" icon={<CalendarDays className="size-4" />} onHide={onHide}>
      {deadlines.length === 0 ? (
        <p className="text-sm text-[var(--charm-ink-soft)]">No upcoming deadlines. Enjoy the breathing room.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {deadlines.map((d) => (
            <li
              key={d.dealId}
              className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors duration-150 ease-out hover:bg-white/40"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className={cn('size-2 shrink-0 rounded-full', urgencyDot[d.urgency])} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--charm-ink)]">{d.brandName}</p>
                  <p className="truncate text-xs text-[var(--charm-ink-soft)]">{d.deliverableType}</p>
                </div>
              </div>
              <span className="shrink-0 text-xs font-medium text-[var(--charm-ink-soft)]">
                {format(new Date(d.dueDate), 'MMM d')}
              </span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  )
}
