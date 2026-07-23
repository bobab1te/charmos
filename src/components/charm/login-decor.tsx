import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { Hash, Search, Sparkles } from 'lucide-react'
import { CloudShape } from './decorative-shapes'
import { cn } from '#/lib/utils'

interface Sticker {
  label: string
  icon: ReactNode
  style: CSSProperties
  className: string
}

const STICKERS: Array<Sticker> = [
  {
    label: 'organized',
    icon: <Sparkles className="size-3.5" />,
    style: { top: '6%', left: '2%', transform: 'rotate(-7deg)' },
    className: 'bg-[var(--charm-lavender-deep)] text-white font-display italic',
  },
  {
    label: 'curious',
    icon: <Search className="size-3.5" />,
    style: { top: '0%', left: '40%', transform: 'rotate(-2deg)' },
    className: 'bg-[var(--charm-pink)] text-[var(--charm-ink)]',
  },
  {
    label: 'on-brand',
    icon: <Hash className="size-3.5" />,
    style: { top: '18%', right: '4%', transform: 'rotate(4deg)' },
    className: 'bg-[var(--charm-blue-deep)] text-white font-display-bold',
  },
  {
    label: 'clean-ish',
    icon: <Sparkles className="size-3.5" />,
    style: { bottom: '30%', left: '0%', transform: 'rotate(5deg)' },
    className: 'bg-[var(--charm-beige)] text-[var(--charm-ink)]',
  },
]

const CORNER_HANDLES = ['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5']

/** Size of the cursor-following selection box, in px — 60% bigger than its original 200x120. */
const BOX_SIZE = { width: 320, height: 192 }

/** Purely decorative — the moodboard-inspired sticker collage + dashed "selection box" that
 * trails the cursor around the login screen. */
export function LoginDecor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boxPos, setBoxPos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setBoxPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  return (
    <div ref={containerRef} className="pointer-events-none absolute inset-0 hidden overflow-visible xl:block" aria-hidden="true">
      <div
        className="absolute rounded-2xl border-2 border-dashed border-[var(--charm-ink-soft)]/35 transition-[left,top] duration-300 ease-out"
        style={{
          left: boxPos ? boxPos.x - BOX_SIZE.width / 2 : '4%',
          top: boxPos ? boxPos.y - BOX_SIZE.height / 2 : '10%',
          width: BOX_SIZE.width,
          height: BOX_SIZE.height,
          opacity: boxPos ? 1 : 0,
        }}
      >
        {CORNER_HANDLES.map((pos) => (
          <span
            key={pos}
            className={cn('absolute size-3 rounded-[3px] border border-[var(--charm-ink-soft)]/60 bg-white', pos)}
          />
        ))}
      </div>

      {STICKERS.map((sticker) => (
        <div
          key={sticker.label}
          style={sticker.style}
          className={cn(
            'absolute flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium shadow-lg',
            sticker.className,
          )}
        >
          {sticker.icon}
          {sticker.label}
        </div>
      ))}

      <div className="absolute bottom-[8%] right-[6%] rotate-3 text-[var(--charm-pink-deep)]">
        <CloudShape size={160} color="currentColor" />
        <span className="absolute inset-0 flex -rotate-3 items-center justify-center gap-1.5 pb-2 font-display-bold text-sm text-white">
          <Sparkles className="size-3.5" /> playful
        </span>
      </div>

      <svg
        width="22"
        height="22"
        viewBox="0 0 22 22"
        fill="var(--urgency-green)"
        className="absolute bottom-[3%] right-[2%]"
      >
        <path d="M3 2 L19 9 L11 11.5 L9 19 Z" />
      </svg>
    </div>
  )
}
