import { motion, useReducedMotion } from 'motion/react'
import { Sparkles } from 'lucide-react'
import { cn } from '#/lib/utils'

/**
 * A small twinkling sparkle for empty states/headings/confirmations — deliberately not used on
 * data-dense screens or repeated per-row, per the "without cluttering data-dense screens"
 * requirement. Falls back to a static (non-pulsing) sparkle when the user prefers reduced motion.
 */
export function SparkleAccent({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.span
      className={cn('inline-flex text-[var(--accent-strong)]', className)}
      animate={prefersReducedMotion ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.92, 1.05, 0.92] }}
      transition={prefersReducedMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Sparkles className="size-4" />
    </motion.span>
  )
}

/**
 * A single one-shot sparkle for a discrete success moment (e.g. a deal reaching Completed) —
 * appears, glows, disappears once. Deliberately much smaller than a reactive sparkle field: no
 * proximity tracking, no repeat, just one ~0.8s keyframe. The parent is expected to mount this
 * conditionally and un-mount it itself after the moment has played (see deal-pipeline.tsx) rather
 * than this component tracking its own lifetime.
 */
export function SparkleBurst({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion()
  if (prefersReducedMotion) return null

  return (
    <motion.span
      className={cn('pointer-events-none inline-flex text-[var(--accent-strong)]', className)}
      initial={{ opacity: 0, scale: 0.6 }}
      animate={{ opacity: [0, 1, 0], scale: [0.6, 1.3, 1] }}
      transition={{ duration: 0.8, ease: 'easeOut' }}
    >
      <Sparkles className="size-5" />
    </motion.span>
  )
}
