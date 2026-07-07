import { createFileRoute } from '@tanstack/react-router'
import { NotebookPen } from 'lucide-react'

export const Route = createFileRoute('/_app/scrapbook')({ component: ScrapbookPage })

function ScrapbookPage() {
  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div className="charm-glass flex flex-col items-center gap-3 rounded-3xl p-16 text-center">
        <NotebookPen className="size-8 text-[var(--charm-ink-soft)]" />
        <h1 className="font-display text-2xl font-semibold text-[var(--charm-ink)]">Content & Idea Scrapbook</h1>
        <p className="max-w-md text-sm text-[var(--charm-ink-soft)]">
          The merged idea bank and drag-and-drop content calendar lives here — not built yet. In the meantime, the
          Unassigned Ideas widget on the Dashboard still tracks your raw concepts.
        </p>
      </div>
    </div>
  )
}
