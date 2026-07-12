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
  /** Free-text, user-typed estimate (e.g. "N/A", "net 30", or an actual date) — not parsed as a real date. */
  expectedPayoutDate?: string
  /** Archived deals are hidden from the kanban board and excluded from dashboard metrics, but remain viewable in the Archived tab. */
  archived: boolean
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
