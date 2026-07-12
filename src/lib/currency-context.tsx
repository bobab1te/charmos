import { createContext, useCallback, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getExchangeRates } from '#/server/exchange-rates'

interface CurrencyContextValue {
  /** The creator's chosen display currency (profile.currency), e.g. "USD". */
  displayCurrency: string
  /** Units of each currency per 1 unit of displayCurrency; undefined until the first fetch resolves. */
  rates: Record<string, number> | undefined
  ratesLoading: boolean
  /** Converts an amount from its own currency into the display currency. Returns the amount unconverted if no rate is available yet. */
  convert: (amount: number, fromCurrency: string) => number
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ displayCurrency, children }: { displayCurrency: string; children: ReactNode }) {
  const { data: rates, isLoading } = useQuery({
    queryKey: ['exchange-rates', displayCurrency],
    queryFn: () => getExchangeRates({ data: { base: displayCurrency } }),
    staleTime: 12 * 60 * 60 * 1000,
  })

  const convert = useCallback(
    (amount: number, fromCurrency: string) => {
      if (fromCurrency === displayCurrency) return amount
      const rate = rates?.[fromCurrency]
      if (!rate) return amount
      return amount / rate
    },
    [rates, displayCurrency],
  )

  const value = useMemo(
    () => ({ displayCurrency, rates, ratesLoading: isLoading, convert }),
    [displayCurrency, rates, isLoading, convert],
  )

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider')
  return ctx
}
