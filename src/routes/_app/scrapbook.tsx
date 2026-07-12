import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core'
import { NotebookPen, Plus } from 'lucide-react'
import { ScrapbookCalendar } from '#/components/scrapbook/scrapbook-calendar'
import { DraggableIdeaCard, IdeaCardContent, ideaNoteColor } from '#/components/scrapbook/idea-card'
import { IdeaDetailModal } from '#/components/scrapbook/idea-detail-modal'
import { useCharmStore } from '#/lib/charm-store'
import { cn } from '#/lib/utils'
import type { IdeaPost } from '#/lib/types'

export const Route = createFileRoute('/_app/scrapbook')({ component: ScrapbookPage })

const UNSCHEDULED_ZONE_ID = 'unscheduled-zone'
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const NOTE_ROTATIONS = ['-rotate-1', 'rotate-1', '-rotate-2', 'rotate-2']

function UnscheduledList({
  ideas,
  onOpenIdea,
}: {
  ideas: Array<IdeaPost>
  onOpenIdea: (ideaId: string) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: UNSCHEDULED_ZONE_ID })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex min-h-[200px] flex-col gap-2.5 rounded-2xl border border-dashed p-3 transition-colors duration-150 ease-out',
        isOver ? 'border-[var(--accent)] bg-[var(--accent)]/5' : 'border-transparent',
      )}
    >
      {ideas.length === 0 ? (
        <p className="p-2 text-sm text-[var(--charm-ink-soft)]">
          No unscheduled ideas. Add one above, or drag one back here to unschedule it.
        </p>
      ) : (
        ideas.map((idea, i) => (
          <DraggableIdeaCard
            key={idea.id}
            idea={idea}
            onOpen={onOpenIdea}
            rotateClass={NOTE_ROTATIONS[i % NOTE_ROTATIONS.length]}
          />
        ))
      )}
    </div>
  )
}

function ScrapbookPage() {
  const { ideas, addIdea, assignIdeaDate, unassignIdeaDate } = useCharmStore()
  const [interactive, setInteractive] = useState(false)
  const [activeIdea, setActiveIdea] = useState<IdeaPost | null>(null)
  const [openIdeaId, setOpenIdeaId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  // dnd-kit generates internal ids that can drift between the SSR pass and
  // the first client render; mounting it only after hydration avoids that
  // hydration-mismatch warning entirely (same fix as the deal pipeline).
  useEffect(() => setInteractive(true), [])

  const unscheduled = ideas
    .filter((i) => !i.scheduledDate)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

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

  function handleDragStart(event: DragStartEvent) {
    const idea = ideas.find((i) => i.id === event.active.id)
    setActiveIdea(idea ?? null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveIdea(null)
    const { active, over } = event
    if (!over) return
    const overId = String(over.id)

    if (DATE_KEY_PATTERN.test(overId)) {
      assignIdeaDate(String(active.id), new Date(`${overId}T00:00:00`).toISOString())
    } else if (overId === UNSCHEDULED_ZONE_ID) {
      unassignIdeaDate(String(active.id))
    }
  }

  const calendarAndList = (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
      <ScrapbookCalendar ideas={ideas} onOpenIdea={setOpenIdeaId} />

      <div className="charm-glass flex flex-col gap-3 rounded-2xl p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-semibold text-[var(--charm-ink)]">Idea bank</h2>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="flex items-center gap-1 rounded-full bg-[var(--accent)] px-2.5 py-1 text-xs font-semibold text-[var(--accent-foreground)] transition duration-150 ease-out hover:opacity-90 hover:shadow-md active:scale-95"
          >
            <Plus className="size-3.5" /> Add idea
          </button>
        </div>

        {adding && (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={commitDraft}
            placeholder="Quick concept..."
            className="w-full rounded-xl border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-[var(--charm-ink-soft)]"
          />
        )}

        <UnscheduledList ideas={unscheduled} onOpenIdea={setOpenIdeaId} />
      </div>
    </div>
  )

  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="mt-2 flex items-center gap-2 font-display-bold text-3xl font-semibold text-[var(--charm-ink)]">
          <NotebookPen className="size-7" /> Content & Idea Scrapbook
        </h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">
          Every raw concept lives here — drag one onto a date to schedule it, or click any card to flesh it out.
        </p>
      </div>

      {interactive ? (
        <DndContext id="scrapbook" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {calendarAndList}
          <DragOverlay>
            {activeIdea ? (
              <div className={cn('w-56 rounded-xl shadow-lg', ideaNoteColor(activeIdea.id))}>
                <IdeaCardContent idea={activeIdea} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : (
        calendarAndList
      )}

      <IdeaDetailModal ideaId={openIdeaId} onOpenChange={(open) => !open && setOpenIdeaId(null)} />
    </div>
  )
}
