import { useMemo, useState } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { Archive, Bell, Trash2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '#/components/ui/popover'
import { Button } from '#/components/ui/button'
import { DealModal } from '#/components/deals/deal-modal'
import { useCharmStore } from '#/lib/charm-store'
import { isDealDueSoon, isDealGhosted, isDealStaleCompleted, nextDeliverable, urgencyForDate } from '#/lib/derived'
import { cn } from '#/lib/utils'
import type { BrandDeal } from '#/lib/types'

function GhostedRow({
  deal,
  brandName,
  onOpen,
}: {
  deal: BrandDeal
  brandName: string
  onOpen: (dealId: string) => void
}) {
  const { archiveDeal, deleteDeal } = useCharmStore()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const daysQuiet = differenceInCalendarDays(new Date(), new Date(deal.stageUpdatedAt))

  if (confirmingDelete) {
    return (
      <div className="flex flex-col gap-2 rounded-xl bg-[var(--urgency-red)]/10 p-2.5">
        <p className="text-xs font-medium text-[var(--charm-ink)]">Delete this deal permanently?</p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => deleteDeal(deal.id)}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Confirm delete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-white/50 p-2.5">
      <button type="button" onClick={() => onOpen(deal.id)} className="text-left">
        <p className="text-sm font-medium text-[var(--charm-ink)]">{brandName}</p>
        <p className="text-xs text-[var(--charm-ink-soft)]">No update in {daysQuiet} days — possibly ghosted</p>
      </button>
      <div className="flex justify-end gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={() => archiveDeal(deal.id)} className="gap-1">
          <Archive className="size-3.5" /> Archive
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmingDelete(true)}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

function StaleCompletedRow({
  deal,
  brandName,
  onOpen,
}: {
  deal: BrandDeal
  brandName: string
  onOpen: (dealId: string) => void
}) {
  const { archiveDeal } = useCharmStore()
  const daysSince = differenceInCalendarDays(new Date(), new Date(deal.stageUpdatedAt))

  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/50 p-2.5">
      <button type="button" onClick={() => onOpen(deal.id)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-medium text-[var(--charm-ink)]">{brandName}</p>
        <p className="text-xs text-[var(--charm-ink-soft)]">
          Completed on {format(new Date(deal.stageUpdatedAt), 'MMM d, yyyy')} ({daysSince} days ago)
        </p>
      </button>
      <Button type="button" variant="outline" size="sm" onClick={() => archiveDeal(deal.id)} className="shrink-0 gap-1">
        <Archive className="size-3.5" /> Archive?
      </Button>
    </div>
  )
}

export function NotificationBell() {
  const { deals, brandById } = useCharmStore()
  const [openDealId, setOpenDealId] = useState<string | null>(null)
  // Controlled (not just PopoverTrigger's default toggle) so opening a deal from a row can
  // also close the panel — Radix never does this on its own, since a click on a row's own
  // content isn't an "outside" interaction, so the panel would otherwise stay open behind
  // the deal modal and reappear once that's closed.
  const [panelOpen, setPanelOpen] = useState(false)
  const brandName = (id: string) => brandById(id)?.name ?? 'Unknown brand'

  function openDeal(dealId: string) {
    setOpenDealId(dealId)
    setPanelOpen(false)
  }

  const dueSoon = useMemo(
    () =>
      deals
        .filter((d) => isDealDueSoon(d))
        .sort((a, b) => {
          const nextA = nextDeliverable(a)
          const nextB = nextDeliverable(b)
          return new Date(nextA?.dueDate ?? 0).getTime() - new Date(nextB?.dueDate ?? 0).getTime()
        }),
    [deals],
  )
  const ghosted = useMemo(() => deals.filter((d) => isDealGhosted(d)), [deals])
  const staleCompleted = useMemo(() => deals.filter((d) => isDealStaleCompleted(d)), [deals])
  const count = dueSoon.length + ghosted.length + staleCompleted.length

  return (
    <>
      <Popover open={panelOpen} onOpenChange={setPanelOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Notifications"
            className="relative rounded-full p-1.5 text-[var(--charm-ink-soft)] transition duration-150 ease-out hover:bg-white/50 hover:text-[var(--charm-ink)] active:scale-90"
          >
            <Bell className="size-4" />
            {count > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--urgency-red)] text-[9px] font-semibold text-white">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 max-h-[70vh] overflow-y-auto p-3">
          {count === 0 ? (
            <p className="p-2 text-sm text-[var(--charm-ink-soft)]">You're all caught up — no alerts right now.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {dueSoon.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
                    Due soon
                  </h3>
                  {dueSoon.map((deal) => {
                    const next = nextDeliverable(deal)
                    return (
                      <button
                        key={deal.id}
                        type="button"
                        onClick={() => openDeal(deal.id)}
                        className="flex flex-col gap-0.5 rounded-xl bg-white/50 p-2.5 text-left transition duration-150 ease-out hover:bg-white/70"
                      >
                        <div className="flex items-center gap-1.5">
                          <span
                            className={cn(
                              'size-1.5 rounded-full',
                              next && urgencyForDate(next.dueDate) === 'red' ? 'bg-[var(--urgency-red)]' : 'bg-[var(--urgency-orange)]',
                            )}
                          />
                          <p className="text-sm font-medium text-[var(--charm-ink)]">{brandName(deal.brandId)}</p>
                        </div>
                        {next && (
                          <p className="text-xs text-[var(--charm-ink-soft)]">
                            {next.type} due {new Date(next.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {ghosted.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
                    Possible ghosting
                  </h3>
                  {ghosted.map((deal) => (
                    <GhostedRow key={deal.id} deal={deal} brandName={brandName(deal.brandId)} onOpen={openDeal} />
                  ))}
                </div>
              )}

              {staleCompleted.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">
                    Ready to archive
                  </h3>
                  {staleCompleted.map((deal) => (
                    <StaleCompletedRow
                      key={deal.id}
                      deal={deal}
                      brandName={brandName(deal.brandId)}
                      onOpen={openDeal}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </PopoverContent>
      </Popover>

      <DealModal open={Boolean(openDealId)} onOpenChange={(open) => !open && setOpenDealId(null)} dealId={openDealId ?? undefined} />
    </>
  )
}
