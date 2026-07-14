import { useEffect, useState } from 'react'
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
  const isEditing = Boolean(dealId)

  const [rawText, setRawText] = useState('')
  const [stagedAssets, setStagedAssets] = useState<Array<StagedAsset>>([])
  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(isEditing)
  const [missingFields, setMissingFields] = useState<Array<string>>([])
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [values, setValues] = useState<DealFormValues>(() => {
    if (dealId) {
      const deal = deals.find((d) => d.id === dealId)
      const brand = deal ? brandById(deal.brandId) : undefined
      if (deal && brand) return dealToFormValues(deal, brand)
    }
    return emptyDealForm()
  })

  useEffect(() => {
    if (!open) return
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
      onOpenChange(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong saving that deal.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!dealId) return
    setDeleting(true)
    setSaveError(null)
    try {
      await deleteDeal(dealId)
      onOpenChange(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong deleting that deal.')
    } finally {
      setDeleting(false)
    }
  }

  function handleArchive() {
    if (!dealId) return
    archiveDeal(dealId)
    onOpenChange(false)
  }

  const currentDeal = dealId ? deals.find((d) => d.id === dealId) : undefined
  const completedAt = currentDeal?.stage === 'completed' ? currentDeal.stageUpdatedAt : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="charm-glass max-h-[85vh] overflow-y-auto border-0 sm:max-w-2xl">
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
