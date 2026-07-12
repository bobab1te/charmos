import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from './supabase/browser-client'
import { brandFromRow, dealFromRow, ideaFromRow, ledgerFromRow } from './supabase/mappers'
import { splitList } from './deal-form-utils'
import type { Brand, BrandDeal, DealFormValues, DealStage, IdeaPost, LedgerEntry } from './types'
import type { Json } from './supabase/database.types'

/**
 * Supabase-backed data layer: an initial per-table fetch scoped to the signed
 * -in user (RLS enforces this server-side too) kept current via postgres_changes
 * subscriptions, so any consumer re-renders instantly — including across tabs
 * and devices, not just across components in this tree.
 */
interface CharmStoreValue {
  brands: Array<Brand>
  deals: Array<BrandDeal>
  ideas: Array<IdeaPost>
  ledger: Array<LedgerEntry>
  moveDeal: (dealId: string, stage: DealStage) => void
  /** Pass null to clear the override and fall back to the deterministic default color. */
  updateDealColor: (dealId: string, color: string | null) => void
  assignIdeaDate: (ideaId: string, date: string) => void
  addIdea: (idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => void
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => void
  brandById: (id: string) => Brand | undefined
  dealById: (id: string) => BrandDeal | undefined
  /** Finds-or-creates the brand by (case-insensitive) name, then creates or updates the deal. Returns the deal id. */
  saveDeal: (form: DealFormValues, existingDealId?: string) => Promise<string>
  deleteDeal: (dealId: string) => Promise<void>
  updateBrand: (brandId: string, updates: Partial<Pick<Brand, 'name' | 'contactName' | 'contactEmail'>>) => void
  /** Returns false without deleting if the brand still has deals attached. */
  deleteBrand: (brandId: string) => Promise<boolean>
}

const CharmStoreContext = createContext<CharmStoreValue | null>(null)

interface LoosePayload {
  eventType: string
  new: unknown
  old: unknown
}

/** Realtime payloads come back typed as {[key: string]: any} — the runtime shape is guaranteed by the table/filter, so fromRow does the real casting. */
function applyChange<Row, Domain extends { id: string }>(
  prev: Array<Domain>,
  payload: LoosePayload,
  fromRow: (row: Row) => Domain,
): Array<Domain> {
  if (payload.eventType === 'DELETE') {
    const oldId = (payload.old as { id?: string } | null)?.id
    return oldId ? prev.filter((item) => item.id !== oldId) : prev
  }
  const domain = fromRow(payload.new as Row)
  const exists = prev.some((item) => item.id === domain.id)
  return exists ? prev.map((item) => (item.id === domain.id ? domain : item)) : [domain, ...prev]
}

export function CharmStoreProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null)
  const [brands, setBrands] = useState<Array<Brand>>([])
  const [deals, setDeals] = useState<Array<BrandDeal>>([])
  const [ideas, setIdeas] = useState<Array<IdeaPost>>([])
  const [ledger, setLedger] = useState<Array<LedgerEntry>>([])

  // This provider lives at the app root and never unmounts across client-side
  // navigation, so it must react to login/logout rather than only checking once.
  useEffect(() => {
    if (!isSupabaseConfigured) return
    const supabase = getSupabaseBrowserClient()

    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null))

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) {
      setBrands([])
      setDeals([])
      setIdeas([])
      setLedger([])
      return
    }

    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    async function loadInitial() {
      const [brandsRes, dealsRes, ideasRes, ledgerRes] = await Promise.all([
        supabase.from('brands').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('ideas').select('*').order('created_at', { ascending: false }),
        supabase.from('ledger').select('*').order('date', { ascending: false }),
      ])
      if (cancelled) return
      setBrands((brandsRes.data ?? []).map(brandFromRow))
      setDeals((dealsRes.data ?? []).map(dealFromRow))
      setIdeas((ideasRes.data ?? []).map(ideaFromRow))
      setLedger((ledgerRes.data ?? []).map(ledgerFromRow))
    }

    loadInitial()

    const channel = supabase
      .channel(`charm-store-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'brands', filter: `user_id=eq.${userId}` },
        (payload) => setBrands((prev) => applyChange(prev, payload, brandFromRow)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deals', filter: `user_id=eq.${userId}` },
        (payload) => setDeals((prev) => applyChange(prev, payload, dealFromRow)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ideas', filter: `user_id=eq.${userId}` },
        (payload) => setIdeas((prev) => applyChange(prev, payload, ideaFromRow)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ledger', filter: `user_id=eq.${userId}` },
        (payload) => setLedger((prev) => applyChange(prev, payload, ledgerFromRow)),
      )
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [userId])

  const moveDeal = useCallback(
    (dealId: string, stage: DealStage) => {
      const stageUpdatedAt = new Date().toISOString()
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, stage, stageUpdatedAt } : deal)))
      if (!userId) return
      getSupabaseBrowserClient()
        .from('deals')
        .update({ stage, stage_updated_at: stageUpdatedAt })
        .eq('id', dealId)
        .then(() => {})
    },
    [userId],
  )

  const updateDealColor = useCallback(
    (dealId: string, color: string | null) => {
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, color: color ?? undefined } : deal)))
      if (!userId) return
      getSupabaseBrowserClient().from('deals').update({ color }).eq('id', dealId).then(() => {})
    },
    [userId],
  )

  const assignIdeaDate = useCallback(
    (ideaId: string, date: string) => {
      let nextStatus: IdeaPost['status'] | undefined
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== ideaId) return idea
          nextStatus = idea.status === 'idea' ? 'scheduled' : idea.status
          return { ...idea, scheduledDate: date, status: nextStatus }
        }),
      )
      if (!userId) return
      getSupabaseBrowserClient()
        .from('ideas')
        .update({ scheduled_date: date, status: nextStatus })
        .eq('id', ideaId)
        .then(() => {})
    },
    [userId],
  )

  const addIdea = useCallback(
    (idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => {
      const tempId = `idea-temp-${Date.now()}`
      const newIdea: IdeaPost = {
        id: tempId,
        title: idea.title,
        hook: idea.hook,
        description: idea.description,
        platforms: idea.platforms ?? [],
        status: idea.status ?? 'idea',
        scheduledDate: idea.scheduledDate ?? null,
        referenceLinks: idea.referenceLinks ?? [],
        createdAt: new Date().toISOString(),
      }
      setIdeas((prev) => [newIdea, ...prev])

      if (!userId) return
      getSupabaseBrowserClient()
        .from('ideas')
        .insert({
          user_id: userId,
          title: newIdea.title,
          hook: newIdea.hook,
          description: newIdea.description,
          platforms: newIdea.platforms,
          status: newIdea.status,
          scheduled_date: newIdea.scheduledDate,
          reference_links: newIdea.referenceLinks,
        })
        .select('*')
        .single()
        .then(({ data }) => {
          if (!data) return
          const real = ideaFromRow(data)
          setIdeas((prev) => prev.map((i) => (i.id === tempId ? real : i)))
        })
    },
    [userId],
  )

  const addLedgerEntry = useCallback(
    (entry: Omit<LedgerEntry, 'id'>) => {
      const tempId = `ledger-temp-${Date.now()}`
      setLedger((prev) => [{ ...entry, id: tempId }, ...prev])

      if (!userId) return
      getSupabaseBrowserClient()
        .from('ledger')
        .insert({
          user_id: userId,
          type: entry.type,
          amount: entry.amount,
          currency: entry.currency,
          date: entry.date,
          description: entry.description,
          deal_id: entry.dealId,
          brand_id: entry.brandId,
        })
        .select('*')
        .single()
        .then(({ data }) => {
          if (!data) return
          const real = ledgerFromRow(data)
          setLedger((prev) => prev.map((e) => (e.id === tempId ? real : e)))
        })
    },
    [userId],
  )

  const brandById = useCallback((id: string) => brands.find((b) => b.id === id), [brands])
  const dealById = useCallback((id: string) => deals.find((d) => d.id === id), [deals])

  const saveDeal = useCallback(
    async (form: DealFormValues, existingDealId?: string): Promise<string> => {
      if (!userId) throw new Error('Not signed in')
      const supabase = getSupabaseBrowserClient()
      const now = new Date().toISOString()
      const trimmedName = form.brandName.trim()

      let brandId: string
      const existingBrand = brands.find((b) => b.name.toLowerCase() === trimmedName.toLowerCase())

      if (existingBrand) {
        brandId = existingBrand.id
        const hasNewContactInfo = form.brandContactName.trim() || form.brandContactEmail.trim()
        if (hasNewContactInfo) {
          const updates: { contact_name?: string; contact_email?: string } = {}
          if (form.brandContactName.trim()) updates.contact_name = form.brandContactName.trim()
          if (form.brandContactEmail.trim()) updates.contact_email = form.brandContactEmail.trim()
          const { data } = await supabase.from('brands').update(updates).eq('id', brandId).select('*').single()
          if (data) {
            const updated = brandFromRow(data)
            setBrands((prev) => prev.map((b) => (b.id === brandId ? updated : b)))
          }
        }
      } else {
        const { data, error } = await supabase
          .from('brands')
          .insert({
            user_id: userId,
            name: trimmedName,
            contact_name: form.brandContactName.trim() || undefined,
            contact_email: form.brandContactEmail.trim() || undefined,
          })
          .select('*')
          .single()
        if (error || !data) throw new Error(error?.message ?? 'Failed to create brand')
        brandId = data.id
        setBrands((prev) => [brandFromRow(data), ...prev])
      }

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

      const shipment = hasShipment
        ? {
            carrier: form.shipmentCarrier.trim() || undefined,
            trackingNumber: form.shipmentTrackingNumber.trim() || undefined,
            shippedDate: form.shipmentShippedDate ? new Date(form.shipmentShippedDate).toISOString() : undefined,
            estimatedDelivery: form.shipmentEstimatedDelivery
              ? new Date(form.shipmentEstimatedDelivery).toISOString()
              : undefined,
          }
        : null

      const contentRequirements = {
        hashtags: splitList(form.hashtags),
        accountsToTag: splitList(form.accountsToTag),
        clipsToUse: splitList(form.clipsToUse),
        notes: form.contentNotes.trim() || undefined,
      }

      const existingDeal = existingDealId ? deals.find((d) => d.id === existingDealId) : undefined

      const dealPayload = {
        user_id: userId,
        brand_id: brandId,
        stage: form.stage,
        deliverables: (deliverables.length > 0 ? deliverables : (existingDeal?.deliverables ?? [])) as unknown as Json,
        compensation_amount: Number(form.compensationAmount) || 0,
        compensation_currency: form.compensationCurrency.trim() || 'USD',
        compensation_type: form.compensationType,
        expected_payout_date: form.expectedPayoutDate ? new Date(form.expectedPayoutDate).toISOString() : null,
        paid: form.paidInFull,
        paid_date: form.paidInFull ? (existingDeal?.paid && existingDeal.paidDate ? existingDeal.paidDate : now) : null,
        usage_rights: form.usageRights.trim() || undefined,
        shipment: shipment as unknown as Json,
        content_requirements: contentRequirements as unknown as Json,
        stage_updated_at: existingDeal && existingDeal.stage === form.stage ? existingDeal.stageUpdatedAt : now,
      }

      if (existingDealId) {
        const { data, error } = await supabase
          .from('deals')
          .update(dealPayload)
          .eq('id', existingDealId)
          .select('*')
          .single()
        if (error || !data) throw new Error(error?.message ?? 'Failed to update deal')
        const updated = dealFromRow(data)
        setDeals((prev) => prev.map((d) => (d.id === existingDealId ? updated : d)))
        return existingDealId
      }

      const { data, error } = await supabase.from('deals').insert(dealPayload).select('*').single()
      if (error || !data) throw new Error(error?.message ?? 'Failed to create deal')
      const created = dealFromRow(data)
      setDeals((prev) => [created, ...prev])
      return created.id
    },
    [userId, brands, deals],
  )

  const deleteDeal = useCallback(
    async (dealId: string) => {
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
      if (!userId) return
      await getSupabaseBrowserClient().from('deals').delete().eq('id', dealId)
    },
    [userId],
  )

  const updateBrand = useCallback(
    (brandId: string, updates: Partial<Pick<Brand, 'name' | 'contactName' | 'contactEmail'>>) => {
      setBrands((prev) => prev.map((b) => (b.id === brandId ? { ...b, ...updates } : b)))
      if (!userId) return
      const dbUpdates: { name?: string; contact_name?: string; contact_email?: string } = {}
      if (updates.name !== undefined) dbUpdates.name = updates.name
      if (updates.contactName !== undefined) dbUpdates.contact_name = updates.contactName
      if (updates.contactEmail !== undefined) dbUpdates.contact_email = updates.contactEmail
      getSupabaseBrowserClient().from('brands').update(dbUpdates).eq('id', brandId).then(() => {})
    },
    [userId],
  )

  const deleteBrand = useCallback(
    async (brandId: string): Promise<boolean> => {
      if (deals.some((d) => d.brandId === brandId)) return false
      setBrands((prev) => prev.filter((b) => b.id !== brandId))
      if (userId) {
        await getSupabaseBrowserClient().from('brands').delete().eq('id', brandId)
      }
      return true
    },
    [deals, userId],
  )

  const value = useMemo(
    () => ({
      brands,
      deals,
      ideas,
      ledger,
      moveDeal,
      updateDealColor,
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
      updateDealColor,
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
