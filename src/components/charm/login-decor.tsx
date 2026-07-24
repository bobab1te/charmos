import { useEffect, useRef, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Hash, Search, Sparkles } from 'lucide-react'
import { CloudShape, FlowerShape } from './decorative-shapes'
import { cn } from '#/lib/utils'

interface Sticker {
  label: string
  icon: ReactNode
  style: CSSProperties
  /** Base color the glass tint is mixed from — kept separate from textClassName so the tint can change without touching text contrast. */
  color: string
  textClassName: string
  driftX: number
  driftDuration: number
}

const STICKERS: Array<Sticker> = [
  {
    label: 'organized',
    icon: <Sparkles className="size-3.5" />,
    style: { top: '6%', left: '5%', transform: 'rotate(-7deg)' },
    color: 'var(--charm-lavender-deep)',
    textClassName: 'text-white font-display italic',
    driftX: 8,
    driftDuration: 16,
  },
  {
    label: 'curious',
    icon: <Search className="size-3.5" />,
    style: { top: '4%', left: '40%', transform: 'rotate(-2deg)' },
    color: 'var(--charm-pink)',
    textClassName: 'text-[var(--charm-ink)]',
    driftX: -9,
    driftDuration: 19,
  },
  {
    label: 'on-brand',
    icon: <Hash className="size-3.5" />,
    style: { top: '18%', right: '4%', transform: 'rotate(4deg)' },
    color: 'var(--charm-blue-deep)',
    textClassName: 'text-white font-display-bold',
    driftX: 10,
    driftDuration: 14,
  },
  {
    label: 'clean-ish',
    icon: <Sparkles className="size-3.5" />,
    style: { bottom: '30%', left: '5%', transform: 'rotate(5deg)' },
    color: 'var(--charm-beige)',
    textClassName: 'text-[var(--charm-ink)]',
    driftX: -8,
    driftDuration: 21,
  },
]

/** A few extra ambient clouds/flowers, blurred and drifting — same palette/recipe as the main
 * app's decorative-shapes.tsx, kept away from the viewport edges same as the stickers above. */
const EXTRA_SHAPES = [
  { kind: 'cloud' as const, top: '36%', left: '14%', size: 130, color: '#ffffff', opacity: 0.3, driftX: 12, driftDuration: 18 },
  { kind: 'cloud' as const, bottom: '14%', left: '34%', size: 110, color: 'var(--charm-blue)', opacity: 0.32, driftX: -10, driftDuration: 15 },
  { kind: 'flower' as const, top: '46%', right: '14%', size: 90, color: 'var(--charm-pink)', opacity: 0.26, driftX: 9, driftDuration: 20 },
  { kind: 'flower' as const, bottom: '42%', right: '26%', size: 75, color: '#ffffff', opacity: 0.26, driftX: -8, driftDuration: 17 },
]

const CORNER_HANDLES = ['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5']

/** Size of the cursor-following selection box, in px — 60% bigger than its original 200x120. */
const BOX_SIZE = { width: 320, height: 192 }

/** Glass tint mixed straight with transparent (not --surface-strong) since these sit over the
 * colorful mesh background, not a neutral card surface — mixing toward a surface color here
 * would just look muddy. */
function glassChipStyle(color: string): CSSProperties {
  return {
    background: `color-mix(in oklab, ${color} 72%, transparent)`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.35)',
    boxShadow: '0 8px 20px rgba(58, 46, 66, 0.16)',
  }
}

/** Purely decorative — the moodboard-inspired sticker collage + dashed "selection box" that
 * trails the cursor around the login screen. */
export function LoginDecor() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [boxPos, setBoxPos] = useState<{ x: number; y: number } | null>(null)
  const prefersReducedMotion = useReducedMotion()

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

      {EXTRA_SHAPES.map((shape, i) => {
        const style: CSSProperties = {
          top: shape.top,
          left: shape.left,
          right: shape.right,
          bottom: shape.bottom,
          opacity: shape.opacity,
          filter: 'blur(2px)',
        }
        const content = shape.kind === 'cloud' ? (
          <CloudShape size={shape.size} color={shape.color} />
        ) : (
          <FlowerShape size={shape.size} color={shape.color} />
        )
        if (prefersReducedMotion) {
          return (
            <div key={i} className="absolute" style={style}>
              {content}
            </div>
          )
        }
        return (
          <motion.div
            key={i}
            className="absolute"
            style={style}
            animate={{ x: [0, shape.driftX, 0] }}
            transition={{ duration: shape.driftDuration, repeat: Infinity, ease: 'easeInOut' }}
          >
            {content}
          </motion.div>
        )
      })}

      {STICKERS.map((sticker) => {
        const chip = (
          <div
            className={cn('flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium', sticker.textClassName)}
            style={glassChipStyle(sticker.color)}
          >
            {sticker.icon}
            {sticker.label}
          </div>
        )
        if (prefersReducedMotion) {
          return (
            <div key={sticker.label} className="absolute" style={sticker.style}>
              {chip}
            </div>
          )
        }
        return (
          <motion.div
            key={sticker.label}
            className="absolute"
            style={sticker.style}
            animate={{ x: [0, sticker.driftX, 0] }}
            transition={{ duration: sticker.driftDuration, repeat: Infinity, ease: 'easeInOut' }}
          >
            {chip}
          </motion.div>
        )
      })}

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
        className="absolute bottom-[5%] right-[4%]"
      >
        <path d="M3 2 L19 9 L11 11.5 L9 19 Z" />
      </svg>
    </div>
  )
}
