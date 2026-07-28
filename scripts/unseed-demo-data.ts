// Dev-only: removes exactly the rows seed-demo-data.ts would have inserted for a given
// user, matched by the same fixed names/titles/descriptions from mock-data.ts. Leaves
// everything else in the account untouched. Never imported by the app itself.
//
// Usage: SEED_USER_ID=<uuid> npm run unseed-demo
//
// Requires SUPABASE_SERVICE_ROLE_KEY (Settings -> API in your Supabase project) in
// addition to VITE_SUPABASE_URL — same as seed-demo-data.ts.

import { createClient } from '@supabase/supabase-js'
import { mockBrands, mockIdeas, mockLedger } from '../src/lib/mock-data'
import type { Database } from '../src/lib/supabase/database.types'

const userId = process.argv[2] ?? process.env.SEED_USER_ID
const url = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!userId) {
  console.error('Usage: SEED_USER_ID=<uuid> npm run unseed-demo  (or: npm run unseed-demo -- <uuid>)')
  process.exit(1)
}
if (!url || !serviceRoleKey) {
  console.error('Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in your environment first.')
  process.exit(1)
}

const supabase = createClient<Database>(url, serviceRoleKey)
const NULL_UUID = '00000000-0000-0000-0000-000000000000'

async function main() {
  const brandNames = mockBrands.map((b) => b.name)
  const ideaTitles = mockIdeas.map((i) => i.title)

  const { data: brands, error: brandsErr } = await supabase
    .from('brands')
    .select('id')
    .eq('user_id', userId!)
    .in('name', brandNames)
  if (brandsErr) throw brandsErr
  const brandIds = (brands ?? []).map((b) => b.id)

  const { data: partnerships, error: partnershipsErr } = await supabase
    .from('partnerships')
    .select('id')
    .eq('user_id', userId!)
    .in('brand_id', brandIds.length ? brandIds : [NULL_UUID])
  if (partnershipsErr) throw partnershipsErr
  const partnershipIds = (partnerships ?? []).map((p) => p.id)

  const { data: deals, error: dealsErr } = await supabase
    .from('deals')
    .select('id')
    .eq('user_id', userId!)
    .in('brand_id', brandIds.length ? brandIds : [NULL_UUID])
  if (dealsErr) throw dealsErr
  const dealIds = (deals ?? []).map((d) => d.id)

  if (partnershipIds.length) {
    await supabase.from('partnership_deliverables').delete().eq('user_id', userId!).in('partnership_id', partnershipIds)
    await supabase.from('ledger').delete().eq('user_id', userId!).in('partnership_id', partnershipIds)
  }
  if (dealIds.length) {
    await supabase.from('ledger').delete().eq('user_id', userId!).in('deal_id', dealIds)
  }
  if (brandIds.length) {
    await supabase.from('ledger').delete().eq('user_id', userId!).in('brand_id', brandIds)
  }

  // Generic ledger entries with no FK link (monthly income rows + expenses) — matched by
  // the exact type/description/amount from mock-data.ts, and only when still unlinked, so
  // a real entry the user happens to describe the same way is left alone if it's tied to
  // one of their own deals/brands/partnerships.
  const untaggedEntries = mockLedger.filter((e) => !e.dealId && !e.brandId && !e.partnershipId)
  for (const entry of untaggedEntries) {
    await supabase
      .from('ledger')
      .delete()
      .eq('user_id', userId!)
      .eq('type', entry.type)
      .eq('description', entry.description)
      .eq('amount', entry.amount)
      .is('deal_id', null)
      .is('brand_id', null)
      .is('partnership_id', null)
  }

  if (partnershipIds.length) await supabase.from('partnerships').delete().in('id', partnershipIds)
  if (dealIds.length) await supabase.from('deals').delete().in('id', dealIds)
  if (brandIds.length) await supabase.from('brands').delete().in('id', brandIds)

  const { error: ideasErr, count: ideasCount } = await supabase
    .from('ideas')
    .delete({ count: 'exact' })
    .eq('user_id', userId!)
    .in('title', ideaTitles)
  if (ideasErr) throw ideasErr

  console.log(
    `Removed ${brandIds.length} brands, ${dealIds.length} deals, ${partnershipIds.length} partnerships, ${ideasCount ?? 0} ideas, and ${untaggedEntries.length + dealIds.length + brandIds.length + partnershipIds.length} matching ledger entries for user ${userId}.`,
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
