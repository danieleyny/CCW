import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

// Canvas cannot resolve the scoped CSS custom property used by the marketing layout.
const MONO_FONT = '"IBM Plex Mono", monospace'

const PHASES = ["QUALIFY", "TRAIN", "ASSEMBLE", "REVIEW", "SUBMIT"]
const STAGES = 13
const CYCLE = 9
const HOLD = 2.5

export function startStageTrack(canvas: HTMLCanvasElement, options: { reducedMotion?: boolean; palette?: Palette } = {}): CanvasLoopHandle {
  const reduced = !!options.reducedMotion
  const palette = options.palette ?? V0_PALETTE
  const cyan = palette.phaseDark[0], slate = palette.phaseDark[2], label = palette.phaseDark[3]
  return runCanvasLoop(
    canvas,
    (context, width, height, time) => {
      const x0 = 8
      const x1 = width - 8
      const y = 16
      const lit = reduced ? STAGES : Math.min(STAGES, Math.floor(((time % CYCLE) / (CYCLE - HOLD)) * (STAGES + 0.999)))

      context.fillStyle = slate
      context.globalAlpha = 0.25
      for (let x = x0; x <= x1; x += 5) {
        context.beginPath()
        context.arc(x, y, 0.8, 0, Math.PI * 2)
        context.fill()
      }

      for (let index = 0; index < STAGES; index++) {
        const x = x0 + (index * (x1 - x0)) / (STAGES - 1)
        if (index < lit) {
          context.globalAlpha = 1
          context.fillStyle = cyan
          context.beginPath()
          context.arc(x, y, 3.4, 0, Math.PI * 2)
          context.fill()
        } else {
          context.globalAlpha = 0.6
          context.strokeStyle = slate
          context.lineWidth = 1.2
          context.beginPath()
          context.arc(x, y, 3.2, 0, Math.PI * 2)
          context.stroke()
        }
        if (!reduced && index === lit - 1 && lit < STAGES) {
          const pulse = (time * 2) % 1
          context.globalAlpha = (1 - pulse) * 0.6
          context.strokeStyle = cyan
          context.lineWidth = 1.2
          context.beginPath()
          context.arc(x, y, 4 + pulse * 9, 0, Math.PI * 2)
          context.stroke()
        }
      }

      context.font = `500 9px ${MONO_FONT}`
      context.textBaseline = "alphabetic"
      context.fillStyle = label
      context.globalAlpha = 0.9
      PHASES.forEach((label, index) => {
        const x = x0 + (index / 4) * (x1 - x0)
        context.textAlign = index === 0 ? "left" : index === 4 ? "right" : "center"
        context.fillText(label, index === 0 ? x0 - 4 : index === 4 ? x1 + 4 : x, height - 6)
      })
    },
    { reducedMotion: reduced, stillTime: 0 }
  )
}
