import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { getSupabaseBrowserClient, isSupabaseConfigured } from './supabase/browser-client'
import {
  brandFromRow,
  dealFromRow,
  ideaFromRow,
  ledgerFromRow,
  partnershipDeliverableFromRow,
  partnershipFromRow,
} from './supabase/mappers'
import { splitList } from './deal-form-utils'
import { dateOnlyToISOString } from './date-only'
import type { BulkImportRow } from './bulk-import-utils'
import type {
  Brand,
  BrandDeal,
  DealFormValues,
  DealStage,
  IdeaPost,
  LedgerEntry,
  Partnership,
  PartnershipDeliverableLog,
  PartnershipFormValues,
} from './types'
import type { Database, Json } from './supabase/database.types'

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
  partnerships: Array<Partnership>
  partnershipDeliverables: Array<PartnershipDeliverableLog>
  moveDeal: (dealId: string, stage: DealStage) => void
  /** Pass null to clear the override and fall back to the deterministic default color. */
  updateDealColor: (dealId: string, color: string | null) => void
  /** Quick inline edit for the card-level notes preview — updates the general BrandDeal.notes field, distinct from contentRequirements.notes. */
  updateDealNotes: (dealId: string, notes: string) => void
  assignIdeaDate: (ideaId: string, date: string) => void
  /** Clears scheduledDate and reverts status back to 'idea' if it hadn't progressed past 'scheduled'. */
  unassignIdeaDate: (ideaId: string) => void
  addIdea: (idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => void
  updateIdea: (
    ideaId: string,
    updates: Partial<Pick<IdeaPost, 'title' | 'hook' | 'description' | 'referenceLinks' | 'series' | 'platforms'>>,
  ) => void
  deleteIdea: (ideaId: string) => void
  addLedgerEntry: (entry: Omit<LedgerEntry, 'id'>) => void
  brandById: (id: string) => Brand | undefined
  dealById: (id: string) => BrandDeal | undefined
  /** Finds-or-creates the brand by (case-insensitive) name, then creates or updates the deal. Returns the deal id. */
  saveDeal: (form: DealFormValues, existingDealId?: string) => Promise<string>
  /** Finds-or-creates brands (deduped case-insensitively, one insert for all new ones) and inserts all deals in a single batch — for the bulk import review flow. Returns how many deals were created. */
  bulkCreateDeals: (rows: Array<BulkImportRow>) => Promise<number>
  deleteDeal: (dealId: string) => Promise<void>
  archiveDeal: (dealId: string) => void
  unarchiveDeal: (dealId: string) => void
  updateBrand: (brandId: string, updates: Partial<Pick<Brand, 'name' | 'contactName' | 'contactEmail'>>) => void
  /** Returns false without deleting if the brand still has deals attached. */
  deleteBrand: (brandId: string) => Promise<boolean>
  partnershipById: (id: string) => Partnership | undefined
  /** Finds-or-creates the brand by (case-insensitive) name, then creates or updates the partnership. Returns the partnership id. */
  savePartnership: (form: PartnershipFormValues, existingId?: string) => Promise<string>
  deletePartnership: (partnershipId: string) => Promise<void>
  logPartnershipDeliverable: (partnershipId: string) => void
  /** Removes the most recently logged deliverable for this partnership, if any — for correcting mis-clicks. */
  undoLastPartnershipDeliverable: (partnershipId: string) => void
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
  const [partnerships, setPartnerships] = useState<Array<Partnership>>([])
  const [partnershipDeliverables, setPartnershipDeliverables] = useState<Array<PartnershipDeliverableLog>>([])

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
      setPartnerships([])
      setPartnershipDeliverables([])
      return
    }

    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    async function loadInitial() {
      const [brandsRes, dealsRes, ideasRes, ledgerRes, partnershipsRes, partnershipDeliverablesRes] =
        await Promise.all([
          supabase.from('brands').select('*').order('created_at', { ascending: false }),
          supabase.from('deals').select('*').order('created_at', { ascending: false }),
          supabase.from('ideas').select('*').order('created_at', { ascending: false }),
          supabase.from('ledger').select('*').order('date', { ascending: false }),
          supabase.from('partnerships').select('*').order('created_at', { ascending: false }),
          supabase.from('partnership_deliverables').select('*').order('completed_at', { ascending: false }),
        ])
      if (cancelled) return
      setBrands((brandsRes.data ?? []).map(brandFromRow))
      setDeals((dealsRes.data ?? []).map(dealFromRow))
      setIdeas((ideasRes.data ?? []).map(ideaFromRow))
      setLedger((ledgerRes.data ?? []).map(ledgerFromRow))
      setPartnerships((partnershipsRes.data ?? []).map(partnershipFromRow))
      setPartnershipDeliverables((partnershipDeliverablesRes.data ?? []).map(partnershipDeliverableFromRow))
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partnerships', filter: `user_id=eq.${userId}` },
        (payload) => setPartnerships((prev) => applyChange(prev, payload, partnershipFromRow)),
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partnership_deliverables', filter: `user_id=eq.${userId}` },
        (payload) => setPartnershipDeliverables((prev) => applyChange(prev, payload, partnershipDeliverableFromRow)),
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

  const updateDealNotes = useCallback(
    (dealId: string, notes: string) => {
      const trimmed = notes.trim() || undefined
      setDeals((prev) => prev.map((deal) => (deal.id === dealId ? { ...deal, notes: trimmed } : deal)))
      if (!userId) return
      getSupabaseBrowserClient().from('deals').update({ notes: trimmed ?? null }).eq('id', dealId).then(() => {})
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
        series: idea.series,
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
          series: newIdea.series,
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

  const unassignIdeaDate = useCallback(
    (ideaId: string) => {
      let nextStatus: IdeaPost['status'] | undefined
      setIdeas((prev) =>
        prev.map((idea) => {
          if (idea.id !== ideaId) return idea
          nextStatus = idea.status === 'scheduled' ? 'idea' : idea.status
          return { ...idea, scheduledDate: null, status: nextStatus }
        }),
      )
      if (!userId) return
      getSupabaseBrowserClient()
        .from('ideas')
        .update({ scheduled_date: null, status: nextStatus })
        .eq('id', ideaId)
        .then(() => {})
    },
    [userId],
  )

  const updateIdea = useCallback(
    (
      ideaId: string,
      updates: Partial<Pick<IdeaPost, 'title' | 'hook' | 'description' | 'referenceLinks' | 'series' | 'platforms'>>,
    ) => {
      setIdeas((prev) => prev.map((idea) => (idea.id === ideaId ? { ...idea, ...updates } : idea)))
      if (!userId) return
      const dbUpdates: Database['public']['Tables']['ideas']['Update'] = {}
      if (updates.title !== undefined) dbUpdates.title = updates.title
      if (updates.hook !== undefined) dbUpdates.hook = updates.hook ?? null
      if (updates.description !== undefined) dbUpdates.description = updates.description ?? null
      if (updates.referenceLinks !== undefined) dbUpdates.reference_links = updates.referenceLinks
      if (updates.series !== undefined) dbUpdates.series = updates.series ?? null
      if (updates.platforms !== undefined) dbUpdates.platforms = updates.platforms
      getSupabaseBrowserClient().from('ideas').update(dbUpdates).eq('id', ideaId).then(() => {})
    },
    [userId],
  )

  const deleteIdea = useCallback(
    (ideaId: string) => {
      setIdeas((prev) => prev.filter((idea) => idea.id !== ideaId))
      if (!userId) return
      getSupabaseBrowserClient().from('ideas').delete().eq('id', ideaId).then(() => {})
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
          dueDate: d.dueDate ? dateOnlyToISOString(d.dueDate) : now,
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
            shippedDate: form.shipmentShippedDate ? dateOnlyToISOString(form.shipmentShippedDate) : undefined,
            estimatedDelivery: form.shipmentEstimatedDelivery
              ? dateOnlyToISOString(form.shipmentEstimatedDelivery)
              : undefined,
          }
        : null

      const contentRequirements = {
        hashtags: splitList(form.hashtags),
        accountsToTag: splitList(form.accountsToTag),
        clipsToUse: splitList(form.clipsToUse),
        notes: form.contentNotes.trim() || undefined,
        referenceLinks: form.referenceLinks.map((link) => link.trim()).filter(Boolean),
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
        expected_payout_date: form.expectedPayoutDate ? dateOnlyToISOString(form.expectedPayoutDate) : null,
        paid: form.paidInFull,
        paid_date: form.paidInFull ? (existingDeal?.paid && existingDeal.paidDate ? existingDeal.paidDate : now) : null,
        usage_rights: form.usageRights.trim() || undefined,
        shipment: shipment as unknown as Json,
        content_requirements: contentRequirements as unknown as Json,
        notes: form.dealNotes.trim() || null,
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

  const bulkCreateDeals = useCallback(
    async (rows: Array<BulkImportRow>): Promise<number> => {
      if (!userId) throw new Error('Not signed in')
      if (rows.length === 0) return 0
      const supabase = getSupabaseBrowserClient()
      const now = new Date().toISOString()

      // Resolve brands first: reuse an existing brand (case-insensitive) if one matches, and
      // create every genuinely new brand name in a single insert rather than one round trip per row.
      const brandIdByName = new Map<string, string>()
      for (const b of brands) brandIdByName.set(b.name.toLowerCase(), b.id)

      const uniqueNewNames = Array.from(
        new Set(
          rows
            .map((r) => r.brandName.trim())
            .filter((name) => name && !brandIdByName.has(name.toLowerCase())),
        ),
      )

      if (uniqueNewNames.length > 0) {
        const { data, error } = await supabase
          .from('brands')
          .insert(uniqueNewNames.map((name) => ({ user_id: userId, name })))
          .select('*')
        if (error || !data) throw new Error(error?.message ?? 'Failed to create brands')
        data.forEach((row) => brandIdByName.set(row.name.toLowerCase(), row.id))
        setBrands((prev) => [...data.map(brandFromRow), ...prev])
      }

      const dealPayloads = rows.map((row) => {
        const brandId = brandIdByName.get(row.brandName.trim().toLowerCase())
        if (!brandId) throw new Error(`No brand resolved for "${row.brandName}"`)
        const deliverables = row.dueDate
          ? [
              {
                id: `del-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                type: row.deliverableType.trim() || 'Deliverable',
                dueDate: dateOnlyToISOString(row.dueDate),
                done: false,
              },
            ]
          : []
        return {
          user_id: userId,
          brand_id: brandId,
          stage: row.stage,
          deliverables: deliverables as unknown as Json,
          compensation_amount: Number(row.compensationAmount) || 0,
          compensation_currency: row.compensationCurrency.trim() || 'USD',
          compensation_type: row.compensationType,
          stage_updated_at: now,
        }
      })

      const { data, error } = await supabase.from('deals').insert(dealPayloads).select('*')
      if (error || !data) throw new Error(error?.message ?? 'Failed to import deals')
      const created = data.map(dealFromRow)
      setDeals((prev) => [...created, ...prev])
      return created.length
    },
    [userId, brands],
  )

  const deleteDeal = useCallback(
    async (dealId: string) => {
      setDeals((prev) => prev.filter((d) => d.id !== dealId))
      if (!userId) return
      await getSupabaseBrowserClient().from('deals').delete().eq('id', dealId)
    },
    [userId],
  )

  const archiveDeal = useCallback(
    (dealId: string) => {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, archived: true } : d)))
      if (!userId) return
      getSupabaseBrowserClient().from('deals').update({ archived: true }).eq('id', dealId).then(() => {})
    },
    [userId],
  )

  const unarchiveDeal = useCallback(
    (dealId: string) => {
      setDeals((prev) => prev.map((d) => (d.id === dealId ? { ...d, archived: false } : d)))
      if (!userId) return
      getSupabaseBrowserClient().from('deals').update({ archived: false }).eq('id', dealId).then(() => {})
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
      if (deals.some((d) => d.brandId === brandId) || partnerships.some((p) => p.brandId === brandId)) return false
      setBrands((prev) => prev.filter((b) => b.id !== brandId))
      if (userId) {
        await getSupabaseBrowserClient().from('brands').delete().eq('id', brandId)
      }
      return true
    },
    [deals, partnerships, userId],
  )

  const partnershipById = useCallback((id: string) => partnerships.find((p) => p.id === id), [partnerships])

  const savePartnership = useCallback(
    async (form: PartnershipFormValues, existingId?: string): Promise<string> => {
      if (!userId) throw new Error('Not signed in')
      const supabase = getSupabaseBrowserClient()
      const trimmedName = form.brandName.trim()

      let brandId: string
      const existingBrand = brands.find((b) => b.name.toLowerCase() === trimmedName.toLowerCase())
      if (existingBrand) {
        brandId = existingBrand.id
      } else {
        const { data, error } = await supabase
          .from('brands')
          .insert({ user_id: userId, name: trimmedName })
          .select('*')
          .single()
        if (error || !data) throw new Error(error?.message ?? 'Failed to create brand')
        brandId = data.id
        setBrands((prev) => [brandFromRow(data), ...prev])
      }

      const contentFormats = splitList(form.contentFormats)

      const payload = {
        user_id: userId,
        brand_id: brandId,
        start_date: form.startDate ? dateOnlyToISOString(form.startDate) : new Date().toISOString(),
        end_date: form.endDate ? dateOnlyToISOString(form.endDate) : null,
        payment_type: form.paymentType,
        retainer_amount: form.paymentType === 'retainer' ? Number(form.retainerAmount) || 0 : null,
        retainer_cadence: form.paymentType === 'retainer' ? form.retainerCadence : null,
        per_deliverable_rate: form.paymentType === 'per_deliverable' ? Number(form.perDeliverableRate) || 0 : null,
        currency: form.currency.trim() || 'USD',
        deliverable_count: Number(form.deliverableCount) || 1,
        deliverable_unit: form.deliverableUnit.trim() || 'pieces of content',
        deliverable_cadence: form.deliverableCadence,
        content_formats: contentFormats,
        notes: form.notes.trim() || null,
        status: form.status,
        paused_at: form.pausedDate ? dateOnlyToISOString(form.pausedDate) : null,
        unpaused_at: form.unpausedDate ? dateOnlyToISOString(form.unpausedDate) : null,
      }

      if (existingId) {
        const { data, error } = await supabase
          .from('partnerships')
          .update(payload)
          .eq('id', existingId)
          .select('*')
          .single()
        if (error || !data) throw new Error(error?.message ?? 'Failed to update partnership')
        const updated = partnershipFromRow(data)
        setPartnerships((prev) => prev.map((p) => (p.id === existingId ? updated : p)))
        return existingId
      }

      const { data, error } = await supabase.from('partnerships').insert(payload).select('*').single()
      if (error || !data) throw new Error(error?.message ?? 'Failed to create partnership')
      const created = partnershipFromRow(data)
      setPartnerships((prev) => [created, ...prev])
      return created.id
    },
    [userId, brands],
  )

  const deletePartnership = useCallback(
    async (partnershipId: string) => {
      setPartnerships((prev) => prev.filter((p) => p.id !== partnershipId))
      setPartnershipDeliverables((prev) => prev.filter((d) => d.partnershipId !== partnershipId))
      if (!userId) return
      await getSupabaseBrowserClient().from('partnerships').delete().eq('id', partnershipId)
    },
    [userId],
  )

  const logPartnershipDeliverable = useCallback(
    (partnershipId: string) => {
      const tempId = `partnership-deliverable-temp-${Date.now()}`
      const completedAt = new Date().toISOString()
      setPartnershipDeliverables((prev) => [{ id: tempId, partnershipId, completedAt }, ...prev])

      if (!userId) return
      getSupabaseBrowserClient()
        .from('partnership_deliverables')
        .insert({ user_id: userId, partnership_id: partnershipId, completed_at: completedAt })
        .select('*')
        .single()
        .then(({ data }) => {
          if (!data) return
          const real = partnershipDeliverableFromRow(data)
          setPartnershipDeliverables((prev) => prev.map((d) => (d.id === tempId ? real : d)))
        })
    },
    [userId],
  )

  const undoLastPartnershipDeliverable = useCallback(
    (partnershipId: string) => {
      const logsForPartnership = partnershipDeliverables
        .filter((d) => d.partnershipId === partnershipId)
        .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
      const mostRecent = logsForPartnership[0]
      if (!mostRecent) return
      setPartnershipDeliverables((prev) => prev.filter((d) => d.id !== mostRecent.id))
      if (!userId) return
      getSupabaseBrowserClient().from('partnership_deliverables').delete().eq('id', mostRecent.id).then(() => {})
    },
    [partnershipDeliverables, userId],
  )

  const value = useMemo(
    () => ({
      brands,
      deals,
      ideas,
      ledger,
      partnerships,
      partnershipDeliverables,
      moveDeal,
      updateDealColor,
      updateDealNotes,
      assignIdeaDate,
      unassignIdeaDate,
      addIdea,
      updateIdea,
      deleteIdea,
      addLedgerEntry,
      brandById,
      dealById,
      saveDeal,
      bulkCreateDeals,
      deleteDeal,
      archiveDeal,
      unarchiveDeal,
      updateBrand,
      deleteBrand,
      partnershipById,
      savePartnership,
      deletePartnership,
      logPartnershipDeliverable,
      undoLastPartnershipDeliverable,
    }),
    [
      brands,
      deals,
      ideas,
      ledger,
      partnerships,
      partnershipDeliverables,
      moveDeal,
      updateDealColor,
      updateDealNotes,
      assignIdeaDate,
      unassignIdeaDate,
      addIdea,
      updateIdea,
      deleteIdea,
      addLedgerEntry,
      brandById,
      dealById,
      saveDeal,
      bulkCreateDeals,
      deleteDeal,
      archiveDeal,
      unarchiveDeal,
      updateBrand,
      deleteBrand,
      partnershipById,
      savePartnership,
      deletePartnership,
      logPartnershipDeliverable,
      undoLastPartnershipDeliverable,
    ],
  )

  return <CharmStoreContext.Provider value={value}>{children}</CharmStoreContext.Provider>
}

export function useCharmStore() {
  const ctx = useContext(CharmStoreContext)
  if (!ctx) throw new Error('useCharmStore must be used within CharmStoreProvider')
  return ctx
}
