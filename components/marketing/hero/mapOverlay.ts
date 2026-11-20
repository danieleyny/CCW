import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { startV2GoldPath } from "./v2GoldPath"
import { hash, pathColor } from "./heroPalette"
import { CITY_AREA, FOLDER, HERO_ASSET, MAP_PATH, STOP_POINTS, V2_MAP_PATH, V2_STOP_POINTS, V2_WAYPOINTS } from "./heroMapPath"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

type Point = [number, number, number]

const DWELL = 0.9
const MOVE = 1.15
const END = 3.4
const CYCLE = 5 * (DWELL + MOVE) + END
const BASE_WIDTH = 725

const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2)
const easeOutCubic = (value: number) => 1 - Math.pow(1 - Math.max(0, Math.min(1, value)), 3)
const V2_CYCLE = 9

type ContentRect = { x: number; y: number; width: number; height: number }

/** The overlay must use the image's drawn content box, not a design-board
 * assumption. This also keeps future `contain`/`cover` image changes safe. */
export function imageContentRect(image: HTMLImageElement, canvasRect: DOMRect): ContentRect {
  const rect = image.getBoundingClientRect()
  const style = getComputedStyle(image)
  const fit = style.objectFit || "fill"
  if (fit === "fill") return { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top, width: rect.width, height: rect.height }
  const sourceRatio = HERO_ASSET.w / HERO_ASSET.h
  const boxRatio = rect.width / rect.height
  const scale = fit === "cover"
    ? (boxRatio > sourceRatio ? rect.width / HERO_ASSET.w : rect.height / HERO_ASSET.h)
    : (boxRatio > sourceRatio ? rect.height / HERO_ASSET.h : rect.width / HERO_ASSET.w)
  const width = HERO_ASSET.w * scale
  const height = HERO_ASSET.h * scale
  return {
    x: rect.left - canvasRect.left + (rect.width - width) / 2,
    y: rect.top - canvasRect.top + (rect.height - height) / 2,
    width,
    height,
  }
}

type Phase = { from: number; u: number; at: number; dwell: number; moving: boolean; end: boolean; endLeft: number }

function radial(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  if (alpha <= 0.01 || radius <= 0) return
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, "rgba(0,0,0,0)")
  context.globalAlpha = Math.min(1, alpha)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
}

function sparkle(context: CanvasRenderingContext2D, x: number, y: number, radius: number, glow: string, alpha: number) {
  if (alpha <= 0.01 || radius <= 0) return
  context.save()
  context.globalAlpha = alpha
  context.fillStyle = "#FFFFFF"
  context.shadowColor = glow
  context.shadowBlur = 6
  context.beginPath()
  context.moveTo(x, y - radius)
  context.quadraticCurveTo(x, y, x + radius, y)
  context.quadraticCurveTo(x, y, x, y + radius)
  context.quadraticCurveTo(x, y, x - radius, y)
  context.quadraticCurveTo(x, y, x, y - radius)
  context.fill()
  context.restore()
}

function hexA(hex: string, alpha: number) {
  const value = Number.parseInt(hex.slice(1), 16)
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`
}

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
  opts: {
    reducedMotion?: boolean
    debug?: boolean
    debugPath?: boolean
    image?: HTMLImageElement
    palette?: Palette
    onStep?: (chip: number, step: number) => void
    onFinale?: (active: boolean) => void
  }
): HeroMapHandle {
  const palette: Palette = opts.palette ?? V0_PALETTE
  // V2 uses pre-cut bitmap overlays from the exact hero artwork. Keep the
  // legacy vector renderer below untouched for /, /V1, /V3 and /V4.
  if (palette.gold === "#D9B25F") return startV2GoldPath(canvas, { ...opts, palette })
  let points: Point[] = []
  let length = 0
  let stopLengths: number[] = []
  let stopPositions: [number, number][] = []
  let scale = 1
  let motes: { x: number; y: number; phase: number; speed: number }[] = []
  let lastChip = -2
  let lastStep = -1
  let lastFinale = false
  let control: [number, number][] = []
  const isV2Gold = palette.gold === "#D9B25F"
  const routePath = isV2Gold ? V2_MAP_PATH : MAP_PATH
  const routeStops = isV2Gold ? V2_STOP_POINTS : STOP_POINTS
  const samplesPerSegment = isV2Gold ? 16 : 24
  let routeGradient: CanvasGradient | null = null

  const build = (width: number, height: number) => {
    if (isV2Gold) {
      const canvasRect = canvas.getBoundingClientRect()
      const rect = opts.image ? imageContentRect(opts.image, canvasRect) : { x: 0, y: 0, width, height }
      const sx = rect.width / HERO_ASSET.w
      const sy = rect.height / HERO_ASSET.h
      scale = sx
      control = V2_WAYPOINTS.map(([x, y]) => [rect.x + x * sx, rect.y + y * sy])
    } else {
      scale = width / BASE_WIDTH
      control = routePath.map(([x, y]) => [x * width, y * height])
    }
    routeGradient = null
    points = []
    length = 0
    const segmentStart: number[] = []
    for (let i = 0; i < control.length - 1; i++) {
      const p0 = control[Math.max(0, i - 1)]
      const p1 = control[i]
      const p2 = control[i + 1]
      const p3 = control[Math.min(control.length - 1, i + 2)]
      segmentStart[i] = length
      for (let j = 0; j < samplesPerSegment; j++) {
        const u = j / samplesPerSegment
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
    stopLengths = routeStops.map((point) => segmentStart[point])
    stopPositions = routeStops.map((point) => control[point])
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

  /** Trace the visible portion of the sampled Catmull-Rom path. Keeping this
   * shared by casing, glow, and core ensures that the three layers never
   * diverge during a stage transition. */
  const tracePath = (context: CanvasRenderingContext2D, distance: number) => {
    const end = Math.max(0, Math.min(length, distance))
    if (!points.length || end <= 0) return false
    context.beginPath()
    context.moveTo(points[0][0], points[0][1])
    for (let index = 1; index < points.length; index++) {
      const point = points[index]
      if (point[2] <= end) {
        context.lineTo(point[0], point[1])
        continue
      }
      const previous = points[index - 1]
      const unit = (end - previous[2]) / (point[2] - previous[2] || 1)
      context.lineTo(previous[0] + (point[0] - previous[0]) * unit, previous[1] + (point[1] - previous[1]) * unit)
      break
    }
    return true
  }

  const traceRange = (context: CanvasRenderingContext2D, startDistance: number, endDistance: number) => {
    const start = Math.max(0, Math.min(length, startDistance))
    const end = Math.max(start, Math.min(length, endDistance))
    if (!points.length || end <= start) return false
    const first = at(start)
    context.beginPath()
    context.moveTo(first[0], first[1])
    for (const point of points) if (point[2] > start && point[2] < end) context.lineTo(point[0], point[1])
    const last = at(end)
    context.lineTo(last[0], last[1])
    return true
  }

  const stillTime = 1 * (DWELL + MOVE) + 0.4

  return runCanvasLoop(
    canvas,
    (context, width, height, time) => {
      if (!points.length) return
      const phase = phaseAt(time)
      const v2Time = time % V2_CYCLE
      const v2Head = opts.reducedMotion ? 1 : easeOutCubic(Math.min(1, v2Time / 3.4))
      const v2Fade = opts.reducedMotion || v2Time < 8.3 ? 1 : Math.max(0, (8.9 - v2Time) / 0.6)
      const v2Distance = length * v2Head
      const distance = isV2Gold ? v2Distance : phase.moving
        ? stopLengths[phase.from] + (stopLengths[phase.from + 1] - stopLengths[phase.from]) * phase.u
        : stopLengths[phase.at]
      const drawnDistance = opts.reducedMotion ? length : distance

      const v2Stage = stopLengths.reduce((stage, stop, index) => drawnDistance >= stop ? index : stage, 0)
      const chip = isV2Gold ? (v2Head >= 1 ? -1 : Math.min(4, v2Stage)) : phase.moving || phase.at >= 5 ? -1 : phase.at
      const activeStep = isV2Gold ? v2Stage : phase.at
      if (chip !== lastChip || activeStep !== lastStep) {
        lastChip = chip
        lastStep = activeStep
        opts.onStep?.(chip, activeStep)
      }

      const light = palette === V0_PALETTE ? "#FFFFFF" : palette.darkInk

      // The visual route is deliberately drawn before the moving particles:
      // a dark road casing separates it from the detailed city art, a soft
      // glow gives every colorway contrast, and the core is the actual route.
      const coreWidth = Math.max(2.4, (isV2Gold ? 15 : 3) * scale)
      const pathGlow = palette.pathGlow ?? "rgba(91,108,255,.40)"
      const casing = palette.path ? (palette.warm === "#D6B05A" ? "rgba(10,10,10,.45)" : "rgba(10,15,30,.28)") : "rgba(10,15,30,.28)"
      const [startX, startY] = control[0]
      const [endX, endY] = control[control.length - 1]
      if (!routeGradient) {
        routeGradient = context.createLinearGradient(startX, startY, endX, endY)
        routeGradient.addColorStop(0, pathColor(0, palette))
        routeGradient.addColorStop(1, pathColor(1, palette))
      }

      context.save()
      context.lineCap = "round"
      context.lineJoin = "round"
      if (isV2Gold) {
        // The V2 road is a single continuous centerline laid directly over the
        // road painted into the 1448×1086 asset. No synthetic station shapes.
        context.globalAlpha = 0.22
        context.lineWidth = 22 * scale
        context.strokeStyle = routeGradient
        if (tracePath(context, length)) context.stroke()
        context.globalAlpha = 0.18 * v2Fade
        context.lineWidth = 46 * scale
        context.strokeStyle = routeGradient
        const v2Context = context as CanvasRenderingContext2D & { filter?: string }
        if (typeof v2Context.filter === "string") v2Context.filter = "blur(10px)"
        else { context.shadowBlur = 16 * scale; context.shadowColor = "rgba(226,170,64,.45)" }
        if (tracePath(context, drawnDistance)) context.stroke()
        v2Context.filter = "none"
        context.shadowBlur = 0
        context.globalAlpha = 0.12 * v2Fade
        context.lineWidth = 28 * scale
        context.strokeStyle = "rgb(10,18,40)"
        if (tracePath(context, drawnDistance)) context.stroke()
        context.globalAlpha = v2Fade
        context.lineWidth = 22 * scale
        context.strokeStyle = routeGradient
        if (tracePath(context, drawnDistance)) context.stroke()
        context.globalAlpha = 0.55
        context.lineWidth = 5 * scale
        context.strokeStyle = "rgba(255,255,255,.55)"
        if (tracePath(context, drawnDistance)) context.stroke()
      } else {
        context.globalAlpha = 0.98
        context.lineWidth = coreWidth + 4 * scale
        context.strokeStyle = casing
        if (tracePath(context, drawnDistance)) context.stroke()
        context.globalAlpha = 0.78
        context.lineWidth = coreWidth * 3
        context.strokeStyle = pathGlow
        const canvasContext = context as CanvasRenderingContext2D & { filter?: string }
        if (typeof canvasContext.filter === "string") canvasContext.filter = "blur(6px)"
        else { context.shadowBlur = 14; context.shadowColor = pathGlow }
        if (tracePath(context, drawnDistance)) context.stroke()
        canvasContext.filter = "none"
        context.shadowBlur = 0
        context.globalAlpha = 1
        context.lineWidth = coreWidth
        context.strokeStyle = routeGradient
        if (tracePath(context, drawnDistance)) context.stroke()
      }
      context.restore()
      if (!isV2Gold) motes.forEach((mote, index) => {
        const progress = (time / mote.speed + mote.phase) % 1
        dot(context, mote.x, mote.y - progress * 70 * scale, (0.8 + mote.phase) * scale, index % 3 ? light : palette === V0_PALETTE ? "#7FD3F5" : isV2Gold ? "#9DB4DE" : palette.phase[0], Math.sin(progress * Math.PI) * 0.75)
      })

      for (let packet = 0; !isV2Gold && packet < 4; packet++) {
        const position = at((time * 70 * scale + (packet * length) / 4) % length)
        dot(context, position[0], position[1], 2 * scale + 0.6, light, 0.55)
      }

      const fade = phase.end ? Math.min(1, phase.endLeft / 0.8) : 1
      const trail = 150 * scale
      for (let item = 0; !isV2Gold && item <= 22; item++) {
        const fraction = item / 22
        const trailDistance = distance - trail * (1 - fraction)
        if (trailDistance < 0) continue
        const position = at(trailDistance)
        dot(context, position[0], position[1], (0.8 + 2.4 * fraction) * Math.max(0.7, scale), pathColor(trailDistance / length, palette), Math.pow(fraction, 1.5) * 0.95 * fade)
      }

      if (!isV2Gold && !phase.moving && phase.dwell >= 0 && phase.dwell < 1.3) {
        const position = stopPositions[phase.at]
        const progress = phase.dwell / 1.3
        const color = pathColor(stopLengths[phase.at] / length, palette)
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

      if (isV2Gold) stopPositions.forEach((position, index) => {
        const arrival = Math.max(0, Math.min(1, (v2Head - stopLengths[index] / length) / 0.25))
        if (arrival) radial(context, position[0], position[1], 46 * scale, "rgba(240,199,102,.55)", 0.5 * Math.min(1, arrival / 0.25) * v2Fade)
      })
      if (!isV2Gold) stopPositions.forEach((position, index) => {
        const reached = drawnDistance >= stopLengths[index]
        context.globalAlpha = reached ? 1 : 0.5
        context.fillStyle = "#FFFFFF"
        context.beginPath()
        context.ellipse(position[0], position[1], 24 * scale, 12 * scale, 0, 0, Math.PI * 2)
        context.fill()
        context.strokeStyle = pathColor(stopLengths[index] / length, palette)
        context.lineWidth = 7 * scale
        context.stroke()
        if (reached) {
          radial(context, position[0], position[1], 70 * scale, pathColor(stopLengths[index] / length, palette), opts.reducedMotion ? 0.22 : 0.45)
        }
      })

      // R2 · Glow & Lift finale — an arrival, not a burst.
      const atFinale = isV2Gold ? v2Head >= 1 : phase.end
      const finaleOn = opts.debug || (atFinale && (isV2Gold ? v2Fade > 0.05 : phase.endLeft > 0.05))
      if (finaleOn !== lastFinale) {
        lastFinale = finaleOn
        opts.onFinale?.(finaleOn)
      }

      if (atFinale) {
        const elapsed = isV2Gold ? Math.max(0, v2Time - 3.4) : phase.dwell
        const out = isV2Gold ? v2Fade : phase.endLeft < 0.8 ? phase.endLeft / 0.8 : 1
        const endPoint = stopPositions[5]
        const glowX = FOLDER.glow[0] * width
        const glowY = FOLDER.glow[1] * height

        if (elapsed < 0.5) radial(context, endPoint[0], endPoint[1], 30 * scale, "rgba(255,255,255,0.8)", 1 - elapsed / 0.5)

        const shimmer = elapsed / 0.9
        if (shimmer < 1.2) {
          const start = Math.max(0, shimmer - 0.18) * length
          const end = Math.min(1, shimmer) * length
          for (let segment = 0; segment < 40; segment++) {
            const startPoint = at(start + (end - start) * (segment / 40))
            const endPoint = at(start + (end - start) * ((segment + 1) / 40))
            context.globalAlpha = 0.35
            context.strokeStyle = pathColor((start + (end - start) * ((segment + 1) / 40)) / length, palette)
            context.lineWidth = 3 * scale
            context.lineCap = "round"
            context.beginPath()
            context.moveTo(startPoint[0], startPoint[1])
            context.lineTo(endPoint[0], endPoint[1])
            context.stroke()
          }
        }

        radial(context, glowX, glowY, isV2Gold ? 0.26 * width : 0.117 * width, isV2Gold ? "rgba(240,199,102,.38)" : hexA(palette.warm, palette.warmAlpha), Math.min(1, elapsed / 0.7) * out)

        for (let index = 0; index < 7; index++) {
          const twinkle = (elapsed - 0.4 - index * 0.22) / 1.1
          if (twinkle < 0 || twinkle > 1) continue
          const seed = (index * 0.618) % 1
          const x = glowX + (seed - 0.5) * 0.145 * width
          const y = glowY - 0.12 * height + (((index * 37) % 120) / 920) * height
          const pulse = Math.sin(twinkle * Math.PI)
          sparkle(context, x, y, 4.2 * scale * pulse, pathColor(seed, palette), 0.85 * pulse * out)
        }

        if (isV2Gold && !opts.reducedMotion) {
          const packet = ((elapsed % 2.4) / 2.4)
          const packetEnd = length * (0.92 + 0.08 * packet)
          const packetStart = Math.max(length * 0.92, packetEnd - length * 0.08)
          context.save()
          context.globalAlpha = 0.5 * out
          context.lineCap = "round"
          context.lineJoin = "round"
          context.strokeStyle = "#FFFFFF"
          context.lineWidth = 5 * scale
          if (traceRange(context, packetStart, packetEnd)) context.stroke()
          const packetPoint = at(packetEnd)
          radial(context, packetPoint[0], packetPoint[1], 36 * scale, "rgba(255,255,255,.95)", 0.45 * out)
          context.restore()
        }
      }

      const head = at(drawnDistance)
      const headColor = pathColor(drawnDistance / length, palette)
      const headRadius = (atFinale ? 18 : isV2Gold ? 50 : 26) * scale
      const glow = context.createRadialGradient(head[0], head[1], 0, head[0], head[1], headRadius)
      glow.addColorStop(0, isV2Gold ? "rgba(255,255,255,.95)" : palette === V0_PALETTE ? "rgba(255,255,255,0.95)" : palette.darkInk)
      glow.addColorStop(0.25, isV2Gold ? "rgba(226,170,64,.8)" : headColor)
      glow.addColorStop(1, "rgba(255,255,255,0)")
      context.globalAlpha = opts.reducedMotion ? 0 : 0.75 * (isV2Gold ? v2Fade : fade)
      context.fillStyle = glow
      context.beginPath()
      context.arc(head[0], head[1], headRadius, 0, Math.PI * 2)
      context.fill()
      dot(context, head[0], head[1], 4 * scale + 0.8, "#FFFFFF", opts.reducedMotion ? 0 : isV2Gold ? v2Fade : fade)

      if (opts.debug || opts.debugPath) {
        context.globalAlpha = 1
        context.font = '600 11px "IBM Plex Mono", monospace'
        control.forEach(([x, y], index) => {
          context.fillStyle = "red"
          context.beginPath()
          context.arc(x, y, 4, 0, Math.PI * 2)
          context.fill()
          context.fillText(String(index), x + 6, y - 6)
        })
        context.globalAlpha = 1
        context.lineWidth = 1.5
        if (opts.debugPath) {
          context.strokeStyle = "rgba(255,0,0,.85)"
          if (tracePath(context, length)) context.stroke()
        }
        if (opts.debug) {
          context.strokeStyle = "#00E5FF"
          context.strokeRect(FOLDER.liftBox.x * width, FOLDER.liftBox.y * height, FOLDER.liftBox.w * width, FOLDER.liftBox.h * height)
          dot(context, FOLDER.glow[0] * width, FOLDER.glow[1] * height, 4, "#F6D74A", 1)
          dot(context, FOLDER.chip[0] * width, FOLDER.chip[1] * height, 4, "#43D97B", 1)
        }
      }
    },
    { reducedMotion: opts.reducedMotion, stillTime, onResize: build }
  )
}
