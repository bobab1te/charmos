import type { Brand, Partnership, PartnershipFormValues } from './types'

export function emptyPartnershipForm(): PartnershipFormValues {
  return {
    brandName: '',
    startDate: new Date().toISOString().slice(0, 10),
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
  }
}

export function partnershipToFormValues(partnership: Partnership, brand: Brand): PartnershipFormValues {
  return {
    brandName: brand.name,
    startDate: partnership.startDate.slice(0, 10),
    endDate: partnership.endDate?.slice(0, 10) ?? '',
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
  }
}

export function partnershipFormMissingFields(form: PartnershipFormValues): Array<string> {
  const missing: Array<string> = []
  if (!form.brandName.trim()) missing.push('Brand name')
  if (form.paymentType === 'retainer' && !form.retainerAmount.trim()) missing.push('Retainer amount')
  if (form.paymentType === 'per_deliverable' && !form.perDeliverableRate.trim()) missing.push('Rate per deliverable')
  return missing
}
