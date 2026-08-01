/**
 * Small colour helpers shared by everything that interpolates across the day → sunset → night arc.
 * Three stops rather than two on purpose: lerping straight from a warm daylight colour to a cool
 * night one passes through a desaturated grey at the midpoint, which is exactly where sunset is
 * supposed to be at its most saturated.
 */

export const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)

export function hexLerp(a: string, b: string, t: number) {
  const k = clamp01(t)
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16))
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16))
  const mix = pa.map((v, i) => Math.round(v + (pb[i] - v) * k))
  return `#${mix.map((v) => v.toString(16).padStart(2, '0')).join('')}`
}

/** day → dusk → night, with dusk sitting at phase 0.5. */
export function ramp3(day: string, dusk: string, night: string, phase: number) {
  const p = clamp01(phase)
  return p < 0.5 ? hexLerp(day, dusk, p / 0.5) : hexLerp(dusk, night, (p - 0.5) / 0.5)
}

export function num3(day: number, dusk: number, night: number, phase: number) {
  const p = clamp01(phase)
  return p < 0.5 ? day + (dusk - day) * (p / 0.5) : dusk + (night - dusk) * ((p - 0.5) / 0.5)
}

export function withAlpha(hex: string, alpha: number) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  return `rgba(${r}, ${g}, ${b}, ${Math.round(clamp01(alpha) * 1000) / 1000})`
}
