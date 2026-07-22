import { useState } from 'react'
import { Loader2, Trash2 } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '#/components/ui/select'
import { useCharmStore } from '#/lib/charm-store'
import { SUPPORTED_CURRENCIES } from '#/lib/currencies'
import { todayDateOnly } from '#/lib/date-only'
import type { DeliverableCadence, PartnershipFormValues, PartnershipStatus, PaymentType, RetainerCadence } from '#/lib/types'

const PAYMENT_TYPES: Array<{ value: PaymentType; label: string }> = [
  { value: 'retainer', label: 'Retainer (fixed recurring)' },
  { value: 'per_deliverable', label: 'Per deliverable' },
]

const RETAINER_CADENCES: Array<{ value: RetainerCadence; label: string }> = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'monthly', label: 'Monthly' },
]

const DELIVERABLE_CADENCES: Array<{ value: DeliverableCadence; label: string }> = [
  { value: 'day', label: 'per day' },
  { value: 'week', label: 'per week' },
  { value: 'month', label: 'per month' },
]

const STATUSES: Array<{ value: PartnershipStatus; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'paused', label: 'Paused' },
  { value: 'ended', label: 'Ended' },
]

const CONTENT_FORMAT_SUGGESTIONS = ['Canvas UGC', 'UGC', 'Whitelisted Content', 'Affiliate']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">{title}</h3>
      {children}
    </div>
  )
}

interface PartnershipFormProps {
  values: PartnershipFormValues
  onChange: (values: PartnershipFormValues) => void
  onSubmit: () => void
  submitLabel: string
  onDelete?: () => void
  submitting?: boolean
  deleting?: boolean
}

export function PartnershipForm({
  values,
  onChange,
  onSubmit,
  submitLabel,
  onDelete,
  submitting,
  deleting,
}: PartnershipFormProps) {
  const { brands } = useCharmStore()
  const [brandListId] = useState(() => `partnership-brand-suggestions-${Math.random().toString(36).slice(2)}`)
  const [formatListId] = useState(() => `partnership-format-suggestions-${Math.random().toString(36).slice(2)}`)

  function set<K extends keyof PartnershipFormValues>(key: K, value: PartnershipFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  // Ties the pause-tracking dates to the status change itself, so revenue exclusion works
  // correctly without an extra manual step — but only fills in a date if one isn't already
  // set, so editing status back and forth doesn't clobber a deliberately-entered date.
  function setStatus(nextStatus: PartnershipStatus) {
    if (nextStatus === 'paused' && values.status !== 'paused') {
      onChange({ ...values, status: nextStatus, pausedDate: values.pausedDate || todayDateOnly(), unpausedDate: '' })
    } else if (values.status === 'paused' && nextStatus !== 'paused') {
      onChange({ ...values, status: nextStatus, unpausedDate: values.unpausedDate || todayDateOnly() })
    } else {
      set('status', nextStatus)
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <Section title="Partner">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="partnerBrandName">Brand / partner name</Label>
            <Input
              id="partnerBrandName"
              list={brandListId}
              value={values.brandName}
              onChange={(e) => set('brandName', e.target.value)}
              placeholder="Glow Skincare Co."
              required
            />
            <datalist id={brandListId}>
              {brands.map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerStartDate">Start date</Label>
            <Input
              id="partnerStartDate"
              type="date"
              value={values.startDate}
              onChange={(e) => set('startDate', e.target.value)}
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerEndDate">Contract end / renewal date</Label>
            <Input
              id="partnerEndDate"
              type="date"
              value={values.endDate}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerStatus">Status</Label>
            <Select value={values.status} onValueChange={(v) => setStatus(v as PartnershipStatus)}>
              <SelectTrigger id="partnerStatus" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(values.status === 'paused' || values.pausedDate) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partnerPausedDate">Date paused</Label>
              <Input
                id="partnerPausedDate"
                type="date"
                value={values.pausedDate}
                onChange={(e) => set('pausedDate', e.target.value)}
              />
            </div>
          )}
          {(values.status === 'paused' || values.pausedDate) && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partnerUnpausedDate">Date unpaused</Label>
              <Input
                id="partnerUnpausedDate"
                type="date"
                value={values.unpausedDate}
                onChange={(e) => set('unpausedDate', e.target.value)}
              />
            </div>
          )}
          {values.status === 'paused' && (
            <p className="text-xs text-[var(--urgency-orange)] sm:col-span-2">
              Excluded from revenue totals while paused — set "Date unpaused" (or switch status back to Active) to
              resume counting.
            </p>
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerFormats">Content format tag(s)</Label>
            <Input
              id="partnerFormats"
              list={formatListId}
              value={values.contentFormats}
              onChange={(e) => set('contentFormats', e.target.value)}
              placeholder="Canvas UGC, UGC"
            />
            <datalist id={formatListId}>
              {CONTENT_FORMAT_SUGGESTIONS.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        </div>
      </Section>

      <Section title="Payment structure">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerPaymentType">Type</Label>
            <Select value={values.paymentType} onValueChange={(v) => set('paymentType', v as PaymentType)}>
              <SelectTrigger id="partnerPaymentType" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {values.paymentType === 'retainer' ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partnerRetainerAmount">Retainer amount</Label>
                <Input
                  id="partnerRetainerAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.retainerAmount}
                  onChange={(e) => set('retainerAmount', e.target.value)}
                  placeholder="2000"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="partnerRetainerCadence">Cadence</Label>
                <Select
                  value={values.retainerCadence}
                  onValueChange={(v) => set('retainerCadence', v as RetainerCadence)}
                >
                  <SelectTrigger id="partnerRetainerCadence" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RETAINER_CADENCES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          ) : (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="partnerRate">Rate per deliverable</Label>
              <Input
                id="partnerRate"
                type="number"
                min="0"
                step="0.01"
                value={values.perDeliverableRate}
                onChange={(e) => set('perDeliverableRate', e.target.value)}
                placeholder="150"
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerCurrency">Currency</Label>
            <Select value={values.currency} onValueChange={(v) => set('currency', v)}>
              <SelectTrigger id="partnerCurrency" className="w-full">
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
          </div>
        </div>
      </Section>

      <Section title="Deliverable requirements">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerDeliverableCount">Count</Label>
            <Input
              id="partnerDeliverableCount"
              type="number"
              min="1"
              step="1"
              value={values.deliverableCount}
              onChange={(e) => set('deliverableCount', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerDeliverableUnit">Unit</Label>
            <Input
              id="partnerDeliverableUnit"
              value={values.deliverableUnit}
              onChange={(e) => set('deliverableUnit', e.target.value)}
              placeholder="UGC videos"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="partnerDeliverableCadence">Cadence</Label>
            <Select
              value={values.deliverableCadence}
              onValueChange={(v) => set('deliverableCadence', v as DeliverableCadence)}
            >
              <SelectTrigger id="partnerDeliverableCadence" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DELIVERABLE_CADENCES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-xs text-[var(--charm-ink-soft)]">
          e.g. {values.deliverableCount || '4'} {values.deliverableUnit || 'UGC videos'}{' '}
          {DELIVERABLE_CADENCES.find((c) => c.value === values.deliverableCadence)?.label}
        </p>
      </Section>

      <Section title="Notes & contract terms">
        <Textarea
          value={values.notes}
          onChange={(e) => set('notes', e.target.value)}
          placeholder="Usage rights, exclusivity clauses, anything else worth remembering..."
          rows={5}
        />
      </Section>

      <div className="flex items-center justify-between gap-2 pt-1">
        {onDelete ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onDelete}
            disabled={submitting || deleting}
            className="gap-1.5 text-destructive hover:text-destructive"
          >
            {deleting && <Loader2 className="size-4 animate-spin" />}
            <Trash2 className="size-4" /> Delete partnership
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={submitting || deleting}
          className="gap-1.5 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
        >
          {submitting && <Loader2 className="size-4 animate-spin" />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
