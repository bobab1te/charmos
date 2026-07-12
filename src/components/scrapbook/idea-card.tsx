import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Repeat2 } from 'lucide-react'
import { cn } from '#/lib/utils'
import type { IdeaPost } from '#/lib/types'

const NOTE_COLORS = [
  'bg-[var(--charm-pink)]',
  'bg-[var(--charm-yellow)]',
  'bg-[var(--charm-blue)]',
  'bg-[var(--charm-lavender)]',
]

/** Deterministic per-idea color so the same idea always looks the same, without needing to persist a color choice. */
export function ideaNoteColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  return NOTE_COLORS[hash % NOTE_COLORS.length]
}

export function IdeaCardContent({ idea, compact }: { idea: IdeaPost; compact?: boolean }) {
  return (
    <div className={cn('flex flex-col gap-1', compact ? 'p-1.5' : 'p-3')}>
      <p className={cn('font-medium text-[var(--charm-ink)]', compact ? 'truncate text-[11px] leading-tight' : 'text-sm')}>
        {idea.title}
      </p>
      {!compact && idea.hook && <p className="line-clamp-2 text-xs text-[var(--charm-ink)]/70">{idea.hook}</p>}
      {!compact && idea.series && (
        <span className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-medium text-[var(--charm-ink)]/80">
          <Repeat2 className="size-2.5" /> {idea.series}
        </span>
      )}
    </div>
  )
}

interface DraggableIdeaCardProps {
  idea: IdeaPost
  onOpen: (ideaId: string) => void
  compact?: boolean
  rotateClass?: string
}

export function DraggableIdeaCard({ idea, onOpen, compact, rotateClass }: DraggableIdeaCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(idea.id)}
      style={{ transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.35 : 1 }}
      className={cn(
        'cursor-grab rounded-xl shadow-sm transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing',
        ideaNoteColor(idea.id),
        rotateClass,
      )}
    >
      <IdeaCardContent idea={idea} compact={compact} />
    </div>
  )
}
