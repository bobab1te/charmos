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
}

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
}

export interface IdeaPost {
  id: string
  title: string
  hook?: string
  description?: string
  platforms: Array<Platform>
  status: PostStatus
  scheduledDate: string | null
  referenceLinks: Array<string>
  createdAt: string
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
