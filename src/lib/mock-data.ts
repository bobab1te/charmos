import { addDays, subDays } from 'date-fns'
import type { Brand, BrandDeal, IdeaPost, LedgerEntry } from './types'

const now = new Date()
const iso = (d: Date) => d.toISOString()

export const mockBrands: Array<Brand> = [
  { id: 'brand-1', name: 'Glow Skincare Co.', contactName: 'Mia Chen', contactEmail: 'mia@glowskincare.com', createdAt: iso(subDays(now, 120)) },
  { id: 'brand-2', name: 'Nomad Luggage', contactName: 'Theo Park', contactEmail: 'partnerships@nomadluggage.com', createdAt: iso(subDays(now, 96)) },
  { id: 'brand-3', name: 'Bright Bites Snacks', contactName: 'Ravi Patel', contactEmail: 'ravi@brightbites.co', createdAt: iso(subDays(now, 70)) },
  { id: 'brand-4', name: 'Aurora Beauty', contactName: 'Sana Iqbal', contactEmail: 'sana@aurorabeauty.com', createdAt: iso(subDays(now, 200)) },
  { id: 'brand-5', name: 'PulseFit Gear', contactName: 'Jordan Blake', contactEmail: 'jordan@pulsefitgear.com', createdAt: iso(subDays(now, 45)) },
  { id: 'brand-6', name: 'Loomi Home', contactName: 'Ken Osei', contactEmail: 'ken@loomihome.com', createdAt: iso(subDays(now, 30)) },
]

export const mockDeals: Array<BrandDeal> = [
  {
    id: 'deal-1',
    brandId: 'brand-1',
    stage: 'negotiating',
    deliverables: [
      { id: 'del-1', type: '1 TikTok video', dueDate: iso(addDays(now, 12)), done: false },
    ],
    compensationAmount: 800,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    usageRights: '3 months paid usage, organic only',
    contentRequirements: { hashtags: ['#GlowUp', '#ad'], accountsToTag: ['@glowskincare'], clipsToUse: [] },
    paid: false,
    createdAt: iso(subDays(now, 14)),
    stageUpdatedAt: iso(subDays(now, 9)),
  },
  {
    id: 'deal-2',
    brandId: 'brand-4',
    stage: 'negotiating',
    deliverables: [
      { id: 'del-2', type: '2 Instagram Reels', dueDate: iso(addDays(now, 20)), done: false },
    ],
    compensationAmount: 1200,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    contentRequirements: { hashtags: ['#AuroraBeauty'], accountsToTag: ['@aurorabeauty'], clipsToUse: [] },
    paid: false,
    createdAt: iso(subDays(now, 11)),
    stageUpdatedAt: iso(subDays(now, 2)),
  },
  {
    id: 'deal-3',
    brandId: 'brand-2',
    stage: 'confirmed',
    deliverables: [
      { id: 'del-3', type: '1 YouTube Short', dueDate: iso(addDays(now, 2)), done: false },
      { id: 'del-4', type: '3 IG Story frames', dueDate: iso(addDays(now, 4)), done: false },
    ],
    compensationAmount: 950,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    usageRights: '6 months paid usage + whitelisting',
    shipment: { carrier: 'UPS', trackingNumber: '1Z999AA10123456784', shippedDate: iso(subDays(now, 3)), estimatedDelivery: iso(addDays(now, 1)), status: 'shipped' },
    contentRequirements: { hashtags: ['#NomadReady', '#ad'], accountsToTag: ['@nomadluggage'], clipsToUse: ['unboxing', 'airport walkthrough'] },
    paid: false,
    createdAt: iso(subDays(now, 20)),
    stageUpdatedAt: iso(subDays(now, 3)),
  },
  {
    id: 'deal-4',
    brandId: 'brand-5',
    stage: 'confirmed',
    deliverables: [
      { id: 'del-5', type: '1 TikTok + 1 IG Reel', dueDate: iso(addDays(now, 6)), done: false },
    ],
    compensationAmount: 650,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    shipment: { carrier: 'FedEx', trackingNumber: '789123456012', status: 'pending' },
    contentRequirements: { hashtags: ['#PulseFit', '#ad'], accountsToTag: ['@pulsefitgear'], clipsToUse: [] },
    paid: false,
    createdAt: iso(subDays(now, 8)),
    stageUpdatedAt: iso(subDays(now, 1)),
  },
  {
    id: 'deal-5',
    brandId: 'brand-3',
    stage: 'live',
    deliverables: [
      { id: 'del-6', type: '1 TikTok video', dueDate: iso(subDays(now, 1)), done: true },
    ],
    compensationAmount: 500,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    contentRequirements: { hashtags: ['#BrightBites'], accountsToTag: ['@brightbitessnacks'], clipsToUse: [] },
    paid: false,
    createdAt: iso(subDays(now, 25)),
    stageUpdatedAt: iso(subDays(now, 1)),
  },
  {
    id: 'deal-6',
    brandId: 'brand-6',
    stage: 'live',
    deliverables: [
      { id: 'del-7', type: '1 YouTube integration', dueDate: iso(addDays(now, 3)), done: false },
    ],
    compensationAmount: 1400,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    contentRequirements: { hashtags: ['#LoomiHome', '#ad'], accountsToTag: ['@loomihome'], clipsToUse: ['room tour'] },
    paid: false,
    createdAt: iso(subDays(now, 15)),
    stageUpdatedAt: iso(subDays(now, 4)),
  },
  {
    id: 'deal-7',
    brandId: 'brand-4',
    stage: 'completed',
    deliverables: [
      { id: 'del-8', type: '1 IG Reel', dueDate: iso(subDays(now, 10)), done: true },
    ],
    compensationAmount: 900,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    paid: true,
    paidDate: iso(subDays(now, 5)),
    createdAt: iso(subDays(now, 40)),
    stageUpdatedAt: iso(subDays(now, 5)),
  },
  {
    id: 'deal-8',
    brandId: 'brand-2',
    stage: 'completed',
    deliverables: [
      { id: 'del-9', type: '1 TikTok video', dueDate: iso(subDays(now, 28)), done: true },
    ],
    compensationAmount: 700,
    compensationCurrency: 'USD',
    compensationType: 'paid',
    paid: true,
    paidDate: iso(subDays(now, 26)),
    createdAt: iso(subDays(now, 50)),
    stageUpdatedAt: iso(subDays(now, 26)),
  },
]

export const mockIdeas: Array<IdeaPost> = [
  {
    id: 'idea-1',
    title: 'Get Ready With Me: skincare shelfie edit',
    hook: 'POV you finally organize your skincare shelf on camera',
    description: 'GRWM using Glow Skincare products, morning light, quick cuts.',
    platforms: ['tiktok', 'instagram'],
    status: 'idea',
    scheduledDate: null,
    referenceLinks: [],
    createdAt: iso(subDays(now, 1)),
  },
  {
    id: 'idea-2',
    title: 'Packing my carry-on in 30 seconds',
    hook: 'Fast-cut packing challenge with the Nomad carry-on',
    platforms: ['tiktok'],
    status: 'idea',
    scheduledDate: null,
    referenceLinks: [],
    createdAt: iso(subDays(now, 2)),
  },
  {
    id: 'idea-3',
    title: 'Snack taste-test ranking',
    hook: 'Ranking Bright Bites flavors worst to best',
    description: 'Tier-list style overlay, reaction shots.',
    platforms: ['youtube', 'tiktok'],
    status: 'idea',
    scheduledDate: null,
    referenceLinks: [],
    createdAt: iso(subDays(now, 3)),
  },
  {
    id: 'idea-4',
    title: 'Home office glow-up reveal',
    hook: 'Before/after of my desk setup with Loomi pieces',
    platforms: ['instagram'],
    status: 'scheduled',
    scheduledDate: iso(addDays(now, 5)),
    referenceLinks: [],
    createdAt: iso(subDays(now, 6)),
  },
  {
    id: 'idea-5',
    title: 'Gym bag essentials with PulseFit',
    platforms: ['tiktok', 'instagram'],
    status: 'editing',
    scheduledDate: iso(addDays(now, 2)),
    referenceLinks: [],
    createdAt: iso(subDays(now, 9)),
  },
]

export const mockLedger: Array<LedgerEntry> = (() => {
  const entries: Array<LedgerEntry> = []
  const monthOffsets = [5, 4, 3, 2, 1, 0]
  const baseByMonth = [1400, 2100, 1800, 2600, 2200, 1500]
  monthOffsets.forEach((offset, idx) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 12)
    entries.push({
      id: `ledger-income-${offset}`,
      type: 'income',
      amount: baseByMonth[idx],
      currency: 'USD',
      date: d.toISOString(),
      description: 'Brand deal payouts',
    })
  })
  entries.push({
    id: 'ledger-expense-1',
    type: 'expense',
    amount: 120,
    currency: 'USD',
    date: iso(subDays(now, 4)),
    description: 'Editing software subscription',
  })
  // completed & paid deals contribute to this month's earnings too
  entries.push({
    id: 'ledger-income-deal-7',
    type: 'income',
    amount: 900,
    currency: 'USD',
    date: iso(subDays(now, 5)),
    description: 'Aurora Beauty payout',
    dealId: 'deal-7',
    brandId: 'brand-4',
  })
  return entries
})()
