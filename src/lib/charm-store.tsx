import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { mockBrands, mockDeals, mockIdeas, mockLedger } from './mock-data'
import { splitList } from './deal-form-utils'
import type { Brand, BrandDeal, DealFormValues, DealStage, IdeaPost, LedgerEntry } from './types'

/**
 * In-memory data layer standing in for Supabase. Every mutation goes through
 * this single context so any consumer re-renders immediately — the same
 * "propagate everywhere instantly" contract Supabase Realtime subscriptions
 * will provide once wired up, without changing how components read/write data.
 */
interface CharmStoreValue {
  brands: Array<Brand>
  deals: Array<BrandDeal>
  ideas: Array<IdeaPost>
  ledger: Array<LedgerEntry>
  moveDeal: (dealId: string, stage: DealStage) => void
  assignIdeaDate: (ideaId: string, date: string) => void
  addIdea: (idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => void
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => void
  brandById: (id: string) => Brand | undefined
  dealById: (id: string) => BrandDeal | undefined
  /** Finds-or-creates the brand by (case-insensitive) name, then creates or updates the deal. Returns the deal id. */
  saveDeal: (form: DealFormValues, existingDealId?: string) => string
  deleteDeal: (dealId: string) => void
  updateBrand: (brandId: string, updates: Partial<Pick<Brand, 'name' | 'contactName' | 'contactEmail'>>) => void
  /** Returns false without deleting if the brand still has deals attached. */
  deleteBrand: (brandId: string) => boolean
}

const CharmStoreContext = createContext<CharmStoreValue | null>(null)

export function CharmStoreProvider({ children }: { children: ReactNode }) {
  const [brands, setBrands] = useState<Array<Brand>>(mockBrands)
  const [deals, setDeals] = useState<Array<BrandDeal>>(mockDeals)
  const [ideas, setIdeas] = useState<Array<IdeaPost>>(mockIdeas)
  const [ledger, setLedger] = useState<Array<LedgerEntry>>(mockLedger)

  const moveDeal = useCallback((dealId: string, stage: DealStage) => {
    setDeals((prev) =>
      prev.map((deal) =>
        deal.id === dealId
          ? { ...deal, stage, stageUpdatedAt: new Date().toISOString() }
          : deal,
      ),
    )
  }, [])

  const assignIdeaDate = useCallback((ideaId: string, date: string) => {
    setIdeas((prev) =>
      prev.map((idea) =>
        idea.id === ideaId
          ? { ...idea, scheduledDate: date, status: idea.status === 'idea' ? 'scheduled' : idea.status }
          : idea,
      ),
    )
  }, [])

  const addIdea = useCallback((idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => {
    setIdeas((prev) => [
      {
        id: `idea-${Date.now()}`,
        title: idea.title,
        hook: idea.hook,
        description: idea.description,
        platforms: idea.platforms ?? [],
        status: idea.status ?? 'idea',
        scheduledDate: idea.scheduledDate ?? null,
        referenceLinks: idea.referenceLinks ?? [],
        createdAt: new Date().toISOString(),
      },
      ...prev,
    ])
  }, [])

  const addLedgerEntry = useCallback((entry: Omit<LedgerEntry, 'id'>) => {
    setLedger((prev) => [{ ...entry, id: `ledger-${Date.now()}` }, ...prev])
  }, [])

  const brandById = useCallback((id: string) => brands.find((b) => b.id === id), [brands])
  const dealById = useCallback((id: string) => deals.find((d) => d.id === id), [deals])

  const saveDeal = useCallback(
    (form: DealFormValues, existingDealId?: string) => {
      const now = new Date().toISOString()
      const trimmedName = form.brandName.trim()
      let brandId = ''

      setBrands((prev) => {
        const existing = prev.find((b) => b.name.toLowerCase() === trimmedName.toLowerCase())
        if (existing) {
          brandId = existing.id
          const hasNewContactInfo = form.brandContactName.trim() || form.brandContactEmail.trim()
          if (!hasNewContactInfo) return prev
          return prev.map((b) =>
            b.id === existing.id
              ? {
                  ...b,
                  contactName: form.brandContactName.trim() || b.contactName,
                  contactEmail: form.brandContactEmail.trim() || b.contactEmail,
                }
              : b,
          )
        }
        brandId = `brand-${Date.now()}`
        const newBrand: Brand = {
          id: brandId,
          name: trimmedName,
          contactName: form.brandContactName.trim() || undefined,
          contactEmail: form.brandContactEmail.trim() || undefined,
          createdAt: now,
        }
        return [...prev, newBrand]
      })

      const deliverables = form.deliverables
        .filter((d) => d.type.trim())
        .map((d, i) => ({
          id: `del-${Date.now()}-${i}`,
          type: d.type.trim(),
          description: d.description.trim() || undefined,
          dueDate: d.dueDate ? new Date(d.dueDate).toISOString() : now,
          done: false,
        }))

      const hasShipment =
        form.shipmentCarrier.trim() ||
        form.shipmentTrackingNumber.trim() ||
        form.shipmentShippedDate.trim() ||
        form.shipmentEstimatedDelivery.trim()

      const dealId = existingDealId ?? `deal-${Date.now()}`

      setDeals((prev) => {
        const existing = prev.find((d) => d.id === existingDealId)
        const nextDeal: BrandDeal = {
          id: dealId,
          brandId,
          stage: form.stage,
          deliverables: deliverables.length > 0 ? deliverables : (existing?.deliverables ?? []),
          compensationAmount: Number(form.compensationAmount) || 0,
          compensationCurrency: form.compensationCurrency.trim() || 'USD',
          usageRights: form.usageRights.trim() || undefined,
          shipment: hasShipment
            ? {
                carrier: form.shipmentCarrier.trim() || undefined,
                trackingNumber: form.shipmentTrackingNumber.trim() || undefined,
                shippedDate: form.shipmentShippedDate ? new Date(form.shipmentShippedDate).toISOString() : undefined,
                estimatedDelivery: form.shipmentEstimatedDelivery
                  ? new Date(form.shipmentEstimatedDelivery).toISOString()
                  : undefined,
              }
            : undefined,
          contentRequirements: {
            hashtags: splitList(form.hashtags),
            accountsToTag: splitList(form.accountsToTag),
            clipsToUse: splitList(form.clipsToUse),
            notes: form.contentNotes.trim() || undefined,
          },
          paid: existing?.paid ?? false,
          paidDate: existing?.paidDate,
          createdAt: existing?.createdAt ?? now,
          stageUpdatedAt: existing && existing.stage === form.stage ? existing.stageUpdatedAt : now,
        }

        if (existing) {
          return prev.map((d) => (d.id === dealId ? nextDeal : d))
        }
        return [...prev, nextDeal]
      })

      return dealId
    },
    [],
  )

  const deleteDeal = useCallback((dealId: string) => {
    setDeals((prev) => prev.filter((d) => d.id !== dealId))
  }, [])

  const updateBrand = useCallback(
    (brandId: string, updates: Partial<Pick<Brand, 'name' | 'contactName' | 'contactEmail'>>) => {
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, ...updates } : b)))
    },
    [],
  )

  const deleteBrand = useCallback(
    (brandId: string) => {
      if (deals.some((d) => d.brandId === brandId)) return false
      setBrands((prev) => prev.filter((b) => b.id !== brandId))
      return true
    },
    [deals],
  )

  const value = useMemo(
    () => ({
      brands,
      deals,
      ideas,
      ledger,
      moveDeal,
      assignIdeaDate,
      addIdea,
      addLedgerEntry,
      brandById,
      dealById,
      saveDeal,
      deleteDeal,
      updateBrand,
      deleteBrand,
    }),
    [
      brands,
      deals,
      ideas,
      ledger,
      moveDeal,
      assignIdeaDate,
      addIdea,
      addLedgerEntry,
      brandById,
      dealById,
      saveDeal,
      deleteDeal,
      updateBrand,
      deleteBrand,
    ],
  )

  return <CharmStoreContext.Provider value={value}>{children}</CharmStoreContext.Provider>
}

export function useCharmStore() {
  const ctx = useContext(CharmStoreContext)
  if (!ctx) throw new Error('useCharmStore must be used within CharmStoreProvider')
  return ctx
}
