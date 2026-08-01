import { useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ArrowRight, Loader2 } from 'lucide-react'
import { CharmMascot } from '#/components/charm/charm-mascot'
import { Button } from '#/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { CHARM_TIER_2_SPRING } from '#/lib/motion-tiers'
import { FEATURE_CATEGORIES, submitFeatureRequest } from '#/server/feature-requests'

/**
 * "Suggest a feature" — a Settings card plus a short dialog.
 *
 * Only the suggestion itself is required. Everything else is optional on purpose: a one-line idea
 * typed in ten seconds is worth more than a well-structured one the user abandoned halfway.
 */

type Status = 'idle' | 'saving' | 'saved' | 'error'

export function SuggestFeature() {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState('')
  const [reason, setReason] = useState('')
  const [category, setCategory] = useState<string>('')
  const [details, setDetails] = useState('')
  const prefersReducedMotion = useReducedMotion()

  /*
   * Double-submit guard. `status` alone is not enough: two clicks dispatched in the same tick both
   * read the pre-update state before React re-renders, and both fire. A ref flips synchronously.
   * The database's rapid-duplicate index backs this up for anything that still gets through.
   */
  const inFlight = useRef(false)

  function reset() {
    setStatus('idle')
    setError(null)
    setSuggestion('')
    setReason('')
    setCategory('')
    setDetails('')
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Only wipe the form once the dialog has actually closed, so a mis-click on the backdrop
    // mid-typing doesn't silently discard what they wrote before the animation finishes.
    if (!next) window.setTimeout(reset, 200)
  }

  async function handleSubmit() {
    if (inFlight.current) return
    if (suggestion.trim().length < 3) {
      setError('Tell me a little more than that.')
      return
    }
    inFlight.current = true
    setStatus('saving')
    setError(null)
    try {
      await submitFeatureRequest({
        data: {
          suggestion: suggestion.trim(),
          reason: reason.trim() || undefined,
          category: (category as (typeof FEATURE_CATEGORIES)[number]) || undefined,
          details: details.trim() || undefined,
        },
      })
      setStatus('saved')
      window.setTimeout(() => handleOpenChange(false), 1900)
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Could not save that suggestion.')
    } finally {
      inFlight.current = false
    }
  }

  return (
    <>
      <div className="charm-glass flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <CharmMascot mood="calm" size={40} />
          <div>
            <h2 className="font-display text-sm font-semibold text-[var(--charm-ink)]">Have an idea?</h2>
            <p className="text-sm text-[var(--charm-ink-soft)]">Tell us what would make CharmOS better.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-[var(--accent)] px-3.5 py-2 text-xs font-semibold text-[var(--accent-foreground)] transition duration-150 ease-out hover:opacity-90 hover:shadow-md active:scale-95"
        >
          Suggest a Feature <ArrowRight className="size-3.5" />
        </button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="charm-glass-solid border-0 sm:max-w-lg">
          <AnimatePresence mode="wait" initial={false}>
            {status === 'saved' ? (
              <motion.div
                key="saved"
                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={prefersReducedMotion ? { duration: 0 } : CHARM_TIER_2_SPRING}
                className="flex flex-col items-center gap-3 py-8 text-center"
              >
                <CharmMascot mood="bright" size={72} />
                <p className="font-display text-base font-semibold text-[var(--charm-ink)]">
                  Got it — I'll keep that idea in mind ✦
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={false}
                animate={{ opacity: 1 }}
                className="flex flex-col gap-4"
              >
                <DialogHeader>
                  <DialogTitle className="font-display">Suggest a feature</DialogTitle>
                  <DialogDescription>
                    Only the first field is needed — the rest helps, but skip anything you'd rather not fill in.
                  </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suggestion">What should we build?</Label>
                  <Input
                    id="suggestion"
                    value={suggestion}
                    onChange={(e) => setSuggestion(e.target.value)}
                    placeholder="e.g. Remind me when an invoice is overdue"
                    maxLength={500}
                    autoFocus
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="reason">Why would this help? (optional)</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="What would it save you from doing by hand?"
                    rows={2}
                    maxLength={1000}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="category">Area (optional)</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Pick an area" />
                    </SelectTrigger>
                    <SelectContent>
                      {FEATURE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="details">Anything else? (optional)</Label>
                  <Textarea
                    id="details"
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={2}
                    maxLength={2000}
                  />
                </div>

                {error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]"
                  >
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={status === 'saving' || suggestion.trim().length < 3}
                    className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
                  >
                    {status === 'saving' && <Loader2 className="size-4 animate-spin" />}
                    Send suggestion
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>
    </>
  )
}
