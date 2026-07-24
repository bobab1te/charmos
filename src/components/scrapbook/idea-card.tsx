import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Repeat2 } from 'lucide-react'
import { WidgetColorPicker } from '#/components/charm/widget-color-picker'
import { useCharmStore } from '#/lib/charm-store'
import { cn } from '#/lib/utils'
import { defaultCardColor, glassBackground, resolveTextColor } from '#/lib/widget-colors'
import type { IdeaPost } from '#/lib/types'

export function IdeaCardContent({
  idea,
  compact,
  textColor,
  softTextColor,
  onColorChange,
}: {
  idea: IdeaPost
  compact?: boolean
  textColor?: string
  softTextColor?: string
  onColorChange?: (color: string | null) => void
}) {
  const color = idea.color ?? defaultCardColor(idea.id)
  return (
    <div className={cn('flex flex-col gap-1', compact ? 'p-1.5' : 'p-3')}>
      <div className="flex items-start justify-between gap-2">
        <p
          className={cn('font-medium', compact ? 'truncate text-[11px] leading-tight' : 'text-sm')}
          style={{ color: textColor }}
        >
          {idea.title}
        </p>
        {!compact && onColorChange && <WidgetColorPicker color={color} onChange={onColorChange} label="Change idea color" />}
      </div>
      {!compact && idea.hook && (
        <p className="line-clamp-2 text-xs" style={{ color: softTextColor }}>
          {idea.hook}
        </p>
      )}
      {!compact && idea.series && (
        <span
          className="mt-0.5 flex w-fit items-center gap-1 rounded-full bg-black/10 px-1.5 py-0.5 text-[10px] font-medium"
          style={{ color: softTextColor }}
        >
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
  const { updateIdeaColor } = useCharmStore()
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: idea.id })
  const color = idea.color ?? defaultCardColor(idea.id)
  const textColor = resolveTextColor(color)
  const softTextColor = textColor === '#ffffff' ? 'rgba(255,255,255,0.75)' : 'rgba(26,18,32,0.65)'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(idea.id)}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.35 : 1,
        background: glassBackground(color),
      }}
      className={cn(
        // charm-glass-lite (not full charm-glass) even for the non-compact idea bank list: unlike
        // deals/partnerships, this list has no cap on how many cards render at once, so it's the
        // one card type where backdrop-blur's cost is genuinely open-ended rather than bounded by
        // a handful of dashboard widgets or kanban columns.
        'charm-glass-lite cursor-grab rounded-xl transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md active:cursor-grabbing',
        rotateClass,
      )}
    >
      <IdeaCardContent
        idea={idea}
        compact={compact}
        textColor={textColor}
        softTextColor={softTextColor}
        onColorChange={(next) => updateIdeaColor(idea.id, next)}
      />
    </div>
  )
}
