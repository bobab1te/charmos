import { useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useDraggable } from '@dnd-kit/core'
import { format } from 'date-fns'
import { Briefcase } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { useCharmStore } from '#/lib/charm-store'
import { nextDeliverable, urgencyForDate } from '#/lib/derived'
import { cn } from '#/lib/utils'
import type { BrandDeal, DealStage } from '#/lib/types'

const COLUMNS: Array<{ id: DealStage; label: string }> = [
  { id: 'negotiating', label: 'Negotiating' },
  { id: 'confirmed', label: 'Confirmed' },
  { id: 'live', label: 'Live' },
  { id: 'completed', label: 'Completed' },
]

const urgencyDot: Record<string, string> = {
  red: 'bg-[var(--urgency-red)]',
  orange: 'bg-[var(--urgency-orange)]',
  green: 'bg-[var(--urgency-green)]',
}

function DealCardInner({ deal, brandName }: { deal: BrandDeal; brandName: string }) {
  const next = nextDeliverable(deal)
  return (
    <div className="charm-glass cursor-grab rounded-xl p-3 active:cursor-grabbing">
      <p className="text-sm font-semibold text-[var(--charm-ink)]">{brandName}</p>
      {next ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--charm-ink-soft)]">
          <span className={cn('size-1.5 rounded-full', urgencyDot[urgencyForDate(next.dueDate)])} />
          {format(new Date(next.dueDate), 'MMM d')} · {next.type}
        </div>
      ) : (
        <p className="mt-1.5 text-xs text-[var(--charm-ink-soft)]">No pending deliverables</p>
      )}
      <p className="mt-1.5 text-xs font-medium text-[var(--accent)]">
        {new Intl.NumberFormat('en-US', { style: 'currency', currency: deal.compensationCurrency, maximumFractionDigits: 0 }).format(
          deal.compensationAmount,
        )}
      </p>
    </div>
  )
}

function DraggableDealCard({ deal, brandName }: { deal: BrandDeal; brandName: string }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    data: { stage: deal.stage },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
      }}
    >
      <DealCardInner deal={deal} brandName={brandName} />
    </div>
  )
}

function DroppableColumn({
  id,
  label,
  deals,
  brandName,
}: {
  id: DealStage
  label: string
  deals: Array<BrandDeal>
  brandName: (id: string) => string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[220px] flex-col gap-2 rounded-2xl border border-dashed p-2.5 transition-colors',
        isOver ? 'border-[var(--accent)] bg-white/30' : 'border-white/40',
      )}
    >
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">{label}</span>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium text-[var(--charm-ink-soft)]">
          {deals.length}
        </span>
      </div>
      {deals.map((deal) => (
        <DraggableDealCard key={deal.id} deal={deal} brandName={brandName(deal.brandId)} />
      ))}
    </div>
  )
}

function StaticColumn({ label, deals, brandName }: { label: string; deals: Array<BrandDeal>; brandName: (id: string) => string }) {
  return (
    <div className="flex min-h-[220px] flex-col gap-2 rounded-2xl border border-dashed border-white/40 p-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">{label}</span>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium text-[var(--charm-ink-soft)]">
          {deals.length}
        </span>
      </div>
      {deals.map((deal) => (
        <DealCardInner key={deal.id} deal={deal} brandName={brandName(deal.brandId)} />
      ))}
    </div>
  )
}

export function DealPipeline({ onHide }: { onHide: () => void }) {
  const { deals, brandById, moveDeal } = useCharmStore()
  const [activeDeal, setActiveDeal] = useState<BrandDeal | null>(null)
  const [interactive, setInteractive] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // dnd-kit generates internal ids that can drift between the SSR pass and
  // the first client render; mounting it only after hydration avoids that
  // hydration-mismatch warning entirely.
  useEffect(() => setInteractive(true), [])

  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Array<BrandDeal>> = {
      negotiating: [],
      confirmed: [],
      live: [],
      completed: [],
    }
    deals.forEach((d) => grouped[d.stage].push(d))
    return grouped
  }, [deals])

  function handleDragStart(event: DragStartEvent) {
    const deal = deals.find((d) => d.id === event.active.id)
    setActiveDeal(deal ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDeal(null)
    const { active, over } = event
    if (!over) return
    const targetStage = COLUMNS.some((c) => c.id === over.id)
      ? (over.id as DealStage)
      : deals.find((d) => d.id === over.id)?.stage
    if (!targetStage) return
    const deal = deals.find((d) => d.id === active.id)
    if (deal && deal.stage !== targetStage) {
      moveDeal(deal.id, targetStage)
    }
  }

  const brandName = (id: string) => brandById(id)?.name ?? 'Unknown brand'

  return (
    <WidgetCard title="Deal Pipeline" icon={<Briefcase className="size-4" />} onHide={onHide}>
      {interactive ? (
        <DndContext id="deal-pipeline" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {COLUMNS.map((col) => (
              <DroppableColumn key={col.id} id={col.id} label={col.label} deals={dealsByStage[col.id]} brandName={brandName} />
            ))}
          </div>
          <DragOverlay>
            {activeDeal ? <DealCardInner deal={activeDeal} brandName={brandName(activeDeal.brandId)} /> : null}
          </DragOverlay>
        </DndContext>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {COLUMNS.map((col) => (
            <StaticColumn key={col.id} label={col.label} deals={dealsByStage[col.id]} brandName={brandName} />
          ))}
        </div>
      )}
    </WidgetCard>
  )
}
