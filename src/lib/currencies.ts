/** Common currencies offered across onboarding, settings, and the deal form — single source of truth so the three pickers can't drift out of sync. */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'CAD',
  'GBP',
  'EUR',
  'AUD',
  'NZD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'MXN',
  'INR',
  'SGD',
  'ZAR',
  'BRL',
] as const

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number]
