import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { hash, pathColor } from "./heroPalette"
import { CITY_AREA, MAP_PATH, STOP_POINTS } from "./heroMapPath"

type Point = [number, number, number]

const DWELL = 0.9
const MOVE = 1.15
const END = 2
const CYCLE = 5 * (DWELL + MOVE) + END
const BASE_WIDTH = 725

const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2)

type Phase = { from: number; u: number; at: number; dwell: number; moving: boolean; end: boolean; endLeft: number }

function phaseAt(time: number): Phase {
  let remaining = time % CYCLE
  for (let i = 0; i < 5; i++) {
    if (remaining < DWELL) return { from: i, u: 0, at: i, dwell: remaining, moving: false, end: false, endLeft: 0 }
    remaining -= DWELL
    if (remaining < MOVE) return { from: i, u: easeInOutCubic(remaining / MOVE), at: i, dwell: -1, moving: true, end: false, endLeft: 0 }
    remaining -= MOVE
  }
  return { from: 5, u: 0, at: 5, dwell: remaining, moving: false, end: true, endLeft: END - remaining }
}

export type HeroMapHandle = CanvasLoopHandle

export function startHeroMap(
  canvas: HTMLCanvasElement,
  opts: { reducedMotion?: boolean; debug?: boolean; onStep?: (chip: number, step: number) => void }
): HeroMapHandle {
  let points: Point[] = []
  let length = 0
  let stopLengths: number[] = []
  let stopPositions: [number, number][] = []
  let scale = 1
  let motes: { x: number; y: number; phase: number; speed: number }[] = []
  let lastChip = -2
  let lastStep = -1
  let control: [number, number][] = []

  const build = (width: number, height: number) => {
    scale = width / BASE_WIDTH
    control = MAP_PATH.map(([x, y]) => [x * width, y * height])
    points = []
    length = 0
    const segmentStart: number[] = []
    for (let i = 0; i < control.length - 1; i++) {
      const p0 = control[Math.max(0, i - 1)]
      const p1 = control[i]
      const p2 = control[i + 1]
      const p3 = control[Math.min(control.length - 1, i + 2)]
      segmentStart[i] = length
      for (let j = 0; j < 24; j++) {
        const u = j / 24
        const u2 = u * u
        const u3 = u2 * u
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3)
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)
        if (points.length) length += Math.hypot(x - points[points.length - 1][0], y - points[points.length - 1][1])
        points.push([x, y, length])
      }
    }
    const last = control[control.length - 1]
    length += Math.hypot(last[0] - points[points.length - 1][0], last[1] - points[points.length - 1][1])
    points.push([last[0], last[1], length])
    segmentStart[control.length - 1] = length
    stopLengths = STOP_POINTS.map((point) => segmentStart[point])
    stopPositions = STOP_POINTS.map((point) => control[point])
    motes = Array.from({ length: 42 }, (_, index) => {
      const angle = hash(index) * Math.PI * 2
      const radius = Math.sqrt(hash(index + 99))
      return {
        x: (CITY_AREA.cx + Math.cos(angle) * radius * CITY_AREA.rx) * width,
        y: (CITY_AREA.cy + Math.sin(angle) * radius * CITY_AREA.ry) * height,
        phase: hash(index + 199),
        speed: 6 + hash(index + 199) * 5,
      }
    })
  }

  const at = (distance: number): [number, number] => {
    if (!points.length) return [0, 0]
    if (distance <= 0) return [points[0][0], points[0][1]]
    if (distance >= length) return [points[points.length - 1][0], points[points.length - 1][1]]
    let low = 0
    let high = points.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (points[middle][2] < distance) low = middle
      else high = middle
    }
    const a = points[low]
    const b = points[high]
    const unit = (distance - a[2]) / (b[2] - a[2] || 1)
    return [a[0] + (b[0] - a[0]) * unit, a[1] + (b[1] - a[1]) * unit]
  }

  const dot = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) => {
    if (alpha <= 0.01) return
    context.globalAlpha = Math.min(1, alpha)
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  const stillTime = 1 * (DWELL + MOVE) + 0.4

  return runCanvasLoop(
    canvas,
    (context, _width, _height, time) => {
      if (!points.length) return
      const phase = phaseAt(time)
      const distance = phase.moving
        ? stopLengths[phase.from] + (stopLengths[phase.from + 1] - stopLengths[phase.from]) * phase.u
        : stopLengths[phase.at]

      const chip = phase.moving || phase.at >= 5 ? -1 : phase.at
      if (chip !== lastChip || phase.at !== lastStep) {
        lastChip = chip
        lastStep = phase.at
        opts.onStep?.(chip, phase.at)
      }

      motes.forEach((mote, index) => {
        const progress = (time / mote.speed + mote.phase) % 1
        dot(context, mote.x, mote.y - progress * 70 * scale, (0.8 + mote.phase) * scale, index % 3 ? "#FFFFFF" : "#7FD3F5", Math.sin(progress * Math.PI) * 0.75)
      })

      for (let packet = 0; packet < 4; packet++) {
        const position = at((time * 70 * scale + (packet * length) / 4) % length)
        dot(context, position[0], position[1], 2 * scale + 0.6, "#FFFFFF", 0.55)
      }

      const fade = phase.end ? Math.min(1, phase.endLeft / 0.5) : 1
      const trail = 150 * scale
      for (let item = 0; item <= 22; item++) {
        const fraction = item / 22
        const trailDistance = distance - trail * (1 - fraction)
        if (trailDistance < 0) continue
        const position = at(trailDistance)
        dot(context, position[0], position[1], (0.8 + 2.4 * fraction) * Math.max(0.7, scale), pathColor(trailDistance / length), Math.pow(fraction, 1.5) * 0.95 * fade)
      }

      if (!phase.moving && phase.dwell >= 0 && phase.dwell < 1.3) {
        const position = stopPositions[phase.at]
        const progress = phase.dwell / 1.3
        const color = pathColor(stopLengths[phase.at] / length)
        for (let ripple = 0; ripple < 2; ripple++) {
          const elapsed = Math.max(0, progress - ripple * 0.22)
          if (elapsed <= 0) continue
          context.globalAlpha = (1 - elapsed) * 0.85
          context.strokeStyle = color
          context.lineWidth = 2 * scale + 0.4
          context.beginPath()
          context.ellipse(position[0], position[1], (12 + elapsed * 46) * scale, (6 + elapsed * 23) * scale, 0, 0, Math.PI * 2)
          context.stroke()
        }
      }

      if (phase.end && phase.dwell < 1.4) {
        const progress = phase.dwell / 1.4
        const endPoint = stopPositions[5]
        for (let burst = 0; burst < 26; burst++) {
          const angle = (burst / 26) * Math.PI * 2
          const distanceFromEnd = (10 + easeInOutCubic(progress) * 70) * scale
          dot(context, endPoint[0] + Math.cos(angle) * distanceFromEnd, endPoint[1] + Math.sin(angle) * distanceFromEnd * 0.6 - progress * 12 * scale, (2.4 * (1 - progress) + 0.6) * scale, pathColor(burst / 26), 1 - progress)
        }
      }

      const head = at(distance)
      const headColor = pathColor(distance / length)
      const glow = context.createRadialGradient(head[0], head[1], 0, head[0], head[1], 26 * scale)
      glow.addColorStop(0, "rgba(255,255,255,0.95)")
      glow.addColorStop(0.25, headColor)
      glow.addColorStop(1, "rgba(255,255,255,0)")
      context.globalAlpha = 0.75 * fade
      context.fillStyle = glow
      context.beginPath()
      context.arc(head[0], head[1], 26 * scale, 0, Math.PI * 2)
      context.fill()
      dot(context, head[0], head[1], 4 * scale + 0.8, "#FFFFFF", fade)

      if (opts.debug) {
        context.globalAlpha = 1
        context.font = "600 11px ui-monospace, monospace"
        control.forEach(([x, y], index) => {
          context.fillStyle = "red"
          context.beginPath()
          context.arc(x, y, 4, 0, Math.PI * 2)
          context.fill()
          context.fillText(String(index), x + 6, y - 6)
        })
      }
    },
    { reducedMotion: opts.reducedMotion, stillTime, onResize: build }
  )
}
