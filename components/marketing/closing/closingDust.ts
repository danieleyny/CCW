import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

const V0_COLORS = ["#5FD4E0", "#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C", "#F59A4A", "#FFFFFF"]
let COLORS = V0_COLORS

type Mote = { x: number; y: number; vy: number; amp: number; fx: number; phase: number; r: number; alpha: number; twinkle: number; color: string; bokeh: boolean; sparkle: boolean }

export function startClosingDust(canvas: HTMLCanvasElement, glowY: () => number, reducedMotion: boolean, palette: Palette = V0_PALETTE): CanvasLoopHandle {
  COLORS = palette === V0_PALETTE
    ? V0_COLORS
    : palette.ice && palette.goldText
      ? [...palette.ice, palette.goldText, palette.goldLight ?? palette.goldText, palette.darkInk]
      : [...palette.phaseDark, palette.darkInk]
  let motes: Mote[] = []

  const build = (width: number, height: number) => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const mobile = width < 600
    const v2 = palette.gold === "#D9B25F"
    const count = v2 ? Math.max(60, Math.round(width * height / 5200)) : mobile ? 46 : 110
    const bokehCount = mobile ? 4 : 9
    motes = Array.from({ length: count }, (_, index) => {
      const bokeh = index < bokehCount
      const roll = random()
      const color = v2
        ? roll < .07 ? "#F0D58C" : roll < .30 ? "#E3BF6A" : roll < .50 ? "#FFFFFF" : "#8FAEDD"
        : COLORS[Math.floor(random() * COLORS.length)]
      return {
        x: random() * width,
        y: random() * height,
        vy: (bokeh ? 3 : 5) + random() * (bokeh ? 4 : 11),
        amp: 6 + random() * 18,
        fx: 0.08 + random() * 0.18,
        phase: random() * Math.PI * 2,
        r: bokeh ? 2.6 + random() * 2.4 : 0.6 + random() * 1.1,
        alpha: bokeh ? 0.07 + random() * 0.05 : 0.22 + random() * 0.38,
        twinkle: 0.6 + random() * 1.6,
        color,
        bokeh,
        sparkle: v2 && roll < .07,
      }
    })
  }

  return runCanvasLoop(canvas, (context, width, height, time) => {
    if (!motes.length) build(width, height)
    const glow = glowY()
    for (const mote of motes) {
      const y = ((mote.y - mote.vy * time) % height + height) % height
      const x = mote.x + Math.sin(time * mote.fx + mote.phase) * mote.amp
      const near = 1 - Math.min(1, Math.abs(y - glow) / (height * 0.55))
      const edge = Math.min(1, y / 60, (height - y) / 60)
      const alpha = mote.alpha * (0.55 + 0.45 * Math.sin(time * mote.twinkle + mote.phase)) * (0.3 + 0.7 * near) * edge
      if (alpha <= 0.005) continue
      context.globalAlpha = alpha
      if (mote.bokeh) {
        const gradient = context.createRadialGradient(x, y, 0, x, y, mote.r * 3)
        gradient.addColorStop(0, mote.color)
        gradient.addColorStop(1, "rgba(0,0,0,0)")
        context.fillStyle = gradient
        context.beginPath()
        context.arc(x, y, mote.r * 3, 0, Math.PI * 2)
        context.fill()
      } else if (mote.sparkle) {
        context.fillStyle = mote.color
        context.beginPath()
        context.moveTo(x, y - mote.r * 2.2); context.lineTo(x + mote.r * .75, y - mote.r * .75); context.lineTo(x + mote.r * 2.2, y); context.lineTo(x + mote.r * .75, y + mote.r * .75); context.lineTo(x, y + mote.r * 2.2); context.lineTo(x - mote.r * .75, y + mote.r * .75); context.lineTo(x - mote.r * 2.2, y); context.lineTo(x - mote.r * .75, y - mote.r * .75); context.fill()
      } else {
        context.fillStyle = mote.color
        context.beginPath()
        context.arc(x, y, mote.r, 0, Math.PI * 2)
        context.fill()
      }
    }
  }, { reducedMotion, stillTime: 4.2, onResize: build })
}
