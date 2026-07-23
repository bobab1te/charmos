import { useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
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
import { AlertTriangle, Briefcase, Plus, Upload } from 'lucide-react'
import { WidgetCard } from '#/components/charm/widget-card'
import { WidgetColorPicker } from '#/components/charm/widget-color-picker'
import { Button } from '#/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '#/components/ui/tooltip'
import { DealModal } from '#/components/deals/deal-modal'
import { BulkImportModal } from '#/components/deals/bulk-import-modal'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { isDealUnpaidAlert, nextDeliverable, urgencyForDate } from '#/lib/derived'
import { readDraft, writeDraft } from '#/lib/form-draft'
import { cn } from '#/lib/utils'
import { defaultCardColor, resolveTextColor } from '#/lib/widget-colors'
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

function DealCardNotes({
  dealId,
  notes,
  softTextColor,
  onNotesChange,
}: {
  dealId: string
  notes: string | undefined
  softTextColor: string
  onNotesChange?: (dealId: string, notes: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(notes ?? '')

  if (!onNotesChange) {
    if (!notes) return null
    return (
      <p className="mt-1.5 line-clamp-2 text-xs italic" style={{ color: softTextColor }}>
        {notes}
      </p>
    )
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        rows={2}
        value={draft}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          setEditing(false)
          if (draft.trim() !== (notes ?? '')) onNotesChange(dealId, draft)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setDraft(notes ?? '')
            setEditing(false)
          }
        }}
        placeholder="Add a note..."
        className="mt-1.5 w-full resize-none rounded-lg border border-black/10 bg-white/60 p-1.5 text-xs text-[var(--charm-ink)] outline-none focus:border-[var(--accent)]"
      />
    )
  }

  return (
    <p
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation()
        setDraft(notes ?? '')
        setEditing(true)
      }}
      className={cn(
        'mt-1.5 line-clamp-2 cursor-text rounded-lg px-1.5 py-1 text-xs transition duration-150 ease-out hover:bg-black/5',
        !notes && 'italic opacity-70',
      )}
      style={{ color: softTextColor }}
    >
      {notes || 'Add a note...'}
    </p>
  )
}

function DealCardInner({
  deal,
  brandName,
  onOpen,
  onColorChange,
  onNotesChange,
}: {
  deal: BrandDeal
  brandName: string
  onOpen?: (dealId: string) => void
  onColorChange?: (color: string | null) => void
  onNotesChange?: (dealId: string, notes: string) => void
}) {
  const next = nextDeliverable(deal)
  const color = deal.color ?? defaultCardColor(deal.id)
  const textColor = resolveTextColor(color)
  const softTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(26,18,32,0.65)'
  const isUnpaid = isDealUnpaidAlert(deal)
  const { displayCurrency, convert } = useCurrency()
  const showsConverted = deal.compensationCurrency !== displayCurrency

  return (
    <div
      onClick={onOpen ? () => onOpen(deal.id) : undefined}
      className="charm-glass cursor-grab rounded-xl p-3 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] active:cursor-grabbing"
      style={{ background: `color-mix(in oklab, ${color} 82%, var(--surface-strong))`, color: textColor }}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold">{brandName}</p>
        <div className="flex shrink-0 items-center gap-1.5">
          {isUnpaid && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="flex items-center gap-0.5 rounded-full bg-[var(--urgency-red)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--urgency-red)]">
                  <AlertTriangle className="size-3" /> Unpaid
                </span>
              </TooltipTrigger>
              <TooltipContent>
                {deal.expectedPayoutDate
                  ? `Expected payout of ${format(new Date(deal.expectedPayoutDate), 'MMM d')} has passed and this isn't marked paid in full yet — follow up with the brand?`
                  : `${deal.stage === 'completed' ? 'Completed' : 'Live'} but not yet marked paid in full — follow up with the brand?`}
              </TooltipContent>
            </Tooltip>
          )}
          {onColorChange && <WidgetColorPicker color={color} onChange={onColorChange} />}
        </div>
      </div>
      {next ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: softTextColor }}>
          <span
            className={cn('size-1.5 rounded-full ring-1 ring-black/10', urgencyDot[urgencyForDate(next.dueDate)])}
          />
          {format(new Date(next.dueDate), 'MMM d')} · {next.type}
        </div>
      ) : (
        <p className="mt-1.5 text-xs" style={{ color: softTextColor }}>
          No pending deliverables
        </p>
      )}
      <p className="mt-1.5 text-xs font-semibold" style={{ color: textColor }}>
        {new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: deal.compensationCurrency,
          maximumFractionDigits: 0,
        }).format(deal.compensationAmount)}
        {showsConverted && (
          <span className="ml-1 font-medium" style={{ color: softTextColor }}>
            (≈{' '}
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: displayCurrency,
              maximumFractionDigits: 0,
            }).format(convert(deal.compensationAmount, deal.compensationCurrency))}
            )
          </span>
        )}
      </p>
      <DealCardNotes
        dealId={deal.id}
        notes={deal.notes}
        softTextColor={softTextColor}
        onNotesChange={onNotesChange}
      />
    </div>
  )
}

function DraggableDealCard({
  deal,
  brandName,
  onOpen,
  onColorChange,
  onNotesChange,
}: {
  deal: BrandDeal
  brandName: string
  onOpen: (dealId: string) => void
  onColorChange: (dealId: string, color: string | null) => void
  onNotesChange: (dealId: string, notes: string) => void
}) {
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
      <DealCardInner
        deal={deal}
        brandName={brandName}
        onOpen={onOpen}
        onColorChange={(color) => onColorChange(deal.id, color)}
        onNotesChange={onNotesChange}
      />
    </div>
  )
}

function DroppableColumn({
  id,
  label,
  deals,
  brandName,
  onOpen,
  onColorChange,
  onNotesChange,
}: {
  id: DealStage
  label: string
  deals: Array<BrandDeal>
  brandName: (id: string) => string
  onOpen: (dealId: string) => void
  onColorChange: (dealId: string, color: string | null) => void
  onNotesChange: (dealId: string, notes: string) => void
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
        <DraggableDealCard
          key={deal.id}
          deal={deal}
          brandName={brandName(deal.brandId)}
          onOpen={onOpen}
          onColorChange={onColorChange}
          onNotesChange={onNotesChange}
        />
      ))}
    </div>
  )
}

function StaticColumn({
  label,
  deals,
  brandName,
  onOpen,
}: {
  label: string
  deals: Array<BrandDeal>
  brandName: (id: string) => string
  onOpen: (dealId: string) => void
}) {
  return (
    <div className="flex min-h-[220px] flex-col gap-2 rounded-2xl border border-dashed border-white/40 p-2.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">{label}</span>
        <span className="rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium text-[var(--charm-ink-soft)]">
          {deals.length}
        </span>
      </div>
      {deals.map((deal) => (
        <DealCardInner key={deal.id} deal={deal} brandName={brandName(deal.brandId)} onOpen={onOpen} />
      ))}
    </div>
  )
}

export function DealPipeline({
  onHide,
  onlyUnpaid,
  initialOpenDealId,
}: { onHide?: () => void; onlyUnpaid?: boolean; initialOpenDealId?: string } = {}) {
  const { deals, brandById, moveDeal, updateDealColor, updateDealNotes } = useCharmStore()
  const [activeDeal, setActiveDeal] = useState<BrandDeal | null>(null)
  const [interactive, setInteractive] = useState(false)
  // Persisted (not plain useState) so the "New Deal"/"Edit Deal" modal stays open across a full
  // unmount — navigating to another section and back, or a browser tab switch — instead of just
  // silently disappearing along with whatever the user had typed into it.
  const [modalOpen, setModalOpen] = useState(() => readDraft<boolean>('charmos:deal-modal-open') ?? false)
  const [editingDealId, setEditingDealId] = useState<string | undefined>(
    () => readDraft<string | undefined>('charmos:deal-modal-editing-id') ?? undefined,
  )
  const [importModalOpen, setImportModalOpen] = useState(
    () => readDraft<boolean>('charmos:bulk-import-modal-open') ?? false,
  )
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  useEffect(() => writeDraft('charmos:deal-modal-open', modalOpen), [modalOpen])
  useEffect(() => writeDraft('charmos:deal-modal-editing-id', editingDealId), [editingDealId])
  useEffect(() => writeDraft('charmos:bulk-import-modal-open', importModalOpen), [importModalOpen])

  function openNewDeal() {
    setEditingDealId(undefined)
    setModalOpen(true)
  }

  function openDeal(dealId: string) {
    setEditingDealId(dealId)
    setModalOpen(true)
  }

  // Deep-link support for "View deal" from a Finances ledger entry.
  useEffect(() => {
    if (initialOpenDealId) openDeal(initialOpenDealId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run for the search param present on arrival
  }, [initialOpenDealId])

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
    const visible = deals.filter((d) => !d.archived && (!onlyUnpaid || isDealUnpaidAlert(d)))
    visible.forEach((d) => grouped[d.stage].push(d))
    return grouped
  }, [deals, onlyUnpaid])

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

  const pipelineCard = (
    <WidgetCard
      title="Deal Pipeline"
      icon={<Briefcase className="size-4" />}
      onHide={onHide}
      headerAction={
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setImportModalOpen(true)}
            className="gap-1"
          >
            <Upload className="size-3.5" /> Import Deals
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={openNewDeal}
            className="gap-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            <Plus className="size-3.5" /> New Deal
          </Button>
        </div>
      }
    >
      {onlyUnpaid && (
        <div className="mb-3 flex items-center justify-between gap-2 rounded-xl bg-[var(--urgency-red)]/10 px-3 py-2 text-xs font-medium text-[var(--urgency-red)]">
          Showing unpaid deals only
          <Link to="/brand-deals" className="underline underline-offset-2 hover:opacity-80">
            Clear filter
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) =>
          interactive ? (
            <DroppableColumn
              key={col.id}
              id={col.id}
              label={col.label}
              deals={dealsByStage[col.id]}
              brandName={brandName}
              onOpen={openDeal}
              onColorChange={updateDealColor}
              onNotesChange={updateDealNotes}
            />
          ) : (
            <StaticColumn
              key={col.id}
              label={col.label}
              deals={dealsByStage[col.id]}
              brandName={brandName}
              onOpen={openDeal}
            />
          ),
        )}
      </div>
      <DealModal open={modalOpen} onOpenChange={setModalOpen} dealId={editingDealId} />
      <BulkImportModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </WidgetCard>
  )

  // DndContext/DragOverlay are kept as siblings of WidgetCard rather than nested inside it: WidgetCard is a
  // motion.section with `layout`, and Framer Motion's layout animations apply a CSS transform to it, which would
  // create a new containing block for DragOverlay's `position: fixed` and throw off its cursor tracking.
  if (!interactive) return pipelineCard

  return (
    <DndContext id="deal-pipeline" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {pipelineCard}
      <DragOverlay>
        {activeDeal ? <DealCardInner deal={activeDeal} brandName={brandName(activeDeal.brandId)} /> : null}
      </DragOverlay>
    </DndContext>
  )
}
