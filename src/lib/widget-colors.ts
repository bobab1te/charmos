import type { Theme } from './theme-context'

export interface WidgetColorSwatch {
  id: string
  label: string
  value: string
  /**
   * Overrides readableTextColor's generic pick for this swatch specifically — see
   * resolveTextColor and each palette's own comment below for why every swatch sets this.
   */
  textColor?: string
}

/**
 * Light-mode palette — recolored warm to match the light-mode background revamp (rose/amber
 * blob). Kept the 4 swatches that were already warm (pale pink, azalea, peach, butter) and
 * replaced the 4 cool ones (lilac, dusty blue, sage, mint — now in WIDGET_COLOR_PALETTE_DARK
 * instead) with amber, terracotta, mauve, and champagne. All 8 measure 10.9–18.2:1 contrast
 * against dark ink at the 76% glass tint — verified via the same OKLab color-mix replication
 * used throughout this palette's history.
 */
export const WIDGET_COLOR_PALETTE_LIGHT: Array<WidgetColorSwatch> = [
  { id: 'pale-pink', label: 'Pale Pink', value: '#ffe1e6', textColor: '#1a1220' },
  { id: 'azalea', label: 'Azalea', value: '#f7c9d4', textColor: '#1a1220' },
  { id: 'peach', label: 'Peach', value: '#f2c9a8', textColor: '#1a1220' },
  { id: 'butter', label: 'Butter', value: '#f2e3a8', textColor: '#1a1220' },
  { id: 'amber', label: 'Amber', value: '#eec190', textColor: '#1a1220' },
  { id: 'terracotta', label: 'Terracotta', value: '#e0a082', textColor: '#1a1220' },
  { id: 'mauve', label: 'Mauve', value: '#d3aed9', textColor: '#1a1220' },
  { id: 'champagne', label: 'Champagne', value: '#f2e6d0', textColor: '#1a1220' },
]

/**
 * Dark-mode palette — a completely separate cool set (purples, navy/blues, a couple deeper
 * greens) rather than a re-shaded version of the light palette, since the light palette moved
 * warm and no longer suits the dark navy/plum background. All 8 swatches use white text now
 * (previously periwinkle/lilac/amethyst/dusty-blue/sage paired with dark ink) — those 5 were
 * darkened enough to keep white legible (4.6–4.8:1, small but real margin over the 4.5:1 AA
 * minimum) rather than just switching the text color on the original lighter values, which
 * would have failed contrast. Slate/midnight/forest were already dark enough (5.3–10.1:1) and
 * unchanged.
 */
export const WIDGET_COLOR_PALETTE_DARK: Array<WidgetColorSwatch> = [
  { id: 'periwinkle', label: 'Periwinkle', value: '#858da7', textColor: '#ffffff' },
  { id: 'lilac', label: 'Lilac', value: '#9488a2', textColor: '#ffffff' },
  { id: 'amethyst', label: 'Amethyst', value: '#9e85bb', textColor: '#ffffff' },
  { id: 'dusty-blue', label: 'Dusty Blue', value: '#828fb1', textColor: '#ffffff' },
  { id: 'slate', label: 'Slate', value: '#6f84ad', textColor: '#ffffff' },
  { id: 'midnight', label: 'Midnight', value: '#3d4a7a', textColor: '#ffffff' },
  { id: 'sage', label: 'Sage', value: '#7e947e', textColor: '#ffffff' },
  { id: 'forest', label: 'Forest', value: '#4f6b52', textColor: '#ffffff' },
]

/** Which palette a colorable widget's picker/default should draw from for the given theme. */
export function widgetColorPalette(theme: Theme): Array<WidgetColorSwatch> {
  return theme === 'dark' ? WIDGET_COLOR_PALETTE_DARK : WIDGET_COLOR_PALETTE_LIGHT
}

/**
 * How much of a widget's color shows through its glassmorphism tint — the rest blends with
 * --surface-strong so the card's backdrop-blur has something visible to show through. One
 * constant (not a literal re-typed in every component) so every colorable widget uses exactly
 * the same recipe. Lowered from an earlier 82% specifically to make the blur-through visible;
 * re-verified against both palettes at 76% before landing on it — going much lower starts eating
 * into contrast margin on the darker swatches (amethyst, slate, forest).
 */
export const GLASS_TINT_PERCENT = 76

/** The actual background for any colorable glass widget — deal/idea/partnership cards, kept as one function so the tint percentage and mix method can't drift between components. */
export function glassBackground(color: string): string {
  return `color-mix(in oklab, ${color} ${GLASS_TINT_PERCENT}%, var(--surface-strong))`
}

/**
 * Deterministic per-item default, cycling through the current theme's palette by a hash of the
 * item's id rather than its position in a list — stable across reloads and unaffected by other
 * items being added, moved, or deleted, unlike an index-based cycle would be. Used for deal,
 * idea, and partnership cards alike. Since light/dark now have entirely different swatches (not
 * just re-shaded ones), an item with no explicit color override can land on a different-looking
 * default between themes — expected, not a bug.
 */
export function defaultCardColor(id: string, theme: Theme): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  const palette = widgetColorPalette(theme)
  return palette[hash % palette.length].value
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
 * override when the color matches one exactly (checking both themes' palettes, since a color
 * chosen under one theme is still stored and rendered under the other), else falls back to the
 * generic luminance heuristic above (for arbitrary custom colors picked via the native color
 * input).
 */
export function resolveTextColor(color: string): string {
  const swatch = [...WIDGET_COLOR_PALETTE_LIGHT, ...WIDGET_COLOR_PALETTE_DARK].find(
    (s) => s.value.toLowerCase() === color.toLowerCase(),
  )
  return swatch?.textColor ?? readableTextColor(color)
}
