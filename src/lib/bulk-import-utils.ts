import type { ParsedBulkDeal } from '#/server/parse-deals-bulk'
import type { CompensationType, DealStage } from './types'

/** One row in the bulk-import review table — a trimmed-down, client-only draft of a deal, not yet saved. */
export interface BulkImportRow {
  id: string
  included: boolean
  brandName: string
  compensationAmount: string
  compensationCurrency: string
  compensationType: CompensationType
  stage: DealStage
  dueDate: string
  deliverableType: string
}

export function bulkRowFromParsed(parsed: ParsedBulkDeal, index: number): BulkImportRow {
  return {
    id: `bulk-${index}-${Math.random().toString(36).slice(2)}`,
    included: true,
    brandName: parsed.brandName ?? '',
    compensationAmount: parsed.compensationAmount != null ? String(parsed.compensationAmount) : '',
    compensationCurrency: parsed.compensationCurrency ?? 'USD',
    compensationType: parsed.compensationType ?? 'paid',
    stage: parsed.stage ?? 'negotiating',
    dueDate: parsed.dueDate ?? '',
    deliverableType: parsed.deliverableType ?? '',
  }
}

/** Same bar as the single-deal form (formValuesMissingFields): needs a brand name and an amount to be saveable. */
export function bulkRowNeedsReview(row: BulkImportRow): boolean {
  return !row.brandName.trim() || !row.compensationAmount.trim()
}
