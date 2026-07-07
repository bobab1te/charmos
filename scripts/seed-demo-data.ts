// Dev-only: seeds a Supabase account with the same demo brands/deals/ideas/
// earnings that used to be CharmOS's hardcoded mock data, now that real
// accounts start empty. Never imported by the app itself.
//
// Usage: SEED_USER_ID=<uuid> npm run seed-demo
//
// Requires SUPABASE_SERVICE_ROLE_KEY (Settings -> API in your Supabase
// project) in addition to VITE_SUPABASE_URL — the service role key bypasses
// RLS so this script can insert rows for an arbitrary user id. Never expose
// this key to the browser; it's read here as a plain (non VITE_-prefixed)
// env var and this script only ever runs locally via Node.

import { createClient } from '@supabase/supabase-js'
import { mockBrands, mockDeals, mockIdeas, mockLedger } from '../src/lib/mock-data'
import type { Database } from '../src/lib/supabase/database.types'

const userId = process.argv[2] ?? process.env.SEED_USER_ID
const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!userId) {
  console.error('Usage: SEED_USER_ID=<uuid> npm run seed-demo  (or: npm run seed-demo -- <uuid>)')
  process.exit(1)
}
if (!url || !serviceRoleKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment first.')
  process.exit(1)
}

const supabase = createClient<Database>(url, serviceRoleKey)

async function main() {
  const brandIdByMockId = new Map<string, string>()

  for (const brand of mockBrands) {
    const { data, error } = await supabase
      .from('brands')
      .insert({
        user_id: userId!,
        name: brand.name,
        contact_name: brand.contactName,
        contact_email: brand.contactEmail,
        created_at: brand.createdAt,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Failed to insert brand "${brand.name}": ${error?.message}`)
    brandIdByMockId.set(brand.id, data.id)
  }

  const dealIdByMockId = new Map<string, string>()

  for (const deal of mockDeals) {
    const brandId = brandIdByMockId.get(deal.brandId)
    if (!brandId) throw new Error(`No inserted brand found for mock brandId "${deal.brandId}"`)
    const { data, error } = await supabase
      .from('deals')
      .insert({
        user_id: userId!,
        brand_id: brandId,
        stage: deal.stage,
        deliverables: deal.deliverables as unknown as Database['public']['Tables']['deals']['Insert']['deliverables'],
        compensation_amount: deal.compensationAmount,
        compensation_currency: deal.compensationCurrency,
        usage_rights: deal.usageRights,
        shipment: (deal.shipment ?? null) as unknown as Database['public']['Tables']['deals']['Insert']['shipment'],
        content_requirements: (deal.contentRequirements ??
          null) as unknown as Database['public']['Tables']['deals']['Insert']['content_requirements'],
        paid: deal.paid,
        paid_date: deal.paidDate,
        created_at: deal.createdAt,
        stage_updated_at: deal.stageUpdatedAt,
      })
      .select('id')
      .single()
    if (error || !data) throw new Error(`Failed to insert deal for brandId "${deal.brandId}": ${error?.message}`)
    dealIdByMockId.set(deal.id, data.id)
  }

  for (const idea of mockIdeas) {
    const { error } = await supabase.from('ideas').insert({
      user_id: userId!,
      title: idea.title,
      hook: idea.hook,
      description: idea.description,
      platforms: idea.platforms,
      status: idea.status,
      scheduled_date: idea.scheduledDate,
      reference_links: idea.referenceLinks,
      created_at: idea.createdAt,
    })
    if (error) throw new Error(`Failed to insert idea "${idea.title}": ${error.message}`)
  }

  for (const entry of mockLedger) {
    const { error } = await supabase.from('ledger').insert({
      user_id: userId!,
      type: entry.type,
      amount: entry.amount,
      currency: entry.currency,
      date: entry.date,
      description: entry.description,
      deal_id: entry.dealId ? (dealIdByMockId.get(entry.dealId) ?? null) : null,
      brand_id: entry.brandId ? (brandIdByMockId.get(entry.brandId) ?? null) : null,
    })
    if (error) throw new Error(`Failed to insert ledger entry "${entry.description}": ${error.message}`)
  }

  console.log(
    `Seeded ${mockBrands.length} brands, ${mockDeals.length} deals, ${mockIdeas.length} ideas, ${mockLedger.length} ledger entries for user ${userId}.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
