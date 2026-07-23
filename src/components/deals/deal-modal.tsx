import { useEffect, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '#/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { DealForm } from './deal-form'
import { DealParseInput } from './deal-parse-input'
import type { DealParsePayload, StagedAsset } from './deal-parse-input'
import { useCharmStore } from '#/lib/charm-store'
import { dealToFormValues, emptyDealForm, formValuesMissingFields, parsedDealToFormValues } from '#/lib/deal-form-utils'
import { clearDraft, readDraft, writeDraft } from '#/lib/form-draft'
import { useToast } from '#/lib/toast-context'
import { parseDealText } from '#/server/parse-deal'
import type { DealFormValues } from '#/lib/types'

interface DealModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the modal edits this existing deal instead of creating a new one. */
  dealId?: string
}

export function DealModal({ open, onOpenChange, dealId }: DealModalProps) {
  const { deals, brandById, saveDeal, deleteDeal, archiveDeal } = useCharmStore()
  const { showUndoToast } = useToast()
  const isEditing = Boolean(dealId)

  // Keyed per-deal (or "new") so an in-progress draft survives a full unmount — navigating to
  // another section and back, or a browser tab switch — instead of disappearing with it. Only
  // cleared on an explicit close (X/Cancel) or after a successful save/delete/archive, never as
  // a side effect of unmounting. Note: staged file attachments can't be persisted this way (raw
  // File objects aren't serializable) and won't survive a full unmount — everything else will.
  const draftKey = `charmos:deal-form:${dealId ?? 'new'}`

  const [rawText, setRawText] = useState(() => readDraft<string>(`${draftKey}:rawText`) ?? '')
  const [stagedAssets, setStagedAssets] = useState<Array<StagedAsset>>([])
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(() => readDraft<boolean>(`${draftKey}:showForm`) ?? isEditing)
  const [missingFields, setMissingFields] = useState<Array<string>>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [values, setValues] = useState<DealFormValues>(() => {
    const draft = readDraft<DealFormValues>(`${draftKey}:values`)
    if (draft) return draft
    if (dealId) {
      const deal = deals.find((d) => d.id === dealId)
      const brand = deal ? brandById(deal.brandId) : undefined
      if (deal && brand) return dealToFormValues(deal, brand)
    }
    return emptyDealForm()
  })

  useEffect(() => {
    if (open) writeDraft(`${draftKey}:values`, values)
  }, [open, draftKey, values])
  useEffect(() => {
    if (open) writeDraft(`${draftKey}:rawText`, rawText)
  }, [open, draftKey, rawText])
  useEffect(() => {
    if (open) writeDraft(`${draftKey}:showForm`, showForm)
  }, [open, draftKey, showForm])

  // Reset/prefill only on a genuine open-transition or a switch to editing a different deal —
  // not on every render, and not when the component mounts already-open with a restored draft
  // (which would otherwise immediately overwrite that draft with fresh/empty values).
  const prevRef = useRef({ open, dealId })
  useEffect(() => {
    const prev = prevRef.current
    const justOpened = open && !prev.open
    const dealSwitched = open && prev.dealId !== dealId
    prevRef.current = { open, dealId }
    if (!justOpened && !dealSwitched) return

    setSaveError(null)
    if (dealId) {
      const deal = deals.find((d) => d.id === dealId)
      const brand = deal ? brandById(deal.brandId) : undefined
      setValues(deal && brand ? dealToFormValues(deal, brand) : emptyDealForm())
      setShowForm(true)
    } else {
      setValues(emptyDealForm())
      setShowForm(false)
      setRawText('')
      setStagedAssets([])
      setParseError(null)
      setMissingFields([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, dealId])

  function clearDealDraft() {
    clearDraft(`${draftKey}:values`)
    clearDraft(`${draftKey}:rawText`)
    clearDraft(`${draftKey}:showForm`)
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) clearDealDraft()
    onOpenChange(next)
  }

  async function handleParse(payload: DealParsePayload) {
    setParsing(true)
    setParseError(null)
    // eslint-disable-next-line no-console -- placeholder until file/OCR parsing lands server-side
    console.log(`Sending ${payload.files.length} files and ${payload.text.length} chars of text to parser.`)
    try {
      const result = await parseDealText({ data: { text: payload.text } })
      if (result.ok) {
        const formValues = parsedDealToFormValues(result.deal)
        setValues(formValues)
        setMissingFields(formValuesMissingFields(formValues))
        setShowForm(true)
      } else {
        setParseError(result.error)
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Something went wrong parsing that text.')
    } finally {
      setParsing(false)
    }
  }

  async function handleSubmit() {
    setSubmitting(true)
    setSaveError(null)
    try {
      await saveDeal(values, dealId)
      clearDealDraft()
      onOpenChange(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong saving that deal.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete() {
    if (!dealId) return
    setDeleting(true)
    setSaveError(null)
    const deal = deals.find((d) => d.id === dealId)
    const brandName = deal ? brandById(deal.brandId)?.name : undefined
    const undo = deleteDeal(dealId)
    showUndoToast(brandName ? `Deal with ${brandName} deleted` : 'Deal deleted', undo)
    clearDealDraft()
    onOpenChange(false)
    setDeleting(false)
  }

  function handleArchive() {
    if (!dealId) return
    archiveDeal(dealId)
    clearDealDraft()
    onOpenChange(false)
  }

  const currentDeal = dealId ? deals.find((d) => d.id === dealId) : undefined
  const completedAt = currentDeal?.stage === 'completed' ? currentDeal.stageUpdatedAt : undefined

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="charm-glass-solid max-h-[85vh] overflow-y-auto border-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Edit deal' : 'New brand deal'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update deal details — saving keeps everything in sync across the dashboard.'
              : 'Paste a brand email or DM to auto-fill the details, or enter everything manually.'}
          </DialogDescription>
        </DialogHeader>

        {!isEditing && !showForm ? (
          <Tabs
            defaultValue="parse"
            onValueChange={(value) => {
              if (value === 'manual') setShowForm(true)
            }}
          >
            <TabsList>
              <TabsTrigger value="parse">
                <Sparkles className="mr-1.5 size-3.5" /> Paste &amp; Parse
              </TabsTrigger>
              <TabsTrigger value="manual">Manual entry</TabsTrigger>
            </TabsList>
            <TabsContent value="parse">
              <DealParseInput
                rawText={rawText}
                onRawTextChange={setRawText}
                assets={stagedAssets}
                onAssetsChange={setStagedAssets}
                parsing={parsing}
                parseError={parseError}
                onParse={handleParse}
                onSkipToManual={() => setShowForm(true)}
              />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            {missingFields.length > 0 && (
              <p className="rounded-lg bg-[var(--urgency-orange)]/10 px-3 py-2 text-sm text-[var(--urgency-orange)]">
                Couldn't find: {missingFields.join(', ')}. Fill these in manually below.
              </p>
            )}
            {saveError && (
              <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">
                {saveError}
              </p>
            )}
            <DealForm
              values={values}
              onChange={setValues}
              onSubmit={handleSubmit}
              submitLabel={isEditing ? 'Save changes' : 'Save deal'}
              onDelete={isEditing ? handleDelete : undefined}
              onArchive={isEditing ? handleArchive : undefined}
              completedAt={completedAt}
              submitting={submitting}
              deleting={deleting}
            />
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
