import { useEffect, useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import { useCharmStore } from '#/lib/charm-store'

interface IdeaDetailModalProps {
  ideaId: string | null
  onOpenChange: (open: boolean) => void
}

export function IdeaDetailModal({ ideaId, onOpenChange }: IdeaDetailModalProps) {
  const { ideas, updateIdea, deleteIdea, unassignIdeaDate } = useCharmStore()
  const idea = ideaId ? ideas.find((i) => i.id === ideaId) : undefined

  const [title, setTitle] = useState('')
  const [hook, setHook] = useState('')
  const [notes, setNotes] = useState('')
  const [referenceLinks, setReferenceLinks] = useState<Array<string>>([''])
  const [isSeries, setIsSeries] = useState(false)
  const [series, setSeries] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!idea) return
    setTitle(idea.title)
    setHook(idea.hook ?? '')
    setNotes(idea.description ?? '')
    setReferenceLinks(idea.referenceLinks.length > 0 ? idea.referenceLinks : [''])
    setIsSeries(Boolean(idea.series))
    setSeries(idea.series ?? '')
    setDeleting(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idea?.id])

  const existingSeriesNames = Array.from(new Set(ideas.map((i) => i.series).filter((s): s is string => Boolean(s))))

  function commit() {
    if (!idea) return
    updateIdea(idea.id, {
      title: title.trim() || idea.title,
      hook: hook.trim() || undefined,
      description: notes.trim() || undefined,
      referenceLinks: referenceLinks.map((l) => l.trim()).filter(Boolean),
      series: isSeries ? series.trim() || undefined : undefined,
    })
  }

  function handleOpenChange(open: boolean) {
    if (!open) commit()
    onOpenChange(open)
  }

  function handleDelete() {
    if (!idea) return
    setDeleting(true)
    deleteIdea(idea.id)
    onOpenChange(false)
  }

  if (!idea) return null

  return (
    <Dialog open={Boolean(ideaId)} onOpenChange={handleOpenChange}>
      <DialogContent className="charm-glass max-h-[85vh] overflow-y-auto border-0 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Idea details</DialogTitle>
          <DialogDescription>Flesh out the concept before it's ready to schedule.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ideaTitle">Title</Label>
            <Input id="ideaTitle" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ideaHook">Hook</Label>
            <Input
              id="ideaHook"
              value={hook}
              onChange={(e) => setHook(e.target.value)}
              placeholder="The opening line that grabs attention"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ideaNotes">Notes</Label>
            <Textarea
              id="ideaNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Freeform notes..."
              rows={5}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>References</Label>
            {referenceLinks.map((link, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  type="url"
                  value={link}
                  onChange={(e) =>
                    setReferenceLinks((prev) => prev.map((l, idx) => (idx === i ? e.target.value : l)))
                  }
                  placeholder="https://tiktok.com/@inspo/video/..."
                  aria-label="Reference link"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    setReferenceLinks((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
                  }
                  aria-label="Remove reference"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReferenceLinks((prev) => [...prev, ''])}
              className="w-fit gap-1.5"
            >
              <Plus className="size-3.5" /> Add reference
            </Button>
          </div>

          <div className="flex flex-col gap-2 rounded-xl bg-white/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="isSeries">Part of a series?</Label>
              <Switch id="isSeries" checked={isSeries} onCheckedChange={setIsSeries} />
            </div>
            {isSeries && (
              <div className="flex flex-col gap-1.5">
                <Input
                  value={series}
                  onChange={(e) => setSeries(e.target.value)}
                  placeholder="Series name, e.g. 'Get Ready With Me'"
                  list="series-suggestions"
                />
                <datalist id="series-suggestions">
                  {existingSeriesNames.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
                {series.trim() && (
                  <p className="text-xs text-[var(--charm-ink-soft)]">
                    {ideas.filter((i) => i.id !== idea.id && i.series === series.trim()).length} other idea(s) in this
                    series
                  </p>
                )}
              </div>
            )}
          </div>

          {idea.scheduledDate && (
            <button
              type="button"
              onClick={() => unassignIdeaDate(idea.id)}
              className="w-fit text-xs font-medium text-[var(--charm-ink-soft)] underline underline-offset-2 transition hover:text-[var(--charm-ink)]"
            >
              Remove from calendar
            </button>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDelete}
            disabled={deleting}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            Delete idea
          </Button>
          <Button
            type="button"
            onClick={() => handleOpenChange(false)}
            className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
