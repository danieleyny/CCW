import { V0_PALETTE, type Palette } from "@/components/theme/themes"

type RGB = [number, number, number]

const rgb = (color: string, fallback: RGB = [47, 168, 238]): RGB => {
  const value = color.trim().replace("#", "")
  if (!/^[0-9a-f]{6}$/i.test(value)) return fallback
  const parsed: RGB = [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
  return parsed.every(Number.isFinite) ? parsed : fallback
}

const mix = (a: RGB, b: RGB, u: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`

// The canvas has always used six stops. Themes have five phase colors, so the
// final phase intentionally repeats as the sixth stop. This also keeps a bad
// external palette from producing undefined/NaN canvas colors.
export const stopColors = (palette: Palette = V0_PALETTE) => {
  const valid = (color: unknown) => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color.trim())
  const raw = [...palette.phase.slice(0, 5), palette.extra]
  const normalized = raw.map((color, index) => {
    if (valid(color)) return color.trim()
    const preceding = raw.slice(0, index).findLast(valid)
    return typeof preceding === "string" ? preceding.trim() : V0_PALETTE.extra
  })
  return normalized.length === 6 ? normalized : [...V0_PALETTE.phase, V0_PALETTE.extra]
}

const V0_LOOP: RGB[] = [[47, 168, 238], [91, 108, 255], [162, 79, 217], [238, 94, 140], [245, 154, 74], [47, 168, 238]]
const V0_PATH: RGB[] = [[47, 168, 238], [91, 108, 255], [162, 79, 217], [238, 94, 140], [245, 154, 74]]

export function loopColor(f: number, palette: Palette = V0_PALETTE) {
  const stops = stopColors(palette)
  const loop = palette === V0_PALETTE ? V0_LOOP : [...stops.map((color, index) => rgb(color, rgb(stops[Math.max(0, index - 1)] ?? V0_PALETTE.phase[0]))), rgb(stops[0] ?? V0_PALETTE.phase[0])]
  const g = ((f % 1) + 1) % 1
  const x = g * (loop.length - 1)
  const i = Math.floor(x)
  return mix(loop[i], loop[i + 1], x - i)
}

export function pathColor(f: number, palette: Palette = V0_PALETTE) {
  if (palette.path) {
    const [start, end] = palette.path
    return mix(rgb(start), rgb(end), Math.max(0, Math.min(1, f)))
  }
  const stops = stopColors(palette)
  const colors = palette === V0_PALETTE ? V0_PATH : stops.map((color, index) => rgb(color, rgb(stops[Math.max(0, index - 1)] ?? V0_PALETTE.phase[0])))
  const g = Math.max(0, Math.min(1, f))
  const x = g * (colors.length - 1)
  const i = Math.min(colors.length - 2, Math.floor(x))
  return mix(colors[i], colors[i + 1], x - i)
}

export function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
