import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { z } from 'zod'
import { ArchiveRestore, Pencil, Plus, Trash2, X, Check } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { DealPipeline } from '#/components/dashboard/deal-pipeline'
import { PartnershipCard } from '#/components/partnerships/partnership-card'
import { PartnershipModal } from '#/components/partnerships/partnership-modal'
import { BrandAvatar } from '#/components/deals/brand-avatar'
import { BrandLogoUpload } from '#/components/deals/brand-logo-upload'
import { GiftedLabel, isGiftedAmount } from '#/components/deals/gifted-label'
import { useCharmStore } from '#/lib/charm-store'
import { useCurrency } from '#/lib/currency-context'
import { readDraft, writeDraft } from '#/lib/form-draft'
import { useToast } from '#/lib/toast-context'
import type { Brand, BrandDeal } from '#/lib/types'

export const Route = createFileRoute('/_app/brand-deals')({
  validateSearch: (search: Record<string, unknown>) =>
    z
      .object({
        filter: z.literal('unpaid').optional(),
        // Deep-link targets — e.g. "View deal"/"View partnership" from a Finances ledger entry.
        openDeal: z.string().optional(),
        openPartnership: z.string().optional(),
      })
      .parse(search),
  component: BrandDealsPage,
})

function BrandCard({ brand, dealCount }: { brand: Brand; dealCount: number }) {
  const { updateBrand, deleteBrand, uploadBrandLogo } = useCharmStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(brand.name)
  const [contactName, setContactName] = useState(brand.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(brand.contactEmail ?? '')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)

  async function handleLogoFile(file: File | null) {
    if (file) await uploadBrandLogo(brand.id, file)
  }

  function save() {
    updateBrand(brand.id, {
      name: name.trim() || brand.name,
      contactName: contactName.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
    })
    setEditing(false)
  }

  function cancel() {
    setName(brand.name)
    setContactName(brand.contactName ?? '')
    setContactEmail(brand.contactEmail ?? '')
    setEditing(false)
  }

  async function handleDelete() {
    const deleted = await deleteBrand(brand.id)
    if (!deleted) {
      setBlockedMessage(`Can't delete — ${dealCount} deal${dealCount === 1 ? '' : 's'} still reference this brand.`)
    }
  }

  if (editing) {
    return (
      <div className="charm-glass flex flex-col gap-2.5 rounded-2xl p-4">
        <BrandLogoUpload brandName={brand.name} existingLogoUrl={brand.logoUrl} file={null} onFileChange={handleLogoFile} />
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Brand name" />
        <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Contact name" />
        <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="Contact email" />
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={cancel} className="gap-1">
            <X className="size-3.5" /> Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={save}
            className="gap-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
          >
            <Check className="size-3.5" /> Save
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="charm-glass flex flex-col gap-2 rounded-2xl p-4 transition duration-150 ease-out hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <BrandAvatar name={brand.name} logoUrl={brand.logoUrl} className="size-9 shrink-0 text-sm" />
          <div>
            <p className="font-display text-base font-semibold text-[var(--charm-ink)]">{brand.name}</p>
            {brand.contactName && <p className="text-sm text-[var(--charm-ink-soft)]">{brand.contactName}</p>}
            {brand.contactEmail && <p className="text-xs text-[var(--charm-ink-soft)]">{brand.contactEmail}</p>}
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium text-[var(--charm-ink-soft)]">
          {dealCount} deal{dealCount === 1 ? '' : 's'}
        </span>
      </div>
      {blockedMessage && (
        <p className="rounded-lg bg-[var(--urgency-orange)]/10 px-2.5 py-1.5 text-xs text-[var(--urgency-orange)]">
          {blockedMessage}
        </p>
      )}
      <div className="flex justify-end gap-1 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(true)} className="gap-1">
          <Pencil className="size-3.5" /> Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

function BrandsGrid() {
  const { brands, deals } = useCharmStore()
  const dealCountByBrand = (brandId: string) => deals.filter((d) => d.brandId === brandId).length

  if (brands.length === 0) {
    return <p className="text-sm text-[var(--charm-ink-soft)]">No brands yet. Add a deal to create your first one.</p>
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {brands.map((brand) => (
        <BrandCard key={brand.id} brand={brand} dealCount={dealCountByBrand(brand.id)} />
      ))}
    </div>
  )
}

function ArchivedDealCard({ deal, brandName }: { deal: BrandDeal; brandName: string }) {
  const { unarchiveDeal, deleteDeal, brandById } = useCharmStore()
  const { showUndoToast } = useToast()
  const { displayCurrency, convert } = useCurrency()
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const currency = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: deal.compensationCurrency,
    maximumFractionDigits: 0,
  })
  const showsConverted = deal.compensationCurrency !== displayCurrency

  function handleDelete() {
    const undo = deleteDeal(deal.id)
    showUndoToast(`Deal with ${brandName} deleted`, undo)
  }

  if (confirmingDelete) {
    return (
      <div className="charm-glass flex flex-col gap-2.5 rounded-2xl p-4">
        <p className="text-sm font-medium text-[var(--charm-ink)]">Delete this deal permanently?</p>
        <p className="text-xs text-[var(--charm-ink-soft)]">You'll have a few seconds to undo after confirming.</p>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmingDelete(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleDelete}
            className="bg-destructive text-white hover:bg-destructive/90"
          >
            Confirm delete
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="charm-glass flex flex-col gap-2 rounded-2xl p-4 opacity-80 transition duration-150 ease-out hover:opacity-100">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <BrandAvatar name={brandName} logoUrl={brandById(deal.brandId)?.logoUrl} className="size-7 shrink-0 text-xs" />
          <div>
            <p className="font-display text-base font-semibold text-[var(--charm-ink)]">{brandName}</p>
            <p className="text-xs text-[var(--charm-ink-soft)] capitalize">Archived from: {deal.stage}</p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white/50 px-2 py-0.5 text-xs font-medium text-[var(--charm-ink-soft)]">
          {isGiftedAmount(deal.compensationAmount) ? (
            <GiftedLabel />
          ) : (
            <>
              {currency.format(deal.compensationAmount)}
              {showsConverted &&
                ` (≈ ${new Intl.NumberFormat('en-US', { style: 'currency', currency: displayCurrency, maximumFractionDigits: 0 }).format(convert(deal.compensationAmount, deal.compensationCurrency))})`}
            </>
          )}
        </span>
      </div>
      <div className="flex justify-end gap-1 pt-1">
        <Button type="button" variant="ghost" size="sm" onClick={() => unarchiveDeal(deal.id)} className="gap-1">
          <ArchiveRestore className="size-3.5" /> Restore
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirmingDelete(true)}
          className="gap-1 text-destructive hover:text-destructive"
        >
          <Trash2 className="size-3.5" /> Delete
        </Button>
      </div>
    </div>
  )
}

function ArchivedDealsGrid() {
  const { deals, brandById } = useCharmStore()
  const archived = deals.filter((d) => d.archived)

  if (archived.length === 0) {
    return (
      <p className="text-sm text-[var(--charm-ink-soft)]">
        No archived deals. Deals you archive (e.g. from a "possible ghosting" alert) show up here instead of being
        deleted.
      </p>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {archived.map((deal) => (
        <ArchivedDealCard key={deal.id} deal={deal} brandName={brandById(deal.brandId)?.name ?? 'Unknown brand'} />
      ))}
    </div>
  )
}

const STATUS_ORDER = { active: 0, paused: 1, ended: 2 } as const

function PartnershipsGrid({ onOpen }: { onOpen: (id: string) => void }) {
  const { partnerships, brandById } = useCharmStore()

  if (partnerships.length === 0) {
    return (
      <p className="text-sm text-[var(--charm-ink-soft)]">
        No long-term partnerships yet. Add one for retainer-style relationships like Canvas UGC — separate from the
        one-off deal pipeline.
      </p>
    )
  }

  const sorted = [...partnerships].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status])

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sorted.map((partnership) => (
        <PartnershipCard
          key={partnership.id}
          partnership={partnership}
          brandName={brandById(partnership.brandId)?.name ?? 'Unknown brand'}
          onOpen={onOpen}
        />
      ))}
    </div>
  )
}

function BrandDealsPage() {
  const { filter, openDeal, openPartnership: openPartnershipId } = Route.useSearch()
  const { deals, partnerships } = useCharmStore()
  const archivedCount = deals.filter((d) => d.archived).length
  const [partnershipModalOpen, setPartnershipModalOpen] = useState(
    () => readDraft<boolean>('charmos:partnership-modal-open') ?? false,
  )
  const [editingPartnershipId, setEditingPartnershipId] = useState<string | undefined>(
    () => readDraft<string | undefined>('charmos:partnership-modal-editing-id') ?? undefined,
  )

  useEffect(() => writeDraft('charmos:partnership-modal-open', partnershipModalOpen), [partnershipModalOpen])
  useEffect(
    () => writeDraft('charmos:partnership-modal-editing-id', editingPartnershipId),
    [editingPartnershipId],
  )

  function openNewPartnership() {
    setEditingPartnershipId(undefined)
    setPartnershipModalOpen(true)
  }

  function openPartnership(id: string) {
    setEditingPartnershipId(id)
    setPartnershipModalOpen(true)
  }

  // Deep-link support for "View partnership" from a Finances ledger entry.
  useEffect(() => {
    if (openPartnershipId) openPartnership(openPartnershipId)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only run for the search param present on arrival
  }, [openPartnershipId])

  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="mt-2 font-display-bold text-3xl font-semibold text-[var(--charm-ink)]">Brand Deals</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">
          Paste a brand email or DM to auto-fill a deal, or add one manually. Brands are created automatically when
          you save a deal.
        </p>
      </div>

      <Tabs defaultValue={openPartnershipId ? 'partnerships' : 'pipeline'}>
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="partnerships">
            Long-Term Partnerships{partnerships.length > 0 && ` (${partnerships.length})`}
          </TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="archived">
            Archived{archivedCount > 0 && ` (${archivedCount})`}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-4">
          <DealPipeline onlyUnpaid={filter === 'unpaid'} initialOpenDealId={openDeal} />
        </TabsContent>
        <TabsContent value="partnerships" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-[var(--charm-ink-soft)]">
              Retainers and other ongoing relationships — including Canvas UGC — tracked separately from one-off
              deals.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={openNewPartnership}
              className="shrink-0 gap-1 bg-[var(--accent)] text-[var(--accent-foreground)] hover:opacity-90"
            >
              <Plus className="size-3.5" /> New Partnership
            </Button>
          </div>
          <PartnershipsGrid onOpen={openPartnership} />
        </TabsContent>
        <TabsContent value="brands" className="mt-4">
          <BrandsGrid />
        </TabsContent>
        <TabsContent value="archived" className="mt-4">
          <ArchivedDealsGrid />
        </TabsContent>
      </Tabs>

      <PartnershipModal
        open={partnershipModalOpen}
        onOpenChange={setPartnershipModalOpen}
        partnershipId={editingPartnershipId}
      />
    </div>
  )
}
