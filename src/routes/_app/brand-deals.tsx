import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Pencil, Trash2, X, Check } from 'lucide-react'
import { Input } from '#/components/ui/input'
import { Button } from '#/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '#/components/ui/tabs'
import { DealPipeline } from '#/components/dashboard/deal-pipeline'
import { useCharmStore } from '#/lib/charm-store'
import type { Brand } from '#/lib/types'

export const Route = createFileRoute('/_app/brand-deals')({ component: BrandDealsPage })

function BrandCard({ brand, dealCount }: { brand: Brand; dealCount: number }) {
  const { updateBrand, deleteBrand } = useCharmStore()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(brand.name)
  const [contactName, setContactName] = useState(brand.contactName ?? '')
  const [contactEmail, setContactEmail] = useState(brand.contactEmail ?? '')
  const [blockedMessage, setBlockedMessage] = useState<string | null>(null)

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

  function handleDelete() {
    const deleted = deleteBrand(brand.id)
    if (!deleted) {
      setBlockedMessage(`Can't delete — ${dealCount} deal${dealCount === 1 ? '' : 's'} still reference this brand.`)
    }
  }

  if (editing) {
    return (
      <div className="charm-glass flex flex-col gap-2.5 rounded-2xl p-4">
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
    <div className="charm-glass flex flex-col gap-2 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-base font-semibold text-[var(--charm-ink)]">{brand.name}</p>
          {brand.contactName && <p className="text-sm text-[var(--charm-ink-soft)]">{brand.contactName}</p>}
          {brand.contactEmail && <p className="text-xs text-[var(--charm-ink-soft)]">{brand.contactEmail}</p>}
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

function BrandDealsPage() {
  return (
    <div className="relative z-10 mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6">
      <div>
        <h1 className="font-display-bold text-2xl font-semibold text-[var(--charm-ink)]">Brand Deals</h1>
        <p className="text-sm text-[var(--charm-ink-soft)]">
          Paste a brand email or DM to auto-fill a deal, or add one manually. Brands are created automatically when
          you save a deal.
        </p>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList>
          <TabsTrigger value="pipeline">Pipeline</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
        </TabsList>
        <TabsContent value="pipeline" className="mt-4">
          <DealPipeline />
        </TabsContent>
        <TabsContent value="brands" className="mt-4">
          <BrandsGrid />
        </TabsContent>
      </Tabs>
    </div>
  )
}
