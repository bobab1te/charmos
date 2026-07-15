export type DealStage = 'negotiating' | 'confirmed' | 'live' | 'completed'

export type Platform = 'tiktok' | 'instagram' | 'youtube'

export type PostStatus = 'idea' | 'scheduled' | 'filming' | 'editing' | 'posted'

export interface Brand {
  id: string
  name: string
  contactName?: string
  contactEmail?: string
  createdAt: string
}

export interface Deliverable {
  id: string
  type: string
  description?: string
  dueDate: string
  done: boolean
}

export interface ShipmentInfo {
  carrier?: string
  trackingNumber?: string
  shippedDate?: string
  estimatedDelivery?: string
  status?: 'pending' | 'shipped' | 'delivered'
}

export interface ContentRequirements {
  hashtags: Array<string>
  accountsToTag: Array<string>
  clipsToUse: Array<string>
  notes?: string
  /** Links to reference videos (e.g. past brand content, style examples) the brand shared. */
  referenceLinks?: Array<string>
}

export type CompensationType = 'paid' | 'gifted' | 'commission'

export interface BrandDeal {
  id: string
  brandId: string
  stage: DealStage
  deliverables: Array<Deliverable>
  compensationAmount: number
  compensationCurrency: string
  usageRights?: string
  shipment?: ShipmentInfo
  contentRequirements?: ContentRequirements
  paid: boolean
  paidDate?: string
  createdAt: string
  /** last time the deal's stage/state changed — drives the ghosted detector */
  stageUpdatedAt: string
  /** User-chosen kanban card color override; undefined means "use the deterministic default". */
  color?: string
  compensationType: CompensationType
  /** ISO timestamp at local midnight of the chosen date — see date-only.ts. Undefined if no payout date was set. */
  expectedPayoutDate?: string
  /** Archived deals are hidden from the kanban board and excluded from dashboard metrics, but remain viewable in the Archived tab. */
  archived: boolean
  /** General freeform notes about the deal (e.g. "brand is slow to respond") — shown as a quick preview on the kanban card. Distinct from contentRequirements.notes, which is the brand's creative-brief notes for the content itself. */
  notes?: string
}

export interface IdeaPost {
  id: string
  title: string
  hook?: string
  /** Freeform notes for the idea, shown as "Notes" in the detail view. */
  description?: string
  platforms: Array<Platform>
  status: PostStatus
  scheduledDate: string | null
  referenceLinks: Array<string>
  createdAt: string
  /** Shared tag grouping this idea with others in the same content series; undefined means "not part of a series". */
  series?: string
}

export type LedgerEntryType = 'income' | 'expense'

export interface LedgerEntry {
  id: string
  type: LedgerEntryType
  amount: number
  currency: string
  date: string
  description: string
  dealId?: string
  brandId?: string
}

export interface DealFormDeliverable {
  type: string
  description: string
  dueDate: string
}

export interface DealFormValues {
  brandName: string
  brandContactName: string
  brandContactEmail: string
  stage: DealStage
  deliverables: Array<DealFormDeliverable>
  /** General freeform notes about the deal — see BrandDeal.notes. */
  dealNotes: string
  compensationAmount: string
  compensationCurrency: string
  compensationType: CompensationType
  expectedPayoutDate: string
  paidInFull: boolean
  usageRights: string
  shipmentCarrier: string
  shipmentTrackingNumber: string
  shipmentShippedDate: string
  shipmentEstimatedDelivery: string
  hashtags: string
  accountsToTag: string
  clipsToUse: string
  contentNotes: string
  referenceLinks: Array<string>
}

// ---------------------------------------------------------------------------
// Long-term partnerships (retainers, e.g. Canvas UGC) — a distinct concept
// from one-off BrandDeal: recurring payment schedule, a deliverable quota
// per period, and renewal tracking. Deliberately not merged into BrandDeal.
// ---------------------------------------------------------------------------

export type PaymentType = 'retainer' | 'per_deliverable'
export type RetainerCadence = 'weekly' | 'monthly'
export type DeliverableCadence = 'day' | 'week' | 'month'
export type PartnershipStatus = 'active' | 'paused' | 'ended'

export interface Partnership {
  id: string
  brandId: string
  startDate: string
  /** Contract end / renewal date. */
  endDate?: string
  paymentType: PaymentType
  retainerAmount?: number
  retainerCadence?: RetainerCadence
  perDeliverableRate?: number
  currency: string
  /** Required deliverables per `deliverableCadence` period, e.g. 4 "UGC videos" per month. */
  deliverableCount: number
  deliverableUnit: string
  deliverableCadence: DeliverableCadence
  /** e.g. "Canvas UGC" — freeform so this scales to future content formats. */
  contentFormats: Array<string>
  notes?: string
  status: PartnershipStatus
  /** When the partnership most recently entered "paused" — recurring revenue is excluded from this date until unpausedAt (or indefinitely if still paused). */
  pausedAt?: string
  /** When the partnership resumed after its most recent pause — undefined while still paused. */
  unpausedAt?: string
  createdAt: string
}

/** One row per completed deliverable — a log rather than a mutable counter, so period progress and per-deliverable earnings can both be derived by date-filtering regardless of cadence. */
export interface PartnershipDeliverableLog {
  id: string
  partnershipId: string
  completedAt: string
}

export interface PartnershipFormValues {
  brandName: string
  startDate: string
  endDate: string
  paymentType: PaymentType
  retainerAmount: string
  retainerCadence: RetainerCadence
  perDeliverableRate: string
  currency: string
  deliverableCount: string
  deliverableUnit: string
  deliverableCadence: DeliverableCadence
  contentFormats: string
  notes: string
  status: PartnershipStatus
  pausedDate: string
  unpausedDate: string
}
