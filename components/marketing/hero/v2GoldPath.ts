import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { HERO_ASSET, V2_STATIONS, V2_WAYPOINTS } from "./heroMapPath"
import type { Palette } from "@/components/theme/themes"

type Point = [number, number, number]
type Position = [number, number]
type Ring = { x: number; y: number; rx: number; ry: number; depth: number }
type GoldAssets = { gold: HTMLImageElement }

type Options = {
  reducedMotion?: boolean
  debug?: boolean
  debugPath?: boolean
  image?: HTMLImageElement
  palette?: Palette
  onStep?: (chip: number, step: number) => void
  onFinale?: (active: boolean) => void
}

const GOLD_IMAGE = "/images/marketing/v2/hero-v2-gold.webp"
const RINGS: readonly [number, number, number, number, number][] = [
  [205, 817, 35.5, 20, 12], [475, 672, 35.5, 20, 12], [721, 570.5, 34.5, 19.5, 12],
  [834, 447.5, 33.5, 17, 12], [1051, 388, 32, 17, 12], [1161.5, 272.5, 31.5, 17.5, 11],
]
const TIMING = { start: 0.4, ring: 0.45, segment: 1.1, dwell: 0.7, hold: 2.8, fade: 0.6 } as const
const DRAWN_AT = TIMING.start + TIMING.dwell + 5 * (TIMING.segment + TIMING.dwell)
const LOOP = DRAWN_AT + TIMING.hold + TIMING.fade

let assetsPromise: Promise<GoldAssets> | undefined

function preloadGoldAssets() {
  assetsPromise ??= new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      // Do not begin the sequence with a partially decoded frame. The WebP is
      // pixel-matched with the base map, so this preserves the exact static look.
      void image.decode().then(() => resolve(image)).catch(reject)
    }
    image.onerror = () => reject(new Error(`Could not preload V2 gold map: ${GOLD_IMAGE}`))
    image.src = GOLD_IMAGE
  }).then((gold) => ({ gold }))
  return assetsPromise
}

const easeInOutCubic = (value: number) => (value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2)
const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))

function glow(context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) {
  if (alpha <= 0.01 || radius <= 0) return
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
  gradient.addColorStop(0, color)
  gradient.addColorStop(1, "rgba(0,0,0,0)")
  context.save()
  context.globalAlpha = Math.min(1, alpha)
  context.fillStyle = gradient
  context.beginPath()
  context.arc(x, y, radius, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function imageRect(image: HTMLImageElement | undefined, canvas: HTMLCanvasElement, width: number, height: number) {
  if (!image) return { x: 0, y: 0, width, height }
  const canvasRect = canvas.getBoundingClientRect()
  const rect = image.getBoundingClientRect()
  return { x: rect.left - canvasRect.left, y: rect.top - canvasRect.top, width: rect.width, height: rect.height }
}

function ringPath(context: CanvasRenderingContext2D, ring: Ring, scale: number) {
  context.ellipse(ring.x, ring.y, ring.rx * scale, ring.ry * scale * 1.15, 0, 0, Math.PI * 2)
  context.moveTo(ring.x + ring.rx * scale, ring.y + ring.depth)
  context.ellipse(ring.x, ring.y + ring.depth, ring.rx * scale, ring.ry * scale * 1.15, 0, 0, Math.PI * 2)
  context.rect(ring.x - ring.rx * scale, ring.y, ring.rx * scale * 2, ring.depth)
}

type GoldState = { head: number; stage: number; moving: boolean; ringAlpha: number[]; arrivals: number[]; fade: number; finale: boolean }

function stateAt(seconds: number, stationT: number[], reduced: boolean): GoldState {
  if (reduced) return { head: 1, stage: 5, moving: false, ringAlpha: [1, 1, 1, 1, 1, 1], arrivals: [0, 0, 0, 0, 0, 0], fade: 1, finale: true }
  const loopTime = seconds % LOOP
  const fade = loopTime > DRAWN_AT + TIMING.hold ? clamp(1 - (loopTime - DRAWN_AT - TIMING.hold) / TIMING.fade) : 1
  if (loopTime < TIMING.start) return { head: 0, stage: -1, moving: false, ringAlpha: [0, 0, 0, 0, 0, 0], arrivals: [-1, -1, -1, -1, -1, -1], fade, finale: false }

  const ringAlpha = [clamp((loopTime - TIMING.start) / TIMING.ring), 0, 0, 0, 0, 0]
  const arrivals = [TIMING.start, -1, -1, -1, -1, -1]
  let cursor = TIMING.start + TIMING.dwell
  let stage = 0
  let head = stationT[0]
  let moving = false
  for (let index = 0; index < 5; index++) {
    if (loopTime < cursor) break
    const from = stationT[index]
    const to = stationT[index + 1]
    if (loopTime < cursor + TIMING.segment) {
      head = from + (to - from) * easeInOutCubic((loopTime - cursor) / TIMING.segment)
      moving = true
      break
    }
    const arrived = cursor + TIMING.segment
    ringAlpha[index + 1] = clamp((loopTime - arrived) / TIMING.ring)
    arrivals[index + 1] = arrived
    stage = index + 1
    head = to
    cursor += TIMING.segment + TIMING.dwell
  }
  return { head, stage, moving, ringAlpha, arrivals, fade, finale: stage === 5 && !moving }
}

/** V2 swaps two pixel-matched map images through a path-and-ring mask. */
export function startV2GoldPath(canvas: HTMLCanvasElement, opts: Options): CanvasLoopHandle {
  let assets: GoldAssets | undefined
  let points: Point[] = []
  let totalLength = 0
  let stationT: number[] = []
  let stationPositions: Position[] = []
  let rings: Ring[] = []
  let overlayRect = { x: 0, y: 0, width: 0, height: 0 }
  let k = 1
  let offscreen: HTMLCanvasElement | undefined
  let offscreenContext: CanvasRenderingContext2D | null = null
  let startedAt: number | undefined
  let lastStage = Number.NaN
  let lastFinale = false
  const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)
  const timeParameter = query.get("heroGoldTime")
  const requestedTime = timeParameter === null ? Number.NaN : Number(timeParameter)
  const forcedTime = Number.isFinite(requestedTime) ? Math.max(0, requestedTime) : undefined
  // Test-only visual isolation: the production animation always includes the
  // specified bloom, moving tip and completed-road shine.
  const decorativeOverlays = query.get("heroGoldDecor") !== "off"

  const build = (width: number, height: number) => {
    overlayRect = imageRect(opts.image, canvas, width, height)
    const sx = overlayRect.width / HERO_ASSET.w
    const sy = overlayRect.height / HERO_ASSET.h
    k = sx
    const control = V2_WAYPOINTS.map(([x, y]) => [overlayRect.x + x * sx, overlayRect.y + y * sy] as Position)
    points = []
    totalLength = 0
    for (let index = 0; index < control.length - 1; index++) {
      const p0 = control[Math.max(0, index - 1)]
      const p1 = control[index]
      const p2 = control[index + 1]
      const p3 = control[Math.min(control.length - 1, index + 2)]
      for (let sample = 0; sample < 16; sample++) {
        const t = sample / 16
        const t2 = t * t
        const t3 = t2 * t
        const x = 0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3)
        const y = 0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3)
        if (points.length) totalLength += Math.hypot(x - points[points.length - 1][0], y - points[points.length - 1][1])
        points.push([x, y, totalLength])
      }
    }
    const final = control.at(-1)!
    totalLength += Math.hypot(final[0] - points.at(-1)![0], final[1] - points.at(-1)![1])
    points.push([final[0], final[1], totalLength])
    stationPositions = V2_STATIONS.map((index) => control[index])
    stationT = stationPositions.map((station) => {
      let best = 0
      let distance = Number.POSITIVE_INFINITY
      points.forEach((point, index) => {
        const next = Math.hypot(point[0] - station[0], point[1] - station[1])
        if (next < distance) { best = index; distance = next }
      })
      return points[best][2] / totalLength
    })
    rings = RINGS.map(([x, y, rx, ry, depth]) => ({ x: overlayRect.x + x * sx, y: overlayRect.y + y * sy, rx: rx * sx, ry: ry * sy, depth: depth * sy }))
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    offscreen = document.createElement("canvas")
    offscreen.width = Math.max(1, Math.round(width * dpr))
    offscreen.height = Math.max(1, Math.round(height * dpr))
    offscreenContext = offscreen.getContext("2d")
  }

  const at = (fraction: number): Position => {
    const distance = clamp(fraction) * totalLength
    if (!points.length || distance <= 0) return [points[0]?.[0] ?? 0, points[0]?.[1] ?? 0]
    if (distance >= totalLength) return [points.at(-1)![0], points.at(-1)![1]]
    let low = 0
    let high = points.length - 1
    while (high - low > 1) {
      const middle = (low + high) >> 1
      if (points[middle][2] < distance) low = middle
      else high = middle
    }
    const first = points[low]
    const last = points[high]
    const ratio = (distance - first[2]) / (last[2] - first[2] || 1)
    return [first[0] + (last[0] - first[0]) * ratio, first[1] + (last[1] - first[1]) * ratio]
  }

  const trace = (context: CanvasRenderingContext2D, from: number, to: number) => {
    if (to <= from || !points.length) return false
    const start = at(from)
    const endDistance = clamp(to) * totalLength
    context.beginPath()
    context.moveTo(start[0], start[1])
    for (const point of points) if (point[2] > from * totalLength && point[2] < endDistance) context.lineTo(point[0], point[1])
    const end = at(to)
    context.lineTo(end[0], end[1])
    return true
  }

  const reveal = (context: CanvasRenderingContext2D, state: GoldState) => {
    if (!assets || !offscreen || !offscreenContext || state.fade <= 0.01) return
    const mask = offscreenContext
    const dpr = offscreen.width / Math.max(1, canvas.getBoundingClientRect().width)
    const offWidth = offscreen.width / dpr
    const offHeight = offscreen.height / dpr
    mask.save()
    mask.setTransform(dpr, 0, 0, dpr, 0, 0)
    mask.globalCompositeOperation = "source-over"
    mask.clearRect(0, 0, offWidth, offHeight)
    mask.lineCap = "round"
    mask.lineJoin = "round"
    mask.lineWidth = 76 * k
    mask.strokeStyle = "#FFFFFF"
    if (trace(mask, 0, state.head)) mask.stroke()
    mask.globalCompositeOperation = "destination-out"
    for (const ring of rings) {
      mask.beginPath()
      ringPath(mask, ring, 1.32)
      mask.fill()
    }
    mask.globalCompositeOperation = "source-over"
    state.ringAlpha.forEach((alpha, index) => {
      if (alpha <= 0) return
      mask.save()
      mask.globalAlpha = alpha
      mask.filter = `blur(${8 * k}px)`
      mask.fillStyle = "#FFFFFF"
      mask.beginPath()
      ringPath(mask, rings[index], 1.32)
      mask.fill()
      mask.restore()
    })
    mask.filter = "none"
    mask.globalCompositeOperation = "source-in"
    mask.drawImage(assets.gold, overlayRect.x, overlayRect.y, overlayRect.width, overlayRect.height)
    mask.restore()
    context.save()
    context.globalAlpha = state.fade
    context.drawImage(offscreen, 0, 0, offWidth, offHeight)
    context.restore()
  }

  const loop = runCanvasLoop(canvas, (context, _width, _height, time) => {
    if (!assets || !points.length || !stationT.length) return
    if (startedAt === undefined) startedAt = time
    const seconds = forcedTime ?? (opts.reducedMotion ? 0 : time - startedAt)
    const state = stateAt(seconds, stationT, !!opts.reducedMotion)
    const loopTime = seconds % LOOP
    canvas.dataset.goldReady = "true"
    canvas.dataset.goldTime = seconds.toFixed(2)
    canvas.dataset.goldStage = String(state.stage + 1)
    canvas.dataset.goldMode = "swap"
    if (state.stage !== lastStage) {
      lastStage = state.stage
      opts.onStep?.(state.stage >= 0 && state.stage < 5 ? state.stage : -1, state.stage)
    }
    const finale = state.finale && state.fade > 0.04
    if (finale !== lastFinale) { lastFinale = finale; opts.onFinale?.(finale) }

    reveal(context, state)
    state.ringAlpha.forEach((opacity, index) => {
      const since = loopTime - state.arrivals[index]
      if (!decorativeOverlays || opacity <= 0 || since < 0 || since >= 0.9) return
      const [x, y] = stationPositions[index]
      glow(context, x, y - 4 * k, 70 * k, "rgba(240,199,102,.45)", (1 - since / 0.9) * state.fade)
    })
    if (decorativeOverlays && state.moving && !opts.reducedMotion) {
      const [x, y] = at(state.head)
      glow(context, x, y, 46 * k, "rgba(226,170,64,.75)", state.fade)
      glow(context, x, y, 18 * k, "rgba(255,255,255,.95)", state.fade)
    }
    if (decorativeOverlays && state.finale && state.fade > 0.01) {
      const [x, y] = at(((loopTime - DRAWN_AT) / 2.4) % 1)
      glow(context, x, y, 34 * k, "rgba(255,248,225,.75)", state.fade)
    }
    if (opts.debugPath) {
      context.save(); context.strokeStyle = "rgba(255,0,0,.85)"; context.lineWidth = 1.5
      trace(context, 0, 1); context.stroke(); context.restore()
    }
  }, { reducedMotion: opts.reducedMotion, stillTime: 0, onResize: build })

  void preloadGoldAssets().then((loaded) => { assets = loaded; startedAt = undefined; loop.rebuild() }).catch(() => {
    opts.onStep?.(-1, -1)
    opts.onFinale?.(false)
  })
  return loop
}
