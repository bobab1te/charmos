import { motion } from 'motion/react'
import { BarChart3 } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { monthlyRevenue } from '#/lib/derived'

export function EarningsChart({ onHide }: { onHide?: () => void } = {}) {
  const { ledger } = useCharmStore()
  const months = monthlyRevenue(ledger, 6)
  const max = Math.max(...months.map((m) => m.total), 1)
  const currency = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })

  return (
    <WidgetCard title="Monthly Earnings" icon={<BarChart3 className="size-4" />} onHide={onHide}>
      <div className="flex h-[190px] items-end justify-between gap-3 px-1">
        {months.map((m) => (
          <div key={m.key} className="flex flex-1 flex-col items-center gap-2">
            <span className="text-[11px] font-medium text-[var(--charm-ink-soft)]">
              {m.total > 0 ? currency.format(m.total) : ''}
            </span>
            <div className="flex h-[130px] w-full items-end">
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max((m.total / max) * 100, 3)}%` }}
                transition={{ type: 'spring', stiffness: 120, damping: 18 }}
                className="w-full rounded-t-xl bg-[linear-gradient(180deg,var(--accent),var(--accent-soft))]"
              />
            </div>
            <span className="text-xs text-[var(--charm-ink-soft)]">{m.label}</span>
          </div>
        ))}
      </div>
    </WidgetCard>
  )
}
