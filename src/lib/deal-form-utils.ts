import type { Brand, BrandDeal, DealFormValues } from './types'
import type { ParsedDeal } from '#/server/parse-deal'

export function emptyDealForm(): DealFormValues {
  return {
    brandName: '',
    brandContactName: '',
    brandContactEmail: '',
    stage: 'negotiating',
    deliverables: [{ type: '', description: '', dueDate: '' }],
    compensationAmount: '',
    compensationCurrency: 'USD',
    compensationType: 'paid',
    expectedPayoutDate: '',
    paidInFull: false,
    usageRights: '',
    shipmentCarrier: '',
    shipmentTrackingNumber: '',
    shipmentShippedDate: '',
    shipmentEstimatedDelivery: '',
    hashtags: '',
    accountsToTag: '',
    clipsToUse: '',
    contentNotes: '',
  }
}

export function dealToFormValues(deal: BrandDeal, brand: Brand): DealFormValues {
  return {
    brandName: brand.name,
    brandContactName: brand.contactName ?? '',
    brandContactEmail: brand.contactEmail ?? '',
    stage: deal.stage,
    deliverables:
      deal.deliverables.length > 0
        ? deal.deliverables.map((d) => ({
            type: d.type,
            description: d.description ?? '',
            dueDate: d.dueDate.slice(0, 10),
          }))
        : [{ type: '', description: '', dueDate: '' }],
    compensationAmount: String(deal.compensationAmount),
    compensationCurrency: deal.compensationCurrency,
    compensationType: deal.compensationType,
    expectedPayoutDate: deal.expectedPayoutDate?.slice(0, 10) ?? '',
    paidInFull: deal.paid,
    usageRights: deal.usageRights ?? '',
    shipmentCarrier: deal.shipment?.carrier ?? '',
    shipmentTrackingNumber: deal.shipment?.trackingNumber ?? '',
    shipmentShippedDate: deal.shipment?.shippedDate?.slice(0, 10) ?? '',
    shipmentEstimatedDelivery: deal.shipment?.estimatedDelivery?.slice(0, 10) ?? '',
    hashtags: (deal.contentRequirements?.hashtags ?? []).join(', '),
    accountsToTag: (deal.contentRequirements?.accountsToTag ?? []).join(', '),
    clipsToUse: (deal.contentRequirements?.clipsToUse ?? []).join(', '),
    contentNotes: deal.contentRequirements?.notes ?? '',
  }
}

export function parsedDealToFormValues(parsed: ParsedDeal): DealFormValues {
  const base = emptyDealForm()
  return {
    ...base,
    brandName: parsed.brandName ?? '',
    brandContactName: parsed.brandContactName ?? '',
    brandContactEmail: parsed.brandContactEmail ?? '',
    deliverables:
      parsed.deliverables.length > 0
        ? parsed.deliverables.map((d) => ({
            type: d.type,
            description: d.description ?? '',
            dueDate: d.dueDate ?? '',
          }))
        : base.deliverables,
    compensationAmount: parsed.compensationAmount != null ? String(parsed.compensationAmount) : '',
    compensationCurrency: parsed.compensationCurrency ?? 'USD',
    usageRights: parsed.usageRights ?? '',
    shipmentCarrier: parsed.shipment.carrier ?? '',
    shipmentTrackingNumber: parsed.shipment.trackingNumber ?? '',
    shipmentShippedDate: parsed.shipment.shippedDate ?? '',
    shipmentEstimatedDelivery: parsed.shipment.estimatedDelivery ?? '',
    hashtags: parsed.contentRequirements.hashtags.join(', '),
    accountsToTag: parsed.contentRequirements.accountsToTag.join(', '),
    clipsToUse: parsed.contentRequirements.clipsToUse.join(', '),
    contentNotes: parsed.contentRequirements.notes ?? '',
  }
}

function splitList(value: string): Array<string> {
  return value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

export function formValuesMissingFields(form: DealFormValues): Array<string> {
  const missing: Array<string> = []
  if (!form.brandName.trim()) missing.push('Brand name')
  if (!form.compensationAmount.trim()) missing.push('Compensation amount')
  if (form.deliverables.every((d) => !d.type.trim())) missing.push('Deliverables')
  return missing
}

export { splitList }
