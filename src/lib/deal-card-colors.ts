export interface DealCardSwatch {
  id: string
  label: string
  value: string
  /**
   * Overrides readableTextColor's generic pick for this swatch specifically. Needed for
   * lavender: the luminance formula under-weights blue, so a visually-light violet like this
   * lands just under the 0.5 white/dark cutoff and gets white text despite dark text actually
   * having far better contrast against it (~9:1 vs ~2:1) — see resolveTextColor.
   */
  textColor?: string
}

/** A consistent pastel family (same ~80% lightness/saturation as the app's existing charm-pink-deep) so cards read as soft, not saturated. */
export const DEAL_CARD_PALETTE: Array<DealCardSwatch> = [
  { id: 'pink', label: 'Pink', value: '#f6a8c4' },
  { id: 'lavender', label: 'Lavender', value: '#bd9ff2', textColor: '#1a1220' },
  { id: 'blue', label: 'Blue', value: '#add0f5' },
  { id: 'yellow', label: 'Yellow', value: '#f5e3ad' },
  { id: 'green', label: 'Green', value: '#d5e6ab' },
  { id: 'orange', label: 'Orange', value: '#f5d3ad' },
]

/**
 * Deterministic per-deal default, cycling through the palette by a hash of the
 * deal's id rather than its position in a list — stable across reloads and
 * unaffected by other deals being added, moved, or deleted, unlike an
 * index-based cycle would be.
 */
export function defaultCardColor(dealId: string): string {
  let hash = 0
  for (let i = 0; i < dealId.length; i++) {
    hash = (hash * 31 + dealId.charCodeAt(i)) >>> 0
  }
  return DEAL_CARD_PALETTE[hash % DEAL_CARD_PALETTE.length].value
}

/**
 * Simplified relative-luminance heuristic (not a full WCAG contrast-ratio
 * calculation) to pick readable black/white text for an arbitrary background
 * hex — good enough for the saturated pastel/accent colors this picker offers.
 */
export function readableTextColor(hex: string): string {
  const normalized = hex.replace('#', '')
  const r = parseInt(normalized.substring(0, 2), 16) / 255
  const g = parseInt(normalized.substring(2, 4), 16) / 255
  const b = parseInt(normalized.substring(4, 6), 16) / 255
  const linear = (v: number) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const luminance = 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
  return luminance > 0.5 ? '#1a1220' : '#ffffff'
}

/**
 * Text color for a deal card background: uses a palette swatch's explicit `textColor`
 * override when the color matches one exactly, else falls back to the generic
 * luminance heuristic above (for arbitrary custom colors picked via the native color input).
 */
export function resolveTextColor(color: string): string {
  const swatch = DEAL_CARD_PALETTE.find((s) => s.value.toLowerCase() === color.toLowerCase())
  return swatch?.textColor ?? readableTextColor(color)
}
