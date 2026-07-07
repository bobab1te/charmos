import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { mockBrands, mockDeals, mockIdeas, mockLedger } from './mock-data'
import type { Brand, BrandDeal, DealStage, IdeaPost, LedgerEntry } from './types'

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
}

const CharmStoreContext = createContext<CharmStoreValue | null>(null)

export function CharmStoreProvider({ children }: { children: ReactNode }) {
  const [brands] = useState<Array<Brand>>(mockBrands)
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

  const value = useMemo(
    () => ({ brands, deals, ideas, ledger, moveDeal, assignIdeaDate, addIdea, addLedgerEntry, brandById }),
    [brands, deals, ideas, ledger, moveDeal, assignIdeaDate, addIdea, addLedgerEntry, brandById],
  )

  return <CharmStoreContext.Provider value={value}>{children}</CharmStoreContext.Provider>
}

export function useCharmStore() {
  const ctx = useContext(CharmStoreContext)
  if (!ctx) throw new Error('useCharmStore must be used within CharmStoreProvider')
  return ctx
}
