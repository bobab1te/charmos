import type { Brand, Partnership, PartnershipFormValues } from './types'
import { isoStringToDateOnly, todayDateOnly } from './date-only'

export function emptyPartnershipForm(): PartnershipFormValues {
  return {
    brandName: '',
    startDate: todayDateOnly(),
    endDate: '',
    paymentType: 'retainer',
    retainerAmount: '',
    retainerCadence: 'monthly',
    perDeliverableRate: '',
    currency: 'USD',
    deliverableCount: '4',
    deliverableUnit: 'UGC videos',
    deliverableCadence: 'month',
    contentFormats: '',
    notes: '',
    status: 'active',
    pausedDate: '',
    unpausedDate: '',
  }
}

export function partnershipToFormValues(partnership: Partnership, brand: Brand): PartnershipFormValues {
  return {
    brandName: brand.name,
    startDate: isoStringToDateOnly(partnership.startDate),
    endDate: partnership.endDate ? isoStringToDateOnly(partnership.endDate) : '',
    paymentType: partnership.paymentType,
    retainerAmount: partnership.retainerAmount != null ? String(partnership.retainerAmount) : '',
    retainerCadence: partnership.retainerCadence ?? 'monthly',
    perDeliverableRate: partnership.perDeliverableRate != null ? String(partnership.perDeliverableRate) : '',
    currency: partnership.currency,
    deliverableCount: String(partnership.deliverableCount),
    deliverableUnit: partnership.deliverableUnit,
    deliverableCadence: partnership.deliverableCadence,
    contentFormats: partnership.contentFormats.join(', '),
    notes: partnership.notes ?? '',
    status: partnership.status,
    pausedDate: partnership.pausedAt ? isoStringToDateOnly(partnership.pausedAt) : '',
    unpausedDate: partnership.unpausedAt ? isoStringToDateOnly(partnership.unpausedAt) : '',
  }
}

export function partnershipFormMissingFields(form: PartnershipFormValues): Array<string> {
  const missing: Array<string> = []
  if (!form.brandName.trim()) missing.push('Brand name')
  if (form.paymentType === 'retainer' && !form.retainerAmount.trim()) missing.push('Retainer amount')
  if (form.paymentType === 'per_deliverable' && !form.perDeliverableRate.trim()) missing.push('Rate per deliverable')
  return missing
}
