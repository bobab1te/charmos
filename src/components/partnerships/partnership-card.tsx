import { useEffect } from 'react'
import { format } from 'date-fns'
import { AlertTriangle, CircleDollarSign, Plus, Repeat2, Undo2 } from 'lucide-react'
import { Button } from '#/components/ui/button'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import {
  computeCurrentRetainerCycleWindow,
  countDeliverablesInWindow,
  cycleMatchesWindow,
  getCurrentPeriodWindow,
  getNextPaymentDate,
  isPartnershipRenewalDueSoon,
} from '#/lib/partnership-derived'
import { cn } from '#/lib/utils'
import type { Partnership } from '#/lib/types'

const STATUS_STYLES: Record<Partnership['status'], string> = {
  active: 'bg-[var(--urgency-green)]/15 text-[var(--urgency-green)]',
  paused: 'bg-[var(--urgency-orange)]/15 text-[var(--urgency-orange)]',
  ended: 'bg-black/10 text-[var(--charm-ink-soft)]',
}

export function PartnershipCard({
  partnership,
  brandName,
  onOpen,
}: {
  partnership: Partnership
  brandName: string
  onOpen: (id: string) => void
}) {
  const {
    partnershipDeliverables,
    logPartnershipDeliverable,
    undoLastPartnershipDeliverable,
    partnershipPaymentCycles,
    ensurePartnershipCycle,
    markPartnershipCyclePaid,
    undoLastPartnershipPayment,
  } = useCharmStore()
  const { displayCurrency, convert } = useCurrency()
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: partnership.currency,
    maximumFractionDigits: 0,
  })

  const periodWindow = getCurrentPeriodWindow(partnership.deliverableCadence)
  const completed = countDeliverablesInWindow(partnershipDeliverables, partnership.id, periodWindow)
  const renewalDueSoon = isPartnershipRenewalDueSoon(partnership)
  const nextPayment = getNextPaymentDate(partnership)
  const hasLogsThisPeriod = completed > 0

  const canConfirmPayment = partnership.paymentType === 'retainer' && partnership.status !== 'paused'
  const cycleWindow = canConfirmPayment ? computeCurrentRetainerCycleWindow(partnership) : undefined
  const currentCycle = cycleWindow
    ? partnershipPaymentCycles.find((c) => c.partnershipId === partnership.id && cycleMatchesWindow(c, cycleWindow))
    : undefined
  const cycleConfirmed = currentCycle?.status === 'confirmed'

  // Keeps the current cycle's row generated/up to date with the partnership's live terms —
  // regenerating an unconfirmed cycle when amount/cadence changes, never touching a
  // confirmed one. Re-runs whenever anything that could affect "what's the current cycle" changes.
  useEffect(() => {
    if (!canConfirmPayment) return
    ensurePartnershipCycle(partnership.id)
  }, [
    canConfirmPayment,
    ensurePartnershipCycle,
    partnership.id,
    partnership.retainerAmount,
    partnership.retainerCadence,
    partnership.currency,
    partnership.status,
    partnership.pausedAt,
    partnership.unpausedAt,
  ])

  return (
    <div
      onClick={() => onOpen(partnership.id)}
      className="charm-glass flex cursor-pointer flex-col gap-3 rounded-2xl p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-left">
          <p className="truncate font-display text-base font-semibold text-[var(--charm-ink)]">{brandName}</p>
          <span className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className={cn('inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize', STATUS_STYLES[partnership.status])}>
              {partnership.status}
            </span>
            {partnership.status === 'paused' && partnership.pausedAt && (
              <span className="text-[10px] text-[var(--charm-ink-soft)]">
                since {format(new Date(partnership.pausedAt), 'MMM d, yyyy')}
              </span>
            )}
          </span>
        </div>
        {renewalDueSoon && (
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-[var(--urgency-orange)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--urgency-orange)]">
            <AlertTriangle className="size-3" /> Renewal due soon
          </span>
        )}
      </div>

      {partnership.contentFormats.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {partnership.contentFormats.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full bg-white/60 px-2 py-0.5 text-[10px] font-medium text-[var(--charm-ink-soft)]"
            >
              <Repeat2 className="size-2.5" /> {tag}
            </span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-xs text-[var(--charm-ink-soft)]">
        <div>
          <p className="font-medium text-[var(--charm-ink)]">
            {completed}/{partnership.deliverableCount} {periodWindow.label}
          </p>
          <p>{partnership.deliverableUnit}</p>
        </div>
        <div>
          <p className="font-medium text-[var(--charm-ink)]">
            {partnership.paymentType === 'retainer'
              ? `${currency.format(partnership.retainerAmount ?? 0)} / ${partnership.retainerCadence}`
              : `${currency.format(partnership.perDeliverableRate ?? 0)} / piece`}
          </p>
          <p>
            {partnership.paymentType === 'retainer' && partnership.status === 'paused'
              ? 'Paused — excluded from revenue'
              : nextPayment
                ? `Next payment ${format(nextPayment, 'MMM d')}`
                : 'Paid per deliverable'}
            {partnership.currency !== displayCurrency && (
              <>
                {' '}
                (≈{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: displayCurrency,
                  maximumFractionDigits: 0,
                }).format(
                  convert(partnership.retainerAmount ?? partnership.perDeliverableRate ?? 0, partnership.currency),
                )}
                )
              </>
            )}
          </p>
        </div>
        {partnership.endDate && (
          <div className="col-span-2">
            <p className="text-[var(--charm-ink-soft)]">Renewal: {format(new Date(partnership.endDate), 'MMM d, yyyy')}</p>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-1.5">
        {hasLogsThisPeriod && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              undoLastPartnershipDeliverable(partnership.id)
            }}
            className="gap-1"
          >
            <Undo2 className="size-3.5" /> Undo
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            logPartnershipDeliverable(partnership.id)
          }}
          className="gap-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
        >
          <Plus className="size-3.5" /> Log delivered
        </Button>
      </div>

      {canConfirmPayment && cycleWindow && (
        <div className="flex items-center justify-between gap-1.5 border-t border-white/40 pt-2.5">
          <p className="text-[10px] text-[var(--charm-ink-soft)]">
            {cycleConfirmed
              ? `Payment confirmed for ${format(cycleWindow.start, 'MMM d')} – ${format(cycleWindow.end, 'MMM d')}`
              : `No payment confirmed yet for ${format(cycleWindow.start, 'MMM d')} – ${format(cycleWindow.end, 'MMM d')}`}
          </p>
          <div className="flex shrink-0 gap-1.5">
            {cycleConfirmed && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  undoLastPartnershipPayment(partnership.id)
                }}
                className="gap-1"
              >
                <Undo2 className="size-3.5" /> Undo
              </Button>
            )}
            {!cycleConfirmed && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  markPartnershipCyclePaid(partnership.id)
                }}
                className="gap-1"
              >
                <CircleDollarSign className="size-3.5" /> Mark cycle paid
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
