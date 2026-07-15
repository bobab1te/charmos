import type { Database } from './database.types'
import type {
  Brand,
  BrandDeal,
  CompensationType,
  ContentRequirements,
  DealStage,
  Deliverable,
  IdeaPost,
  LedgerEntry,
  Partnership,
  PartnershipDeliverableLog,
  PaymentType,
  Platform,
  PostStatus,
  ShipmentInfo,
} from '../types'

type BrandRow = Database['public']['Tables']['brands']['Row']
type DealRow = Database['public']['Tables']['deals']['Row']
type IdeaRow = Database['public']['Tables']['ideas']['Row']
type LedgerRow = Database['public']['Tables']['ledger']['Row']
type PartnershipRow = Database['public']['Tables']['partnerships']['Row']
type PartnershipDeliverableRow = Database['public']['Tables']['partnership_deliverables']['Row']

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
    archived: row.archived,
    notes: row.notes ?? undefined,
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
    series: row.series ?? undefined,
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
    partnershipId: row.partnership_id ?? undefined,
  }
}

export function partnershipFromRow(row: PartnershipRow): Partnership {
  return {
    id: row.id,
    brandId: row.brand_id,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    paymentType: row.payment_type as PaymentType,
    retainerAmount: row.retainer_amount ?? undefined,
    retainerCadence: row.retainer_cadence ?? undefined,
    perDeliverableRate: row.per_deliverable_rate ?? undefined,
    currency: row.currency,
    deliverableCount: row.deliverable_count,
    deliverableUnit: row.deliverable_unit,
    deliverableCadence: row.deliverable_cadence,
    contentFormats: row.content_formats,
    notes: row.notes ?? undefined,
    status: row.status,
    pausedAt: row.paused_at ?? undefined,
    unpausedAt: row.unpaused_at ?? undefined,
    createdAt: row.created_at,
  }
}

export function partnershipDeliverableFromRow(row: PartnershipDeliverableRow): PartnershipDeliverableLog {
  return {
    id: row.id,
    partnershipId: row.partnership_id,
    completedAt: row.completed_at,
  }
}
