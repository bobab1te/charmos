import { useEffect, useRef, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '#/components/ui/dialog'
import { PartnershipForm } from './partnership-form'
import { useCharmStore } from '#/lib/charm-store'
import { emptyPartnershipForm, partnershipFormMissingFields, partnershipToFormValues } from '#/lib/partnership-form-utils'
import { clearDraft, readDraft, writeDraft } from '#/lib/form-draft'
import { useToast } from '#/lib/toast-context'
import type { PartnershipFormValues } from '#/lib/types'

interface PartnershipModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** When set, the modal edits this existing partnership instead of creating a new one. */
  partnershipId?: string
}

export function PartnershipModal({ open, onOpenChange, partnershipId }: PartnershipModalProps) {
  const { partnerships, brandById, savePartnership, deletePartnership } = useCharmStore()
  const { showUndoToast } = useToast()
  const isEditing = Boolean(partnershipId)

  // See DealModal for why this is keyed/persisted rather than plain useState — same
  // survive-a-full-unmount requirement, just for the partnerships form.
  const draftKey = `charmos:partnership-form:${partnershipId ?? 'new'}`

  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<Array<string>>([])
  const [values, setValues] = useState<PartnershipFormValues>(() => {
    const draft = readDraft<PartnershipFormValues>(`${draftKey}:values`)
    if (draft) return draft
    if (partnershipId) {
      const partnership = partnerships.find((p) => p.id === partnershipId)
      const brand = partnership ? brandById(partnership.brandId) : undefined
      if (partnership && brand) return partnershipToFormValues(partnership, brand)
    }
    return emptyPartnershipForm()
  })

  useEffect(() => {
    if (open) writeDraft(`${draftKey}:values`, values)
  }, [open, draftKey, values])

  const prevRef = useRef({ open, partnershipId })
  useEffect(() => {
    const prev = prevRef.current
    const justOpened = open && !prev.open
    const partnershipSwitched = open && prev.partnershipId !== partnershipId
    prevRef.current = { open, partnershipId }
    if (!justOpened && !partnershipSwitched) return

    setSaveError(null)
    setMissingFields([])
    if (partnershipId) {
      const partnership = partnerships.find((p) => p.id === partnershipId)
      const brand = partnership ? brandById(partnership.brandId) : undefined
      setValues(partnership && brand ? partnershipToFormValues(partnership, brand) : emptyPartnershipForm())
    } else {
      setValues(emptyPartnershipForm())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, partnershipId])

  function clearPartnershipDraft() {
    clearDraft(`${draftKey}:values`)
  }

  function handleDialogOpenChange(next: boolean) {
    if (!next) clearPartnershipDraft()
    onOpenChange(next)
  }

  async function handleSubmit() {
    const missing = partnershipFormMissingFields(values)
    if (missing.length > 0) {
      setMissingFields(missing)
      return
    }
    setSubmitting(true)
    setSaveError(null)
    try {
      await savePartnership(values, partnershipId)
      clearPartnershipDraft()
      onOpenChange(false)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong saving that partnership.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleDelete() {
    if (!partnershipId) return
    setDeleting(true)
    setSaveError(null)
    const partnership = partnerships.find((p) => p.id === partnershipId)
    const brandName = partnership ? brandById(partnership.brandId)?.name : undefined
    const undo = deletePartnership(partnershipId)
    showUndoToast(brandName ? `Partnership with ${brandName} deleted` : 'Partnership deleted', undo)
    clearPartnershipDraft()
    onOpenChange(false)
    setDeleting(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="charm-glass max-h-[85vh] overflow-y-auto border-0 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{isEditing ? 'Edit partnership' : 'New long-term partnership'}</DialogTitle>
          <DialogDescription>
            Retainers and other ongoing relationships — separate from one-off brand deals.
          </DialogDescription>
        </DialogHeader>

        {missingFields.length > 0 && (
          <p className="rounded-lg bg-[var(--urgency-orange)]/10 px-3 py-2 text-sm text-[var(--urgency-orange)]">
            Missing: {missingFields.join(', ')}.
          </p>
        )}
        {saveError && (
          <p className="rounded-lg bg-[var(--urgency-red)]/10 px-3 py-2 text-sm text-[var(--urgency-red)]">
            {saveError}
          </p>
        )}

        <PartnershipForm
          values={values}
          onChange={setValues}
          onSubmit={handleSubmit}
          submitLabel={isEditing ? 'Save changes' : 'Save partnership'}
          onDelete={isEditing ? handleDelete : undefined}
          submitting={submitting}
          deleting={deleting}
          partnershipId={partnershipId}
        />
      </DialogContent>
    </Dialog>
  )
}
