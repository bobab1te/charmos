export interface WidgetColorSwatch {
  id: string
  label: string
  value: string
  /**
   * Overrides readableTextColor's generic pick for this swatch specifically — see
   * resolveTextColor and the palette's own comment below for why every current swatch sets this.
   */
  textColor?: string
}

/**
 * "Pastel Bridesmaids" palette — one deterministic-default-plus-custom-override system used by
 * every colorable widget (brand deal cards, idea/scrapbook cards, partnership cards, ...), so a
 * color picked anywhere in the app looks and behaves the same everywhere. Brightening this
 * palette was tried and reverted (too dark/saturated, didn't read as pastel) — these are the
 * original values, kept for now.
 *
 * Every swatch gets an explicit dark-text override rather than relying on the generic luminance
 * heuristic below: the card background is actually glassBackground(swatch) (see below), and
 * --surface-strong is a dark plum in dark mode — mixing that in drags every one of these
 * pastels' effective luminance under the heuristic's 0.5 cutoff, which would pick white text
 * (checked by replicating the real color-mix math in both themes: dark text measures 5.6–10.3:1
 * contrast in dark mode and 10.9–18.2:1 in light mode at the current 76% tint — re-verified after
 * lowering the tint from 82% to let the glassmorphism blur show through; white is never right for
 * this palette in either theme).
 */
export const WIDGET_COLOR_PALETTE: Array<WidgetColorSwatch> = [
  { id: 'pale-pink', label: 'Pale Pink', value: '#ffe1e6', textColor: '#1a1220' },
  { id: 'azalea', label: 'Azalea', value: '#f7c9d4', textColor: '#1a1220' },
  { id: 'lilac', label: 'Lilac', value: '#d9c7e3', textColor: '#1a1220' },
  { id: 'dusty-blue', label: 'Dusty Blue', value: '#a9b7db', textColor: '#1a1220' },
  { id: 'sage', label: 'Sage', value: '#b7c2a8', textColor: '#1a1220' },
  { id: 'mint', label: 'Mint', value: '#c2e3d6', textColor: '#1a1220' },
  { id: 'peach', label: 'Peach', value: '#f2c9a8', textColor: '#1a1220' },
  { id: 'butter', label: 'Butter', value: '#f2e3a8', textColor: '#1a1220' },
]

/**
 * How much of a widget's color shows through its glassmorphism tint — the rest blends with
 * --surface-strong so the card's backdrop-blur has something visible to show through. One
 * constant (not a literal re-typed in every component) so every colorable widget uses exactly
 * the same recipe. Lowered from an earlier 82% specifically to make the blur-through visible;
 * re-verified against the whole palette at 76% before landing on it (see the palette's own
 * comment above for the resulting contrast numbers) — going much lower starts eating into
 * contrast margin on the darker swatches (dusty-blue, sage) in dark mode.
 */
export const GLASS_TINT_PERCENT = 76

/** The actual background for any colorable glass widget — deal/idea/partnership cards, kept as one function so the tint percentage and mix method can't drift between components. */
export function glassBackground(color: string): string {
  return `color-mix(in oklab, ${color} ${GLASS_TINT_PERCENT}%, var(--surface-strong))`
}

/**
 * Deterministic per-item default, cycling through the palette by a hash of the
 * item's id rather than its position in a list — stable across reloads and
 * unaffected by other items being added, moved, or deleted, unlike an
 * index-based cycle would be. Used for deal, idea, and partnership cards alike.
 */
export function defaultCardColor(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return WIDGET_COLOR_PALETTE[hash % WIDGET_COLOR_PALETTE.length].value
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
 * Text color for a widget card background: uses a palette swatch's explicit `textColor`
 * override when the color matches one exactly, else falls back to the generic
 * luminance heuristic above (for arbitrary custom colors picked via the native color input).
 */
export function resolveTextColor(color: string): string {
  const swatch = WIDGET_COLOR_PALETTE.find((s) => s.value.toLowerCase() === color.toLowerCase())
  return swatch?.textColor ?? readableTextColor(color)
}
