// Particles around "Clear by ours.": a calm, drifting halo of colored dots that flows with the
// gradient, plus a few sparkles. Full density for the opening ~4s, then it settles to half.

import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { hash, loopColor } from "./heroPalette"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

type Opts = { reducedMotion?: boolean; padX: number; padTop: number; padBottom: number; palette?: Palette }

export function startSparkField(canvas: HTMLCanvasElement, opts: Opts): CanvasLoopHandle {
  const palette = opts.palette ?? V0_PALETTE
  const dot = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) => {
    if (alpha <= 0.01) return
    context.globalAlpha = Math.min(1, alpha)
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  return runCanvasLoop(
    canvas,
    (context, width, height, time) => {
      const big = width > 500
      const settle = Math.max(0.5, 1 - (Math.max(0, time - 4) / 3) * 0.5)
      const count = Math.round((big ? 56 : 38) * settle)
      const ix0 = opts.padX
      const ix1 = width - opts.padX
      const iy0 = opts.padTop
      const iy1 = height - opts.padBottom
      const colorAt = (x: number) => loopColor((x / width) * 0.5 - time / 9, palette)

      for (let i = 0; i < count; i++) {
        const r1 = hash(i * 3 + 1)
        const r2 = hash(i * 3 + 2)
        const r3 = hash(i * 3 + 3)
        const x = ((r1 + time * (0.012 + r3 * 0.02)) % 1) * width
        const band = r2 < 0.5 ? r2 * 2 : (r2 - 0.5) * 2
        let y = r2 < 0.5 ? band * (iy0 + 10) : iy1 - 10 + band * (height - iy1 + 10)
        if (r3 > 0.72) y = iy0 + band * (iy1 - iy0)
        y += Math.sin(time * (0.6 + r3) + i) * 5
        const inside = x > ix0 && x < ix1 && y > iy0 && y < iy1
        const twinkle = 0.45 + 0.55 * Math.sin(time * (1.2 + r1 * 2) + i * 1.7)
        const edge = Math.min(1, x / 40, (width - x) / 40)
        dot(context, x, y, (0.7 + r3 * 1.9) * (inside ? 0.8 : 1), colorAt(x), Math.max(0, twinkle) * edge * (inside ? 0.16 : 0.7))
      }

      const glints = settle > 0.75 ? 4 : 2
      for (let glint = 0; glint < glints; glint++) {
        const cycle = 3.2 + hash(glint + 400) * 2.4
        const offset = hash(glint + 500) * cycle
        const q = ((time + offset) % cycle) / cycle
        if (q > 0.45) continue
        const bloom = Math.sin((q / 0.45) * Math.PI)
        const seed = Math.floor((time + offset) / cycle) + glint * 31
        const x = hash(seed + 7) * width
        const y = hash(seed + 11) < 0.5
          ? hash(seed + 13) * (iy0 + 8)
          : iy1 - 8 + hash(seed + 13) * (height - iy1 + 8)
        const length = 3 + bloom * (big ? 9 : 6)
        context.globalAlpha = bloom * 0.9
        context.strokeStyle = colorAt(x)
        context.lineWidth = 1.2
        context.lineCap = "round"
        context.beginPath()
        context.moveTo(x - length, y)
        context.lineTo(x + length, y)
        context.moveTo(x, y - length)
        context.lineTo(x, y + length)
        context.stroke()
        dot(context, x, y, 1.4 + bloom, palette === V0_PALETTE ? "#FFFFFF" : palette.darkInk, bloom)
      }
    },
    { reducedMotion: opts.reducedMotion, stillTime: 2 }
  )
}
