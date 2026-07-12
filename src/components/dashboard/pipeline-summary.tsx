import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Briefcase } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import type { DealStage } from '#/lib/types'

const COLUMNS: Array<{ id: DealStage; label: string }> = [
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
]

export function PipelineSummary({ onHide }: { onHide: () => void }) {
  const { deals, brandById } = useCharmStore()
  const brandName = (id: string) => brandById(id)?.name ?? 'Unknown brand'
  const dealsByStage = COLUMNS.map((col) => ({ ...col, deals: deals.filter((d) => d.stage === col.id) }))

  return (
    <WidgetCard
      title="Deal Pipeline"
      icon={<Briefcase className="size-4" />}
      onHide={onHide}
      headerAction={
        <Link
          to="/brand-deals"
          className="flex items-center gap-1 rounded-full bg-white/50 px-2.5 py-1 text-xs font-medium text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:text-[var(--charm-ink)] hover:shadow-sm active:scale-95"
        >
          Full board <ArrowUpRight className="size-3.5" />
        </Link>
      }
    >
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {dealsByStage.map((col) => (
          <div key={col.id} className="rounded-xl border border-dashed border-white/40 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
                {col.label}
              </span>
              <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-[11px] font-medium text-[var(--charm-ink-soft)]">
                {col.deals.length}
              </span>
            </div>
            <ul className="mt-1.5 flex flex-col gap-1">
              {col.deals.length === 0 ? (
                <li className="text-xs text-[var(--charm-ink-soft)]">—</li>
              ) : (
                col.deals.slice(0, 2).map((deal) => (
                  <li key={deal.id} className="truncate text-xs text-[var(--charm-ink)]">
                    {brandName(deal.brandId)}
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
