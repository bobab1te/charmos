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
 * warm and no longer suits the dark navy/plum background. All 8 swatches use white text.
 *
 * Darkened again after measuring the *painted* result in the browser rather than modelling it.
 * The previous values were derived from a replication of the color-mix that turned out to be
 * optimistic: periwinkle rendered at 3.26:1 against white, not the 4.6:1 the old note claimed,
 * because glassBackground() mixes with a translucent --surface-strong and the composite lands
 * lighter than a straight blend predicts.
 *
 * The title is not the binding constraint — the secondary line is. Card body text renders at
 * ~0.88 alpha (see softTextColor in deal-pipeline), so a swatch needs the white title to clear
 * roughly 6:1 for the dates and deliverables on the same card to clear 4.5:1. These values are
 * measured, not modelled; re-measure in the browser if you change them.
 */
export const WIDGET_COLOR_PALETTE_DARK: Array<WidgetColorSwatch> = [
  { id: 'periwinkle', label: 'Periwinkle', value: '#5c6480', textColor: '#ffffff' },
  { id: 'lilac', label: 'Lilac', value: '#6a6078', textColor: '#ffffff' },
  { id: 'amethyst', label: 'Amethyst', value: '#6f5b8a', textColor: '#ffffff' },
  { id: 'dusty-blue', label: 'Dusty Blue', value: '#59657f', textColor: '#ffffff' },
  { id: 'slate', label: 'Slate', value: '#4c5c7e', textColor: '#ffffff' },
  { id: 'midnight', label: 'Midnight', value: '#3d4a7a', textColor: '#ffffff' },
  { id: 'sage', label: 'Sage', value: '#566a56', textColor: '#ffffff' },
  { id: 'forest', label: 'Forest', value: '#445c47', textColor: '#ffffff' },
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

/**
 * Colors saved before the dark palette was darkened, mapped to their replacements.
 *
 * Changing the palette only affects new defaults and new picks — a card whose color was already
 * chosen and stored keeps rendering the old value, so without this the exact cards a real user
 * has been using are the ones that stay unreadable. Verified against live data: a deal holding
 * the old periwinkle still measured 2.9:1 on its body text after the palette change.
 *
 * Applied at render time rather than as a database migration, so nobody's stored choice is
 * silently rewritten — pick the same shade again and it simply resolves to the readable version.
 */
const LEGACY_DARK_SWATCH_REMAP: Record<string, string> = {
  '#858da7': '#5c6480', // periwinkle
  '#9488a2': '#6a6078', // lilac
  '#9e85bb': '#6f5b8a', // amethyst
  '#828fb1': '#59657f', // dusty blue
  '#6f84ad': '#4c5c7e', // slate
  '#7e947e': '#566a56', // sage
  '#4f6b52': '#445c47', // forest
}

/** Normalises a stored color before it is painted or measured. Safe to call repeatedly. */
export function normalizeCardColor(color: string): string {
  return LEGACY_DARK_SWATCH_REMAP[color.toLowerCase()] ?? color
}

/** The actual background for any colorable glass widget — deal/idea/partnership cards, kept as one function so the tint percentage and mix method can't drift between components. */
export function glassBackground(color: string): string {
  return `color-mix(in oklab, ${normalizeCardColor(color)} ${GLASS_TINT_PERCENT}%, var(--surface-strong))`
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

export const CARD_INK = '#1a1220'
export const CARD_WHITE = '#ffffff'

function relativeLuminance(hex: string): number {
  const n = hex.replace('#', '')
  const channel = (i: number) => {
    const v = parseInt(n.substring(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
}

function contrast(aHex: string, bHex: string): number {
  const [hi, lo] = [relativeLuminance(aHex), relativeLuminance(bHex)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

/**
 * Pick whichever of dark ink / white actually contrasts better against a background.
 *
 * This replaces a `luminance > 0.5` threshold, which is not the same question and got real cards
 * wrong. A user-picked #a9b7db sits just under that threshold, so it was assigned white text and
 * rendered at 2.9:1 — while dark ink on the same color measures about 8:1. Any color from the
 * native picker could land in that band; comparing the two ratios cannot.
 *
 * Compared against the raw color rather than the glass-mixed result: the mix is 76% this color,
 * so it dominates, and the two candidates are far enough apart that the remaining 24% does not
 * flip the winner. Confirmed by measuring painted cards in the browser.
 */
export function readableTextColor(hex: string): string {
  return contrast(CARD_INK, hex) >= contrast(CARD_WHITE, hex) ? CARD_INK : CARD_WHITE
}

/**
 * Text color for a widget card background: uses a palette swatch's explicit `textColor`
 * override when the color matches one exactly (checking both themes' palettes, since a color
 * chosen under one theme is still stored and rendered under the other), else falls back to the
 * generic luminance heuristic above (for arbitrary custom colors picked via the native color
 * input).
 */
export function resolveTextColor(color: string): string {
  // Normalised first so a legacy stored swatch is matched against the value that will actually
  // be painted, not the one it was saved as.
  const normalized = normalizeCardColor(color)
  const swatch = [...WIDGET_COLOR_PALETTE_LIGHT, ...WIDGET_COLOR_PALETTE_DARK].find(
    (s) => s.value.toLowerCase() === normalized.toLowerCase(),
  )
  return swatch?.textColor ?? readableTextColor(normalized)
}
