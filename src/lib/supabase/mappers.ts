import type { Database } from './database.types'
import type { Brand, BrandDeal, CompensationType, ContentRequirements, DealStage, Deliverable, IdeaPost, LedgerEntry, Platform, PostStatus, ShipmentInfo } from '../types'

type BrandRow = Database['public']['Tables']['brands']['Row']
type DealRow = Database['public']['Tables']['deals']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LedgerRow = Database['public']['Tables']['ledger']['Row']

export function brandFromRow(row: BrandRow): Brand {
  return {
    id: row.id,
    name: row.name,
    contactName: row.contact_name ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    createdAt: row.created_at,
  }
}

export function dealFromRow(row: DealRow): BrandDeal {
  return {
    id: row.id,
    brandId: row.brand_id,
    stage: row.stage as DealStage,
    deliverables: ((row.deliverables as unknown as Array<Deliverable>) ?? []),
    compensationAmount: row.compensation_amount,
    compensationCurrency: row.compensation_currency,
    usageRights: row.usage_rights ?? undefined,
    shipment: (row.shipment as unknown as ShipmentInfo | null) ?? undefined,
    contentRequirements: (row.content_requirements as unknown as ContentRequirements | null) ?? undefined,
    paid: row.paid,
    paidDate: row.paid_date ?? undefined,
    createdAt: row.created_at,
    stageUpdatedAt: row.stage_updated_at,
    color: row.color ?? undefined,
    compensationType: row.compensation_type as CompensationType,
    expectedPayoutDate: row.expected_payout_date ?? undefined,
  }
}

export function ideaFromRow(row: IdeaRow): IdeaPost {
  return {
    id: row.id,
    title: row.title,
    hook: row.hook ?? undefined,
    description: row.description ?? undefined,
    platforms: row.platforms as Array<Platform>,
    status: row.status as PostStatus,
    scheduledDate: row.scheduled_date,
    referenceLinks: row.reference_links,
    createdAt: row.created_at,
  }
}

export function ledgerFromRow(row: LedgerRow): LedgerEntry {
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    date: row.date,
    description: row.description,
    dealId: row.deal_id ?? undefined,
    brandId: row.brand_id ?? undefined,
  }
}
