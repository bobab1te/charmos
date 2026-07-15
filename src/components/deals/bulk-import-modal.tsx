import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { Button } from '#/components/ui/button'
import { Textarea } from '#/components/ui/textarea'
import { Input } from '#/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { useCharmStore } from '#/lib/charm-store'
import { SUPPORTED_CURRENCIES } from '#/lib/currencies'
import { clearDraft, readDraft, writeDraft } from '#/lib/form-draft'
import { bulkRowFromParsed, bulkRowNeedsReview } from '#/lib/bulk-import-utils'
import type { BulkImportRow } from '#/lib/bulk-import-utils'
import { parseDealsBulkText } from '#/server/parse-deals-bulk'
import { cn } from '#/lib/utils'
import type { CompensationType, DealStage } from '#/lib/types'

const STAGES: Array<{ value: DealStage; label: string }> = [
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
]

const COMPENSATION_TYPES: Array<{ value: CompensationType; label: string }> = [
  { value: 'paid', label: 'Paid' },
  { value: 'gifted', label: 'Gifted' },
  { value: 'commission', label: 'Commission' },
]

const DRAFT_KEY = 'charmos:bulk-import'

interface BulkImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function BulkImportModal({ open, onOpenChange }: BulkImportModalProps) {
  const { bulkCreateDeals } = useCharmStore()

  const [rawText, setRawText] = useState(() => readDraft<string>(`${DRAFT_KEY}:rawText`) ?? '')
  const [rows, setRows] = useState<Array<BulkImportRow>>(() => readDraft<Array<BulkImportRow>>(`${DRAFT_KEY}:rows`) ?? [])
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    if (open) writeDraft(`${DRAFT_KEY}:rawText`, rawText)
  }, [open, rawText])
  useEffect(() => {
    if (open) writeDraft(`${DRAFT_KEY}:rows`, rows)
  }, [open, rows])

  const step: 'paste' | 'review' = rows.length > 0 ? 'review' : 'paste'

  function clearAll() {
    setRawText('')
    setRows([])
    setParseError(null)
    setStatusMessage(null)
    clearDraft(`${DRAFT_KEY}:rawText`)
    clearDraft(`${DRAFT_KEY}:rows`)
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) clearAll()
    onOpenChange(next)
  }

  async function handleParse() {
    setParsing(true)
    setParseError(null)
    try {
      const result = await parseDealsBulkText({ data: { text: rawText } })
      if (result.ok) {
        setRows(result.deals.map(bulkRowFromParsed))
      } else {
        setParseError(result.error)
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Something went wrong parsing that text.')
    } finally {
      setParsing(false)
    }
  }

  function updateRow(id: string, patch: Partial<BulkImportRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id))
  }

  const includedCount = rows.filter((r) => r.included).length

  async function handleImport() {
    setImporting(true)
    setStatusMessage(null)
    const included = rows.filter((r) => r.included)
    const validRows = included.filter((r) => !bulkRowNeedsReview(r))

    if (included.length === 0) {
      setStatusMessage('Nothing is checked to import.')
      setImporting(false)
      return
    }
    if (validRows.length === 0) {
      setStatusMessage('None of the checked deals have both a brand name and an amount yet — fix those first.')
      setImporting(false)
      return
    }

    try {
      await bulkCreateDeals(validRows)
      const importedIds = new Set(validRows.map((r) => r.id))
      const remaining = rows.filter((r) => !importedIds.has(r.id))
      const skipped = included.length - validRows.length
      if (remaining.length === 0) {
        clearAll()
        onOpenChange(false)
      } else {
        setRows(remaining)
        setStatusMessage(
          skipped > 0
            ? `Imported ${validRows.length} deal${validRows.length === 1 ? '' : 's'}. ${skipped} checked ${skipped === 1 ? 'entry needs' : 'entries need'} a brand name and amount before it can be imported.`
            : `Imported ${validRows.length} deal${validRows.length === 1 ? '' : 's'}.`,
        )
      }
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Something went wrong importing these deals.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="charm-glass max-h-[85vh] overflow-y-auto border-0 sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-display">Import deals</DialogTitle>
          <DialogDescription>
            {step === 'paste'
              ? "Paste rows copied from Notion, a spreadsheet, or a plain list — AI will split it into individual deals. Nothing is saved until you review and confirm below."
              : `Review ${rows.length} detected deal${rows.length === 1 ? '' : 's'} before importing. Uncheck or edit anything that's wrong.`}
          </DialogDescription>
        </DialogHeader>

        {step === 'paste' ? (
          <div className="flex flex-col gap-3">
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={'Glow Skincare — $800 — confirmed — due Aug 3\nSunny Co — $500 gifted — negotiating\n...'}
              rows={10}
            />
            {parseError && (
              <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">{parseError}</p>
            )}
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleParse}
                disabled={parsing || !rawText.trim()}
                className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
              >
                {parsing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                {parsing ? 'Parsing…' : 'Parse deals'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {statusMessage && (
              <p className="rounded-lg bg-[var(--urgency-orange)]/10 px-3 py-2 text-sm text-[var(--urgency-orange)]">
                {statusMessage}
              </p>
            )}
            <div className="flex flex-col gap-2">
              {rows.map((row) => {
                const needsReview = bulkRowNeedsReview(row)
                return (
                  <div
                    key={row.id}
                    className={cn(
                      'flex flex-col gap-2 rounded-xl p-3',
                      needsReview ? 'bg-[var(--urgency-orange)]/10' : 'bg-white/50',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-[var(--charm-ink-soft)]">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={(e) => updateRow(row.id, { included: e.target.checked })}
                          className="size-4"
                        />
                        Include
                      </label>
                      {needsReview && (
                        <span className="flex items-center gap-1 rounded-full bg-[var(--urgency-orange)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--urgency-orange)]">
                          <AlertTriangle className="size-3" /> Needs review
                        </span>
                      )}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRow(row.id)}
                        aria-label="Remove row"
                        className="ml-auto"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
                      <Input
                        className="sm:col-span-2"
                        value={row.brandName}
                        onChange={(e) => updateRow(row.id, { brandName: e.target.value })}
                        placeholder="Brand name"
                        aria-label="Brand name"
                      />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={row.compensationAmount}
                        onChange={(e) => updateRow(row.id, { compensationAmount: e.target.value })}
                        placeholder="Amount"
                        aria-label="Compensation amount"
                      />
                      <Select
                        value={row.compensationCurrency}
                        onValueChange={(v) => updateRow(row.id, { compensationCurrency: v })}
                      >
                        <SelectTrigger aria-label="Currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SUPPORTED_CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={row.compensationType}
                        onValueChange={(v) => updateRow(row.id, { compensationType: v as CompensationType })}
                      >
                        <SelectTrigger aria-label="Compensation type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {COMPENSATION_TYPES.map((t) => (
                            <SelectItem key={t.value} value={t.value}>
                              {t.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={row.stage} onValueChange={(v) => updateRow(row.id, { stage: v as DealStage })}>
                        <SelectTrigger aria-label="Pipeline stage">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STAGES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="date"
                        value={row.dueDate}
                        onChange={(e) => updateRow(row.id, { dueDate: e.target.value })}
                        aria-label="Due date"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex items-center justify-between gap-2 pt-1">
              <Button type="button" variant="ghost" onClick={clearAll}>
                Start over
              </Button>
              <Button
                type="button"
                onClick={handleImport}
                disabled={importing || includedCount === 0}
                className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
              >
                {importing && <Loader2 className="size-4 animate-spin" />}
                Import {includedCount} deal{includedCount === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
