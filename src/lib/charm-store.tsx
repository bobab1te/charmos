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
  partnershipPaymentCycleFromRow,
} from './supabase/mappers'
import { splitList } from './deal-form-utils'
import { dateOnlyToISOString } from './date-only'
import {
  computeAllRetainerCycleWindows,
  computeCurrentRetainerCycleWindow,
  cycleMatchesWindow,
  isPartnershipPausedOn,
} from './partnership-derived'
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
  PartnershipPaymentCycle,
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
  partnershipPaymentCycles: Array<PartnershipPaymentCycle>
  moveDeal: (dealId: string, stage: DealStage) => void
  /** Pass null to clear the override and fall back to the deterministic default color. */
  updateDealColor: (dealId: string, color: string | null) => void
  /** Quick inline edit for the card-level notes preview — updates the general BrandDeal.notes field, distinct from contentRequirements.notes. */
  updateDealNotes: (dealId: string, notes: string) => void
  assignIdeaDate: (ideaId: string, date: string) => void
  /** Clears scheduledDate and reverts status back to 'idea' if it hadn't progressed past 'scheduled'. */
  unassignIdeaDate: (ideaId: string) => void
  /** Pass null to clear the override and fall back to the deterministic default color. */
  updateIdeaColor: (ideaId: string, color: string | null) => void
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
  /** Pass null to clear the override and fall back to the deterministic default color. */
  updatePartnershipColor: (partnershipId: string, color: string | null) => void
  deletePartnership: (partnershipId: string) => Promise<void>
  logPartnershipDeliverable: (partnershipId: string) => void
  /** Removes the most recently logged deliverable for this partnership, if any — for correcting mis-clicks. */
  undoLastPartnershipDeliverable: (partnershipId: string) => void
  /** Generates/updates the current retainer cycle to match the partnership's live terms, or no-ops if paused/not-retainer/not-started. Called reactively (e.g. on mount, or whenever terms change) so the UI always has an up-to-date cycle to display and confirm. */
  ensurePartnershipCycle: (partnershipId: string) => Promise<PartnershipPaymentCycle | undefined>
  /**
   * Confirms the *current* retainer cycle as paid: creates its ledger entry and locks the
   * cycle row permanently (later edits to the partnership's terms can never change a
   * confirmed cycle). Generates the current cycle first if it doesn't exist yet. No-op for
   * non-retainer or paused partnerships.
   */
  markPartnershipCyclePaid: (partnershipId: string) => void
  /** Reverts the current cycle's confirmation (deletes its ledger entry, sets it back to unconfirmed) — for correcting mis-clicks, not for un-confirming old history. */
  undoLastPartnershipPayment: (partnershipId: string) => void
  /** Confirms a specific cycle by id as paid — works on any cycle, including backfilled historical ones (see the Payment History list). */
  confirmPartnershipCycle: (cycleId: string) => Promise<void>
  /** Reverts a specific cycle's confirmation by id — the general counterpart to undoLastPartnershipPayment's "current cycle only" shortcut. */
  unconfirmPartnershipCycle: (cycleId: string) => void
  /** Fills in any missing past cycles between the partnership's start date and now, for a partnership added to the app well after it actually started. Never touches an existing (confirmed or unconfirmed) cycle. */
  backfillPastPartnershipCycles: (partnershipId: string) => Promise<void>
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
  const [partnershipPaymentCycles, setPartnershipPaymentCycles] = useState<Array<PartnershipPaymentCycle>>([])

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
      setPartnershipPaymentCycles([])
      return
    }

    const supabase = getSupabaseBrowserClient()
    let cancelled = false

    async function loadInitial() {
      const [
        brandsRes,
        dealsRes,
        ideasRes,
        ledgerRes,
        partnershipsRes,
        partnershipDeliverablesRes,
        partnershipPaymentCyclesRes,
      ] = await Promise.all([
        supabase.from('brands').select('*').order('created_at', { ascending: false }),
        supabase.from('deals').select('*').order('created_at', { ascending: false }),
        supabase.from('ideas').select('*').order('created_at', { ascending: false }),
        supabase.from('ledger').select('*').order('date', { ascending: false }),
        supabase.from('partnerships').select('*').order('created_at', { ascending: false }),
        supabase.from('partnership_deliverables').select('*').order('completed_at', { ascending: false }),
        supabase.from('partnership_payment_cycles').select('*').order('period_start', { ascending: false }),
      ])
      if (cancelled) return
      setBrands((brandsRes.data ?? []).map(brandFromRow))
      setDeals((dealsRes.data ?? []).map(dealFromRow))
      setIdeas((ideasRes.data ?? []).map(ideaFromRow))
      setLedger((ledgerRes.data ?? []).map(ledgerFromRow))
      setPartnerships((partnershipsRes.data ?? []).map(partnershipFromRow))
      setPartnershipDeliverables((partnershipDeliverablesRes.data ?? []).map(partnershipDeliverableFromRow))
      setPartnershipPaymentCycles((partnershipPaymentCyclesRes.data ?? []).map(partnershipPaymentCycleFromRow))
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
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'partnership_payment_cycles', filter: `user_id=eq.${userId}` },
        (payload) =>
          setPartnershipPaymentCycles((prev) => applyChange(prev, payload, partnershipPaymentCycleFromRow)),
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
      // Computed from `ideas` up front, not inside the setIdeas updater below: that updater
      // runs whenever React processes the queued update, which is after this function has
      // already returned — reading it back out here would always see the pre-call `undefined`.
      const currentStatus = ideas.find((idea) => idea.id === ideaId)?.status
      const nextStatus = currentStatus === 'idea' ? 'scheduled' : currentStatus
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? { ...idea, scheduledDate: date, status: nextStatus ?? idea.status } : idea)),
      )
      if (!userId) return
      getSupabaseBrowserClient()
        .from('ideas')
        .update({ scheduled_date: date, status: nextStatus })
        .eq('id', ideaId)
        .then(({ error }) => {
          if (error) console.error('Failed to save idea schedule date:', error)
        })
    },
    [userId, ideas],
  )

  const addIdea = useCallback(
    (idea: Pick<IdeaPost, 'title'> & Partial<IdeaPost>) => {
      // Generated client-side (rather than a placeholder string swapped for the
      // real id once the insert resolves) so the id is stable and correct from the
      // very first render — dragging the idea onto the calendar right after
      // creating it (before the insert round-trip finishes) still targets a row
      // that genuinely exists, instead of racing an update against a since-replaced
      // temp id and silently updating nothing.
      const newIdea: IdeaPost = {
        id: crypto.randomUUID(),
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
          id: newIdea.id,
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
        .then(() => {})
    },
    [userId],
  )

  const unassignIdeaDate = useCallback(
    (ideaId: string) => {
      // See assignIdeaDate above for why this is computed up front rather than inside the
      // setIdeas updater.
      const currentStatus = ideas.find((idea) => idea.id === ideaId)?.status
      const nextStatus = currentStatus === 'scheduled' ? 'idea' : currentStatus
      setIdeas((prev) =>
        prev.map((idea) => (idea.id === ideaId ? { ...idea, scheduledDate: null, status: nextStatus ?? idea.status } : idea)),
      )
      if (!userId) return
      getSupabaseBrowserClient()
        .from('ideas')
        .update({ scheduled_date: null, status: nextStatus })
        .eq('id', ideaId)
        .then(({ error }) => {
          if (error) console.error('Failed to unschedule idea:', error)
        })
    },
    [userId, ideas],
  )

  const updateIdeaColor = useCallback(
    (ideaId: string, color: string | null) => {
      setIdeas((prev) => prev.map((idea) => (idea.id === ideaId ? { ...idea, color: color ?? undefined } : idea)))
      if (!userId) return
      getSupabaseBrowserClient().from('ideas').update({ color }).eq('id', ideaId).then(() => {})
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
        await syncDealLedgerEntry(existingDealId, brandId, trimmedName, dealPayload)
        return existingDealId
      }

      const { data, error } = await supabase.from('deals').insert(dealPayload).select('*').single()
      if (error || !data) throw new Error(error?.message ?? 'Failed to create deal')
      const created = dealFromRow(data)
      setDeals((prev) => [created, ...prev])
      await syncDealLedgerEntry(created.id, brandId, trimmedName, dealPayload)
      return created.id
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- syncDealLedgerEntry is defined
    // below but shares saveDeal's userId/ledger deps, so it's always fresh when this is.
    [userId, brands, deals, ledger],
  )

  /**
   * Keeps a deal's ledger revenue entry in sync with its paid/amount/date fields — created
   * once the deal is marked paid in full, updated in place on later edits (rather than
   * inserting a duplicate), and removed if "paid in full" is unmarked again. Deleting the
   * deal itself is handled separately: the DB's `on delete set null` keeps this entry as a
   * historical record rather than cascading the delete.
   */
  const syncDealLedgerEntry = useCallback(
    async (
      dealId: string,
      brandId: string,
      brandName: string,
      dealPayload: { paid: boolean; paid_date: string | null; compensation_amount: number; compensation_currency: string },
    ) => {
      if (!userId) return
      const supabase = getSupabaseBrowserClient()
      const existingEntry = ledger.find((e) => e.dealId === dealId && e.type === 'income')

      if (dealPayload.paid && dealPayload.paid_date) {
        const ledgerPayload = {
          user_id: userId,
          type: 'income' as const,
          amount: dealPayload.compensation_amount,
          currency: dealPayload.compensation_currency,
          date: dealPayload.paid_date,
          description: `${brandName} — brand deal payment`,
          deal_id: dealId,
          brand_id: brandId,
        }
        if (existingEntry) {
          const { data, error } = await supabase
            .from('ledger')
            .update(ledgerPayload)
            .eq('id', existingEntry.id)
            .select('*')
            .single()
          if (!error && data) {
            const updatedEntry = ledgerFromRow(data)
            setLedger((prev) => prev.map((e) => (e.id === existingEntry.id ? updatedEntry : e)))
          }
        } else {
          const { data, error } = await supabase.from('ledger').insert(ledgerPayload).select('*').single()
          if (!error && data) setLedger((prev) => [ledgerFromRow(data), ...prev])
        }
      } else if (existingEntry) {
        // "Paid in full" was unmarked (likely a correction) — the entry no longer reflects
        // confirmed revenue, so remove it rather than leave a stale claim in the ledger.
        await supabase.from('ledger').delete().eq('id', existingEntry.id)
        setLedger((prev) => prev.filter((e) => e.id !== existingEntry.id))
      }
    },
    [userId, ledger],
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

  const updatePartnershipColor = useCallback(
    (partnershipId: string, color: string | null) => {
      setPartnerships((prev) => prev.map((p) => (p.id === partnershipId ? { ...p, color: color ?? undefined } : p)))
      if (!userId) return
      getSupabaseBrowserClient().from('partnerships').update({ color }).eq('id', partnershipId).then(() => {})
    },
    [userId],
  )

  const deletePartnership = useCallback(
    async (partnershipId: string) => {
      setPartnerships((prev) => prev.filter((p) => p.id !== partnershipId))
      setPartnershipDeliverables((prev) => prev.filter((d) => d.partnershipId !== partnershipId))
      setPartnershipPaymentCycles((prev) => prev.filter((c) => c.partnershipId !== partnershipId))
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

  /**
   * Ensures a persisted cycle exists for the partnership's *current* retainer period,
   * regenerating it in place if the terms changed since it was last generated — but never
   * touching a cycle that's already confirmed (that's the whole point: confirmed cycles are
   * locked history). Returns undefined for non-retainer or currently-paused partnerships, or
   * one that hasn't started yet.
   *
   * Cadence changes mid-cycle: the new "current window" (computed from the *current*
   * cadence) won't match the old cycle's stored period, so it falls through to the "no
   * cycle for this window yet" branch below. Any unconfirmed cycle whose old period still
   * spans `now` is superseded at that point and removed, then a fresh cycle is inserted for
   * the new cadence's window — a confirmed cycle is never a match here (deleting is
   * restricted to unconfirmed), so it's left untouched regardless of what the cadence
   * becomes afterward.
   */
  const ensurePartnershipCycle = useCallback(
    async (partnershipId: string): Promise<PartnershipPaymentCycle | undefined> => {
      if (!userId) return undefined
      const partnership = partnerships.find((p) => p.id === partnershipId)
      if (!partnership || partnership.paymentType !== 'retainer' || !partnership.retainerAmount) return undefined
      const now = new Date()
      if (isPartnershipPausedOn(partnership, now)) return undefined
      const window = computeCurrentRetainerCycleWindow(partnership, now)
      if (!window) return undefined

      const supabase = getSupabaseBrowserClient()
      const cyclesForPartnership = partnershipPaymentCycles.filter((c) => c.partnershipId === partnershipId)
      const matching = cyclesForPartnership.find((c) => cycleMatchesWindow(c, window))

      if (matching) {
        if (matching.status === 'confirmed') return matching
        if (matching.expectedAmount === partnership.retainerAmount && matching.currency === partnership.currency) {
          return matching
        }
        const { data, error } = await supabase
          .from('partnership_payment_cycles')
          .update({ expected_amount: partnership.retainerAmount, currency: partnership.currency })
          .eq('id', matching.id)
          .select('*')
          .single()
        if (error || !data) return matching
        const updated = partnershipPaymentCycleFromRow(data)
        setPartnershipPaymentCycles((prev) => prev.map((c) => (c.id === matching.id ? updated : c)))
        return updated
      }

      const staleOverlapping = cyclesForPartnership.find(
        (c) => c.status === 'unconfirmed' && now >= new Date(c.periodStart) && now < new Date(c.periodEnd),
      )
      if (staleOverlapping) {
        await supabase.from('partnership_payment_cycles').delete().eq('id', staleOverlapping.id)
        setPartnershipPaymentCycles((prev) => prev.filter((c) => c.id !== staleOverlapping.id))
      }

      const { data, error } = await supabase
        .from('partnership_payment_cycles')
        .insert({
          user_id: userId,
          partnership_id: partnershipId,
          period_start: window.start.toISOString(),
          period_end: window.end.toISOString(),
          expected_amount: partnership.retainerAmount,
          currency: partnership.currency,
        })
        .select('*')
        .single()
      if (error || !data) return undefined
      const created = partnershipPaymentCycleFromRow(data)
      setPartnershipPaymentCycles((prev) => [created, ...prev])
      return created
    },
    [userId, partnerships, partnershipPaymentCycles],
  )

  /**
   * Confirms a specific cycle (by id) as paid — creates its ledger entry (the only thing
   * that makes retainer revenue count toward totals) and locks the row. Works on any cycle,
   * not just the current one — including backfilled historical cycles.
   */
  const confirmPartnershipCycle = useCallback(
    async (cycleId: string) => {
      if (!userId) return
      const cycle = partnershipPaymentCycles.find((c) => c.id === cycleId)
      if (!cycle || cycle.status === 'confirmed') return
      const partnership = partnerships.find((p) => p.id === cycle.partnershipId)
      if (!partnership) return
      const brand = brandById(partnership.brandId)
      const date = new Date().toISOString()
      const supabase = getSupabaseBrowserClient()

      const { data: ledgerData, error: ledgerError } = await supabase
        .from('ledger')
        .insert({
          user_id: userId,
          type: 'income',
          amount: cycle.expectedAmount,
          currency: cycle.currency,
          date,
          description: `${brand?.name ?? 'Unknown brand'} — retainer payment`,
          partnership_id: partnership.id,
          brand_id: partnership.brandId,
        })
        .select('*')
        .single()
      if (ledgerError || !ledgerData) return
      const ledgerEntry = ledgerFromRow(ledgerData)
      setLedger((prev) => [ledgerEntry, ...prev])

      const { data: cycleData, error: cycleError } = await supabase
        .from('partnership_payment_cycles')
        .update({ status: 'confirmed', confirmed_at: date, ledger_entry_id: ledgerEntry.id })
        .eq('id', cycle.id)
        .select('*')
        .single()
      if (cycleError || !cycleData) return
      const confirmed = partnershipPaymentCycleFromRow(cycleData)
      setPartnershipPaymentCycles((prev) => prev.map((c) => (c.id === cycle.id ? confirmed : c)))
    },
    [userId, partnerships, partnershipPaymentCycles, brandById],
  )

  /** Reverts a specific cycle's confirmation (by id) — deletes its ledger entry and sets it back to unconfirmed — for correcting a mis-click, on any cycle. */
  const unconfirmPartnershipCycle = useCallback(
    (cycleId: string) => {
      const cycle = partnershipPaymentCycles.find((c) => c.id === cycleId)
      if (!cycle || cycle.status !== 'confirmed') return

      setPartnershipPaymentCycles((prev) =>
        prev.map((c) =>
          c.id === cycle.id ? { ...c, status: 'unconfirmed', confirmedAt: undefined, ledgerEntryId: undefined } : c,
        ),
      )
      if (cycle.ledgerEntryId) setLedger((prev) => prev.filter((e) => e.id !== cycle.ledgerEntryId))

      if (!userId) return
      const supabase = getSupabaseBrowserClient()
      supabase
        .from('partnership_payment_cycles')
        .update({ status: 'unconfirmed', confirmed_at: null, ledger_entry_id: null })
        .eq('id', cycle.id)
        .then(() => {})
      if (cycle.ledgerEntryId) {
        supabase.from('ledger').delete().eq('id', cycle.ledgerEntryId).then(() => {})
      }
    },
    [partnershipPaymentCycles, userId],
  )

  /** Confirms the *current* retainer cycle — generates it first if it doesn't exist yet, so this works even on the very first click. */
  const markPartnershipCyclePaid = useCallback(
    async (partnershipId: string) => {
      const cycle = await ensurePartnershipCycle(partnershipId)
      if (!cycle) return
      await confirmPartnershipCycle(cycle.id)
    },
    [ensurePartnershipCycle, confirmPartnershipCycle],
  )

  /** Reverts the *current* cycle's confirmation — for correcting a mis-click on today's cycle specifically. To undo an older confirmed cycle, use unconfirmPartnershipCycle directly (see the Payment History list). */
  const undoLastPartnershipPayment = useCallback(
    (partnershipId: string) => {
      const partnership = partnerships.find((p) => p.id === partnershipId)
      if (!partnership) return
      const window = computeCurrentRetainerCycleWindow(partnership, new Date())
      if (!window) return
      const cycle = partnershipPaymentCycles.find(
        (c) => c.partnershipId === partnershipId && c.status === 'confirmed' && cycleMatchesWindow(c, window),
      )
      if (!cycle) return
      unconfirmPartnershipCycle(cycle.id)
    },
    [partnerships, partnershipPaymentCycles, unconfirmPartnershipCycle],
  )

  /**
   * Fills in any missing *past* cycles between the partnership's startDate and now — for a
   * partnership entered into the app well after it actually started, so there's something to
   * confirm/mark paid for the months already elapsed. Never touches an existing row (confirmed
   * or not), only inserts cycles for windows that don't have one yet, and skips any window
   * that was paused at its start. Deliberately separate from ensurePartnershipCycle: that one
   * also has to handle "the current window's terms just changed" — backfilled past windows
   * are already-elapsed history, not something still being edited.
   */
  const backfillPastPartnershipCycles = useCallback(
    async (partnershipId: string) => {
      if (!userId) return
      const partnership = partnerships.find((p) => p.id === partnershipId)
      if (!partnership || partnership.paymentType !== 'retainer' || !partnership.retainerAmount) return
      const now = new Date()
      const allWindows = computeAllRetainerCycleWindows(partnership, now)
      if (allWindows.length <= 1) return
      const pastWindows = allWindows.slice(0, -1)

      const existing = partnershipPaymentCycles.filter((c) => c.partnershipId === partnershipId)
      const missing = pastWindows.filter(
        (w) => !existing.some((c) => cycleMatchesWindow(c, w)) && !isPartnershipPausedOn(partnership, w.start),
      )
      if (missing.length === 0) return

      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase
        .from('partnership_payment_cycles')
        .insert(
          missing.map((w) => ({
            user_id: userId,
            partnership_id: partnershipId,
            period_start: w.start.toISOString(),
            period_end: w.end.toISOString(),
            expected_amount: partnership.retainerAmount as number,
            currency: partnership.currency,
          })),
        )
        .select('*')
      if (error || !data) return
      const created = data.map(partnershipPaymentCycleFromRow)
      setPartnershipPaymentCycles((prev) => [...created, ...prev])
    },
    [userId, partnerships, partnershipPaymentCycles],
  )

  const value = useMemo(
    () => ({
      brands,
      deals,
      ideas,
      ledger,
      partnerships,
      partnershipDeliverables,
      partnershipPaymentCycles,
      moveDeal,
      updateDealColor,
      updateDealNotes,
      assignIdeaDate,
      unassignIdeaDate,
      updateIdeaColor,
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
      updatePartnershipColor,
      deletePartnership,
      logPartnershipDeliverable,
      undoLastPartnershipDeliverable,
      ensurePartnershipCycle,
      markPartnershipCyclePaid,
      undoLastPartnershipPayment,
      confirmPartnershipCycle,
      unconfirmPartnershipCycle,
      backfillPastPartnershipCycles,
    }),
    [
      brands,
      deals,
      ideas,
      ledger,
      partnerships,
      partnershipDeliverables,
      partnershipPaymentCycles,
      moveDeal,
      updateDealColor,
      updateDealNotes,
      assignIdeaDate,
      unassignIdeaDate,
      updateIdeaColor,
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
      updatePartnershipColor,
      deletePartnership,
      logPartnershipDeliverable,
      undoLastPartnershipDeliverable,
      ensurePartnershipCycle,
      markPartnershipCyclePaid,
      undoLastPartnershipPayment,
      confirmPartnershipCycle,
      unconfirmPartnershipCycle,
      backfillPastPartnershipCycles,
    ],
  )

  return <CharmStoreContext.Provider value={value}>{children}</CharmStoreContext.Provider>
}

export function useCharmStore() {
  const ctx = useContext(CharmStoreContext)
  if (!ctx) throw new Error('useCharmStore must be used within CharmStoreProvider')
  return ctx
}
