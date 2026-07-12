import { useState } from 'react'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Label } from '#/components/ui/label'
import { Textarea } from '#/components/ui/textarea'
import { Button } from '#/components/ui/button'
import { Switch } from '#/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { useCharmStore } from '#/lib/charm-store'
import type { CompensationType, DealFormValues, DealStage } from '#/lib/types'

const STAGES: Array<{ value: DealStage; label: string }> = [
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'live', label: 'Live' },
  { value: 'completed', label: 'Completed' },
]

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

const COMPENSATION_TYPES: Array<{ value: CompensationType; label: string }> = [
  { value: 'paid', label: 'Paid' },
  { value: 'gifted', label: 'Gifted' },
  { value: 'commission', label: 'Commission' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-white/40 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--charm-ink-soft)]">{title}</h3>
      {children}
    </div>
  )
}

interface DealFormProps {
  values: DealFormValues
  onChange: (values: DealFormValues) => void
  onSubmit: () => void
  submitLabel: string
  onDelete?: () => void
  submitting?: boolean
  deleting?: boolean
}

export function DealForm({ values, onChange, onSubmit, submitLabel, onDelete, submitting, deleting }: DealFormProps) {
  const { brands } = useCharmStore()
  const [brandListId] = useState(() => `brand-suggestions-${Math.random().toString(36).slice(2)}`)

  function set<K extends keyof DealFormValues>(key: K, value: DealFormValues[K]) {
    onChange({ ...values, [key]: value })
  }

  function setDeliverable(index: number, patch: Partial<DealFormValues['deliverables'][number]>) {
    const next = values.deliverables.map((d, i) => (i === index ? { ...d, ...patch } : d))
    set('deliverables', next)
  }

  function addDeliverable() {
    set('deliverables', [...values.deliverables, { type: '', description: '', dueDate: '' }])
  }

  function removeDeliverable(index: number) {
    set(
      'deliverables',
      values.deliverables.length > 1 ? values.deliverables.filter((_, i) => i !== index) : values.deliverables,
    )
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="flex flex-col gap-4"
    >
      <Section title="Brand">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="brandName">Brand name</Label>
            <Input
              id="brandName"
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
            <Label htmlFor="brandContactName">Contact name</Label>
            <Input
              id="brandContactName"
              value={values.brandContactName}
              onChange={(e) => set('brandContactName', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="brandContactEmail">Contact email</Label>
            <Input
              id="brandContactEmail"
              type="email"
              value={values.brandContactEmail}
              onChange={(e) => set('brandContactEmail', e.target.value)}
              placeholder="Optional"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage">Pipeline stage</Label>
            <Select value={values.stage} onValueChange={(v) => set('stage', v as DealStage)}>
              <SelectTrigger id="stage">
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
          </div>
        </div>
      </Section>

      <Section title="Deliverables & Deadlines">
        <div className="flex flex-col gap-2">
          {values.deliverables.map((d, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-xl bg-white/50 p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]">
              <Input
                value={d.type}
                onChange={(e) => setDeliverable(i, { type: e.target.value })}
                placeholder="1 TikTok video"
                aria-label="Deliverable type"
              />
              <Input
                value={d.description}
                onChange={(e) => setDeliverable(i, { description: e.target.value })}
                placeholder="Notes (optional)"
                aria-label="Deliverable description"
              />
              <Input
                type="date"
                value={d.dueDate}
                onChange={(e) => setDeliverable(i, { dueDate: e.target.value })}
                aria-label="Due date"
                className="sm:w-40"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeDeliverable(i)}
                aria-label="Remove deliverable"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addDeliverable} className="w-fit gap-1.5">
            <Plus className="size-3.5" /> Add deliverable
          </Button>
        </div>
      </Section>

      <Section title="Compensation & Usage Rights">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compensationAmount">Amount</Label>
            <Input
              id="compensationAmount"
              type="number"
              min="0"
              step="0.01"
              value={values.compensationAmount}
              onChange={(e) => set('compensationAmount', e.target.value)}
              placeholder="800"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="currency">Currency</Label>
            <Select value={values.compensationCurrency} onValueChange={(v) => set('compensationCurrency', v)}>
              <SelectTrigger id="currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="compensationType">Compensation type</Label>
            <Select
              value={values.compensationType}
              onValueChange={(v) => set('compensationType', v as CompensationType)}
            >
              <SelectTrigger id="compensationType">
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
          </div>

          {values.compensationType === 'paid' && (
            <div className="flex flex-col gap-3 rounded-xl bg-white/50 p-3 sm:col-span-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="expectedPayoutDate">Expected payout date</Label>
                <Input
                  id="expectedPayoutDate"
                  type="date"
                  value={values.expectedPayoutDate}
                  onChange={(e) => set('expectedPayoutDate', e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="paidInFull">Paid in full</Label>
                <Switch
                  id="paidInFull"
                  checked={values.paidInFull}
                  onCheckedChange={(checked) => set('paidInFull', checked)}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor="usageRights">Usage rights</Label>
            <Input
              id="usageRights"
              value={values.usageRights}
              onChange={(e) => set('usageRights', e.target.value)}
              placeholder="3 months paid usage, organic only"
            />
          </div>
        </div>
      </Section>

      <Section title="Shipment & Tracking">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shipmentCarrier">Carrier</Label>
            <Input
              id="shipmentCarrier"
              value={values.shipmentCarrier}
              onChange={(e) => set('shipmentCarrier', e.target.value)}
              placeholder="UPS"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shipmentTrackingNumber">Tracking number</Label>
            <Input
              id="shipmentTrackingNumber"
              value={values.shipmentTrackingNumber}
              onChange={(e) => set('shipmentTrackingNumber', e.target.value)}
              placeholder="1Z999AA10123456784"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shipmentShippedDate">Shipped date</Label>
            <Input
              id="shipmentShippedDate"
              type="date"
              value={values.shipmentShippedDate}
              onChange={(e) => set('shipmentShippedDate', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="shipmentEstimatedDelivery">Estimated delivery</Label>
            <Input
              id="shipmentEstimatedDelivery"
              type="date"
              value={values.shipmentEstimatedDelivery}
              onChange={(e) => set('shipmentEstimatedDelivery', e.target.value)}
            />
          </div>
        </div>
      </Section>

      <Section title="Content Requirements">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="hashtags">Hashtags</Label>
            <Input
              id="hashtags"
              value={values.hashtags}
              onChange={(e) => set('hashtags', e.target.value)}
              placeholder="#ad, #GlowUp"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="accountsToTag">Accounts to tag</Label>
            <Input
              id="accountsToTag"
              value={values.accountsToTag}
              onChange={(e) => set('accountsToTag', e.target.value)}
              placeholder="@glowskincare"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="clipsToUse">Clips to use</Label>
            <Input
              id="clipsToUse"
              value={values.clipsToUse}
              onChange={(e) => set('clipsToUse', e.target.value)}
              placeholder="unboxing, morning routine"
            />
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="contentNotes">Notes</Label>
            <Textarea
              id="contentNotes"
              value={values.contentNotes}
              onChange={(e) => set('contentNotes', e.target.value)}
              placeholder="Anything else the brand asked for"
              rows={2}
            />
          </div>
        </div>
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
            Delete deal
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
