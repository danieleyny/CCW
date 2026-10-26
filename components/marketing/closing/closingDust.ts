import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"

const COLORS = ["#5FD4E0", "#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C", "#F59A4A", "#FFFFFF"]

type Mote = { x: number; y: number; vy: number; amp: number; fx: number; phase: number; r: number; alpha: number; twinkle: number; color: string; bokeh: boolean }

export function startClosingDust(canvas: HTMLCanvasElement, glowY: () => number, reducedMotion: boolean): CanvasLoopHandle {
  let motes: Mote[] = []

  const build = (width: number, height: number) => {
    let seed = 7
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const mobile = width < 600
    const count = mobile ? 46 : 110
    const bokehCount = mobile ? 4 : 9
    motes = Array.from({ length: count }, (_, index) => {
      const bokeh = index < bokehCount
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
        color: COLORS[Math.floor(random() * COLORS.length)],
        bokeh,
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
      } else {
        context.fillStyle = mote.color
        context.beginPath()
        context.arc(x, y, mote.r, 0, Math.PI * 2)
        context.fill()
      }
    }
  }, { reducedMotion, stillTime: 4.2, onResize: build })
}
