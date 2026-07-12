import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'
import { SUPPORTED_CURRENCIES } from '#/lib/currencies'

/**
 * Frankfurter (api.frankfurter.dev) publishes rates once per day, so an
 * in-memory cache keyed by base+date avoids re-fetching on every request
 * without needing a database table or a cron job — it just naturally
 * refreshes the first time someone loads the app after rates update.
 */
const rateCache = new Map<string, { date: string; rates: Record<string, number> }>()

const inputSchema = z.object({ base: z.string().length(3) })

interface FrankfurterRow {
  date: string
  base: string
  quote: string
  rate: number
}

/** Returns a map of currency code -> units of that currency per 1 unit of `base`. */
export const getExchangeRates = createServerFn({ method: 'GET' })
  .validator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<Record<string, number>> => {
    const base = data.base.toUpperCase()
    const today = new Date().toISOString().slice(0, 10)
    const cached = rateCache.get(base)
    if (cached && cached.date === today) return cached.rates

    const quotes = SUPPORTED_CURRENCIES.filter((c) => c !== base).join(',')
    try {
      const res = await fetch(`https://api.frankfurter.dev/v2/rates?base=${base}&quotes=${quotes}`)
      if (!res.ok) return cached?.rates ?? {}
      const rows = (await res.json()) as Array<FrankfurterRow>
      const rates: Record<string, number> = {}
      for (const row of rows) rates[row.quote] = row.rate
      rateCache.set(base, { date: today, rates })
      return rates
    } catch {
      // Network hiccup — fall back to yesterday's cached rates rather than breaking the dashboard.
      return cached?.rates ?? {}
    }
  })
