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
      className={cn('inline-flex text-[var(--accent)]', className)}
      animate={prefersReducedMotion ? undefined : { opacity: [0.55, 1, 0.55], scale: [0.92, 1.05, 0.92] }}
      transition={prefersReducedMotion ? undefined : { duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
    >
      <Sparkles className="size-4" />
    </motion.span>
  )
}
