import { format } from 'date-fns'
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Briefcase } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { BrandAvatar } from '#/components/deals/brand-avatar'
import { GiftedLabel, isGiftedAmount } from '#/components/deals/gifted-label'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { nextDeliverable } from '#/lib/derived'
import type { BrandDeal, DealStage } from '#/lib/types'

const COLUMNS: Array<{ id: DealStage; label: string }> = [
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
]

const VISIBLE_PER_COLUMN = 4

function DealRow({ deal, brandName, logoUrl }: { deal: BrandDeal; brandName: string; logoUrl?: string }) {
  const { convert, displayCurrency } = useCurrency()
  const next = nextDeliverable(deal)
  const detail = next
    ? `${format(new Date(next.dueDate), 'MMM d')} · ${next.type}`
    : isGiftedAmount(deal.compensationAmount)
      ? undefined
      : new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: displayCurrency,
          maximumFractionDigits: 0,
        }).format(convert(deal.compensationAmount, deal.compensationCurrency))

  return (
    <li className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 transition-colors duration-150 ease-out hover:bg-white/40">
      <BrandAvatar name={brandName} logoUrl={logoUrl} className="size-5 shrink-0 text-[10px]" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--charm-ink)]">{brandName}</p>
        {detail ? (
          <p className="truncate text-[11px] text-[var(--charm-ink-soft)]">{detail}</p>
        ) : (
          <GiftedLabel className="text-[11px] text-[var(--charm-ink-soft)]" />
        )}
      </div>
    </li>
  )
}

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
      <div className="grid h-full grid-cols-2 gap-3 sm:grid-cols-4">
        {dealsByStage.map((col) => {
          const visible = col.deals.slice(0, VISIBLE_PER_COLUMN)
          const overflow = col.deals.length - visible.length
          return (
            <div key={col.id} className="flex min-h-[220px] flex-col rounded-xl border border-dashed border-white/40 p-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
                  {col.label}
                </span>
                <span className="rounded-full bg-white/50 px-1.5 py-0.5 text-[11px] font-medium text-[var(--charm-ink-soft)]">
                  {col.deals.length}
                </span>
              </div>
              {visible.length === 0 ? (
                <p className="mt-2 text-xs text-[var(--charm-ink-soft)]">No deals yet</p>
              ) : (
                <ul className="mt-1.5 flex flex-col gap-0.5">
                  {visible.map((deal) => (
                    <DealRow
                      key={deal.id}
                      deal={deal}
                      brandName={brandName(deal.brandId)}
                      logoUrl={brandById(deal.brandId)?.logoUrl}
                    />
                  ))}
                </ul>
              )}
              {overflow > 0 && (
                <p className="mt-auto pt-1.5 text-[11px] font-medium text-[var(--charm-ink-soft)]">+{overflow} more</p>
              )}
            </div>
          )
        })}
      </div>
    </WidgetCard>
  )
}
