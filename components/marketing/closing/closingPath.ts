import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

let PALETTE = [[47, 168, 238], [91, 108, 255], [138, 91, 234], [194, 79, 201], [238, 94, 140], [245, 154, 74]]
const V0_BURST_RINGS = ["#8FA8FF", "#E58CC8", "#F5B27A"]
const V0_LABEL_DIM = "#8A99A6"
const STATIONS = [0.14, 0.32, 0.5, 0.68, 0.86]
const LABELS = ["QUALIFY", "TRAIN", "ASSEMBLE", "REVIEW", "YOU SUBMIT"]
export const TRAVEL = 3.7
export const CELEBRATE = 2.3
export const REST = 3
export const CYCLE = TRAVEL + CELEBRATE + REST
export const BURST: "first" | "every" = "first"

type Point = [number, number]
type Spark = { x: number; y: number; vx: number; vy: number; radius: number; life: number; color: number; streak: boolean }
type Star = { x: number; y: number; delay: number; radius: number; color: number }
type V2BurstParticle = { angle: number; distance: number; delay: number; radius: number; color: string; streak: boolean }
type ClosingOptions = { reducedMotion: boolean; mobile: () => boolean; monoFont: string; palette?: Palette; section?: HTMLElement }

const v2Gold = "#D9B25F"
const v2Light = "#F0D58C"
export const V2_TRAVEL = 3.4
export const V2_CELEBRATE = 1.4
export const V2_HOLD = 1.4
export const V2_RESET = 0.6
export const V2_CYCLE = V2_TRAVEL + V2_CELEBRATE + V2_HOLD + V2_RESET

export function getV2ClosingFrame(time: number, reducedMotion = false) {
  if (reducedMotion) return { cycle: 0, localTime: V2_TRAVEL, head: 1, pathAlpha: 1, celebrating: false, celebrationTime: 0 }
  const safeTime = Math.max(0, time)
  const cycle = Math.floor(safeTime / V2_CYCLE)
  const localTime = safeTime % V2_CYCLE
  const travelProgress = Math.min(1, localTime / V2_TRAVEL)
  const head = 1 - Math.pow(1 - travelProgress, 3)
  const celebrationTime = localTime - V2_TRAVEL
  const celebrating = celebrationTime >= 0 && celebrationTime < V2_CELEBRATE
  const fadeStart = V2_TRAVEL + V2_CELEBRATE + V2_HOLD
  const pathAlpha = localTime < fadeStart ? 1 : Math.max(0, 1 - (localTime - fadeStart) / V2_RESET)
  return { cycle, localTime, head, pathAlpha, celebrating, celebrationTime }
}

function cubic(a: Point, b: Point, c: Point, d: Point, t: number): Point {
  const u = 1 - t
  return [u ** 3 * a[0] + 3 * u ** 2 * t * b[0] + 3 * u * t ** 2 * c[0] + t ** 3 * d[0], u ** 3 * a[1] + 3 * u ** 2 * t * b[1] + 3 * u * t ** 2 * c[1] + t ** 3 * d[1]]
}

function rectContains(rect: DOMRect, point: Point, padding = 12) {
  return point[0] >= rect.left - padding && point[0] <= rect.right + padding && point[1] >= rect.top - padding && point[1] <= rect.bottom + padding
}

/** V2 is intentionally independent: its road is derived from the current
 * layout, not from decorative hard-coded coordinates. */
function startV2ClosingPath(canvas: HTMLCanvasElement, anchor: HTMLElement, options: ClosingOptions): CanvasLoopHandle {
  anchor.dataset.pathMode = "v2"
  let points: Point[] = []
  let lengths: number[] = []
  let total = 1
  let button = { x: 0, y: 0, width: 0, height: 0 }
  let burstParticles: V2BurstParticle[] = []
  let lastPulse = -1

  const at = (fraction: number): Point => {
    const target = Math.max(0, Math.min(1, fraction)) * total
    let index = lengths.findIndex((value) => value >= target)
    if (index < 0) index = points.length - 1
    return points[index] ?? [0, 0]
  }

  const build = (width: number, height: number) => {
    const canvasRect = canvas.getBoundingClientRect()
    const buttonRect = anchor.getBoundingClientRect()
    const section = options.section
    button = { x: buttonRect.left - canvasRect.left, y: buttonRect.top - canvasRect.top, width: buttonRect.width, height: buttonRect.height }
    const mobile = options.mobile()
    const start: Point = mobile ? [-10, height * 0.92] : [-20, height * 0.86]
    const end: Point = mobile ? [button.x + button.width / 2, button.y + button.height + 18] : [button.x - 14, button.y + button.height / 2]
    const lede = section?.querySelector<HTMLElement>("[data-closing-lede]")?.getBoundingClientRect()
    const title = section?.querySelector<HTMLElement>("h2")?.getBoundingClientRect()
    const blockers = [lede, title].filter((rect): rect is DOMRect => Boolean(rect)).map((rect) => new DOMRect(rect.left - canvasRect.left, rect.top - canvasRect.top, rect.width, rect.height))
    const textBottom = Math.max(0, ...blockers.map((rect) => rect.bottom + 40))
    let c1: Point = mobile ? [width * 0.35, height * 0.98] : [width * 0.4, Math.max(height * 0.92, textBottom + 120)]
    let c2: Point = mobile ? [width * 0.62, end[1] + 120] : [end[0] - width * 0.14, end[1] + height * 0.22]
    for (let attempt = 0; attempt < 5; attempt++) {
      const sample = Array.from({ length: 61 }, (_, index) => cubic(start, c1, c2, end, index / 60))
      if (!sample.some((point) => blockers.some((rect) => rectContains(rect, point)))) break
      c1 = [c1[0], c1[1] + 24]
      c2 = [c2[0], c2[1] + 24]
    }
    points = Array.from({ length: 601 }, (_, index) => cubic(start, c1, c2, end, index / 600))
    lengths = points.map((point, index) => index ? (lengths[index - 1] ?? 0) + Math.hypot(point[0] - points[index - 1][0], point[1] - points[index - 1][1]) : 0)
    total = lengths.at(-1) || 1
    const random = seeded(29)
    const burstColors = [v2Gold, v2Light, "#FFFFFF", "#8EA0C2"]
    burstParticles = Array.from({ length: mobile ? 26 : 38 }, (_, index) => ({
      angle: random() * Math.PI * 2,
      distance: (mobile ? 28 : 38) + random() * (mobile ? 42 : 64),
      delay: random() * 0.22,
      radius: 1.2 + random() * 2.1,
      color: burstColors[Math.floor(random() * burstColors.length)] ?? v2Light,
      streak: index % 4 === 0,
    }))
  }

  const dot = (context: CanvasRenderingContext2D, point: Point, radius: number, alpha: number) => {
    context.globalAlpha = alpha
    context.fillStyle = v2Gold
    context.beginPath(); context.arc(point[0], point[1], radius, 0, Math.PI * 2); context.fill()
  }

  const setPulse = (pulseWindow: number) => {
    if (pulseWindow === lastPulse) return
    lastPulse = pulseWindow
    anchor.dataset.pulsed = "true"
    anchor.dataset.celebrate = `v2-${pulseWindow}`
    window.setTimeout(() => { if (anchor.dataset.celebrate === `v2-${pulseWindow}`) delete anchor.dataset.celebrate }, 1000)
  }

  const drawBurst = (context: CanvasRenderingContext2D, elapsed: number) => {
    const centerX = button.x + button.width / 2
    const centerY = button.y + button.height / 2
    const bloom = Math.max(0, 1 - elapsed / 0.95)
    if (bloom > 0) {
      const glow = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(button.width, 180) * 0.8)
      glow.addColorStop(0, `rgba(240,213,140,${0.28 * bloom})`)
      glow.addColorStop(0.48, `rgba(217,178,95,${0.16 * bloom})`)
      glow.addColorStop(1, "rgba(217,178,95,0)")
      context.globalAlpha = 1
      context.fillStyle = glow
      context.beginPath()
      context.arc(centerX, centerY, Math.max(button.width, 180) * 0.8, 0, Math.PI * 2)
      context.fill()
    }
    for (let index = 0; index < 3; index++) {
      const progress = (elapsed - index * 0.12) / 0.82
      if (progress < 0 || progress > 1) continue
      const eased = 1 - Math.pow(1 - progress, 3)
      const offset = 4 + eased * (22 + index * 7)
      context.globalAlpha = 0.72 * (1 - progress)
      context.strokeStyle = index === 1 ? v2Light : v2Gold
      context.lineWidth = 2.4 - progress * 1.6
      context.beginPath()
      context.roundRect(button.x - offset, button.y - offset, button.width + offset * 2, button.height + offset * 2, 15 + offset)
      context.stroke()
    }
    for (const particle of burstParticles) {
      const progress = (elapsed - particle.delay) / 0.92
      if (progress < 0 || progress > 1) continue
      const eased = 1 - Math.pow(1 - progress, 3)
      const edgeX = centerX + Math.cos(particle.angle) * (button.width / 2 + 5)
      const edgeY = centerY + Math.sin(particle.angle) * (button.height / 2 + 5)
      const x = edgeX + Math.cos(particle.angle) * particle.distance * eased
      const y = edgeY + Math.sin(particle.angle) * particle.distance * eased + 8 * progress * progress
      const alpha = Math.pow(1 - progress, 1.25)
      context.globalAlpha = alpha
      context.fillStyle = particle.color
      context.strokeStyle = particle.color
      context.lineCap = "round"
      if (particle.streak) {
        const tail = Math.max(0, eased - 0.15)
        context.lineWidth = particle.radius * 0.75
        context.beginPath()
        context.moveTo(edgeX + Math.cos(particle.angle) * particle.distance * tail, edgeY + Math.sin(particle.angle) * particle.distance * tail)
        context.lineTo(x, y)
        context.stroke()
      } else if (progress > 0.25 && Math.round(particle.distance) % 3 === 0) {
        const size = particle.radius * (1 - progress * 0.4) * 2.2
        context.save()
        context.shadowColor = particle.color
        context.shadowBlur = 8
        context.beginPath()
        context.moveTo(x, y - size)
        context.quadraticCurveTo(x, y, x + size, y)
        context.quadraticCurveTo(x, y, x, y + size)
        context.quadraticCurveTo(x, y, x - size, y)
        context.quadraticCurveTo(x, y, x, y - size)
        context.fill()
        context.restore()
      } else {
        context.beginPath()
        context.arc(x, y, particle.radius * (1 - progress * 0.45), 0, Math.PI * 2)
        context.fill()
      }
    }
  }

  let built = false
  return runCanvasLoop(canvas, (context, width, height, time) => {
    if (!built) { build(width, height); built = true }
    const mobile = options.mobile()
    const frame = getV2ClosingFrame(time, options.reducedMotion)
    const { head, pathAlpha } = frame
    const spacing = mobile ? 7 : 9
    const count = Math.ceil(total / spacing)
    context.save()
    context.globalAlpha = .9 * pathAlpha
    context.strokeStyle = v2Gold
    context.lineWidth = mobile ? 2.6 : 3
    context.lineCap = "round"
    context.setLineDash([.1, spacing])
    context.beginPath()
    const visible = Math.max(1, Math.floor(points.length * head))
    context.moveTo(points[0][0], points[0][1])
    for (let index = 1; index < visible; index++) context.lineTo(points[index][0], points[index][1])
    context.stroke()
    context.restore()
    for (let index = 0; index <= count; index++) {
      const fraction = index / count
      if (fraction > head) break
      dot(context, at(fraction), mobile ? 1.8 : 2.1, (0.48 + fraction * 0.5) * pathAlpha)
    }
    const markers = mobile ? [0.24, 0.52, 0.78] : STATIONS
    for (const [index, fraction] of markers.entries()) {
      if (fraction > head) continue
      const point = at(fraction)
      context.globalAlpha = 0.9 * pathAlpha; context.strokeStyle = v2Light; context.lineWidth = 1
      context.beginPath(); context.arc(point[0], point[1], mobile ? 3 : 4, 0, Math.PI * 2); context.stroke()
      dot(context, point, mobile ? 1.1 : 1.4, pathAlpha)
      if (!mobile) {
        context.globalAlpha = 0.88 * pathAlpha; context.fillStyle = "#8E98AA"; context.font = `500 11px ${options.monoFont}`; context.textAlign = "center"
        context.fillText(`0${index + 1} ${LABELS[index]}`, point[0], point[1] + 24)
      }
    }
    if (!options.reducedMotion && head > 0 && head < 1) {
      for (let index = 0; index < 9; index++) {
        const tail = head - index * 0.009
        if (tail < 0) break
        const tailPoint = at(tail)
        context.globalAlpha = (1 - index / 9) * 0.88
        context.fillStyle = index < 3 ? "#FFFFFF" : v2Light
        context.beginPath()
        context.arc(tailPoint[0], tailPoint[1], 3.7 - index * 0.32, 0, Math.PI * 2)
        context.fill()
      }
    }
    if (frame.celebrating) {
      setPulse(frame.cycle)
      drawBurst(context, frame.celebrationTime)
    }
    context.globalAlpha = 1
  }, { reducedMotion: options.reducedMotion, stillTime: V2_TRAVEL, rootMargin: "200px 0px", onResize: (width, height) => { if (width && height) { build(width, height); built = true } } })
}

export function mix(fraction: number) {
  const f = Math.max(0, Math.min(1, fraction))
  const scaled = f * 5
  const index = Math.min(4, Math.floor(scaled))
  const amount = scaled - index
  const from = PALETTE[index]
  const to = PALETTE[index + 1]
  return `rgb(${Math.round(from[0] + (to[0] - from[0]) * amount)},${Math.round(from[1] + (to[1] - from[1]) * amount)},${Math.round(from[2] + (to[2] - from[2]) * amount)})`
}

function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

export function startClosingPath(canvas: HTMLCanvasElement, anchor: HTMLElement, options: ClosingOptions): CanvasLoopHandle {
  const palette: Palette = options.palette ?? V0_PALETTE
  if (palette.gold === v2Gold) return startV2ClosingPath(canvas, anchor, options)
  PALETTE = (palette === V0_PALETTE
    ? ["#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C", "#F59A4A"]
    : palette.gold && palette.ice
      ? [palette.gold, palette.gold, palette.gold, palette.gold, palette.gold, palette.gold]
      : [...palette.phaseDark, palette.phaseDark[4]]).map((hex) => {
    const value = hex.replace("#", "")
    return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
  })
  let points: Point[] = []
  let lengths: number[] = []
  let total = 1
  let button = { x: 0, y: 0, width: 0, height: 0 }
  let sparks: Spark[] = []
  let stars: Star[] = []
  let celebrated: "" | "full" | "light" = ""

  const at = (fraction: number): Point => {
    const target = fraction * total
    let low = 0
    let high = lengths.length - 1
    while (low < high) {
      const middle = (low + high) >> 1
      if (lengths[middle] < target) low = middle + 1
      else high = middle
    }
    return points[low] ?? [0, 0]
  }

  const build = (width: number, height: number) => {
    const canvasRect = canvas.getBoundingClientRect()
    const anchorRect = anchor.getBoundingClientRect()
    button = { x: anchorRect.left - canvasRect.left, y: anchorRect.top - canvasRect.top, width: anchorRect.width, height: anchorRect.height }
    const control: Point[] = options.mobile()
      ? [[0, height * 0.5], [width * 0.62, height * 0.4], [width * 1.08, height * 0.66], [button.x + button.width + 14, button.y + button.height / 2]]
      : [[0, height * 0.86], [width * 0.36, height * 1.02], [width * 0.52, height * 0.5], [button.x - 16, button.y + button.height / 2]]

    points = []
    lengths = [0]
    for (let index = 0; index <= 600; index++) {
      const u = index / 600
      const v = 1 - u
      points.push([
        v * v * v * control[0][0] + 3 * v * v * u * control[1][0] + 3 * v * u * u * control[2][0] + u * u * u * control[3][0],
        v * v * v * control[0][1] + 3 * v * v * u * control[1][1] + 3 * v * u * u * control[2][1] + u * u * u * control[3][1],
      ])
      if (index) lengths.push(lengths[index - 1] + Math.hypot(points[index][0] - points[index - 1][0], points[index][1] - points[index - 1][1]))
    }
    total = lengths.at(-1) || 1

    const random = seeded(11)
    const perimeter = 2 * (button.width + button.height)
    const centerX = button.x + button.width / 2
    const centerY = button.y + button.height / 2
    sparks = Array.from({ length: 64 }, (_, index) => {
      const point = random() * perimeter
      let x: number; let y: number; let normalX: number; let normalY: number
      if (point < button.width) { x = button.x + point; y = button.y; normalX = 0; normalY = -1 }
      else if (point < button.width + button.height) { x = button.x + button.width; y = button.y + point - button.width; normalX = 1; normalY = 0 }
      else if (point < 2 * button.width + button.height) { x = button.x + button.width - (point - button.width - button.height); y = button.y + button.height; normalX = 0; normalY = 1 }
      else { x = button.x; y = button.y + button.height - (point - 2 * button.width - button.height); normalX = -1; normalY = 0 }
      const speed = 70 + random() * 150
      const tangent = (random() - 0.5) * 90
      return { x, y, vx: normalX * speed + normalY * tangent + (x - centerX) * 0.25, vy: normalY * speed + normalX * tangent + (y - centerY) * 0.6, radius: 1 + random() * 1.8, life: 0.9 + random() * 0.8, color: random(), streak: index % 4 === 0 }
    })
    stars = Array.from({ length: 11 }, (_, index) => {
      const above = random() < 0.5
      let x = button.x + random() * button.width
      let y = above ? button.y - 14 - random() * 34 : button.y + button.height + 14 + random() * 30
      if (index % 3 === 0) { x = random() < 0.5 ? button.x - 16 - random() * 30 : button.x + button.width + 16 + random() * 30; y = button.y + random() * button.height }
      return { x, y, delay: random() * 0.7, radius: 5 + random() * 6, color: random() }
    })
  }

  const dot = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) => {
    if (alpha <= 0.01) return
    context.globalAlpha = Math.min(1, alpha)
    context.fillStyle = color
    context.beginPath()
    context.arc(x, y, radius, 0, Math.PI * 2)
    context.fill()
  }

  const setCelebration = (value: "" | "full" | "light") => {
    if (value === celebrated) return
    celebrated = value
    if (value) anchor.dataset.celebrate = value
    else delete anchor.dataset.celebrate
  }

  const drawBurst = (context: CanvasRenderingContext2D, elapsed: number, full: boolean) => {
    const { x, y, width, height } = button
    const centerX = x + width / 2
    const centerY = y + height / 2
    const bloom = Math.max(0, 1 - elapsed / 1.1)
    if (bloom) {
      const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width * 0.9)
      const burstPrimary = palette === V0_PALETTE ? "162,79,217" : palette.phaseDark[2].match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)).join(",")
      const burstSecondary = palette === V0_PALETTE ? "91,108,255" : palette.phaseDark[1].match(/[\da-f]{2}/gi)?.map((part) => parseInt(part, 16)).join(",")
      gradient.addColorStop(0, `rgba(${burstPrimary},${0.35 * bloom})`)
      gradient.addColorStop(0.5, `rgba(${burstSecondary},${0.18 * bloom})`)
      gradient.addColorStop(1, "rgba(0,0,0,0)")
      context.globalAlpha = 1; context.fillStyle = gradient; context.beginPath(); context.arc(centerX, centerY, width * 0.9, 0, Math.PI * 2); context.fill()
    }
    for (const [index, color] of (palette === V0_PALETTE ? V0_BURST_RINGS : [palette.phaseDark[0], palette.phaseDark[3], palette.phaseDark[4]]).entries()) {
      const amount = (elapsed - index * 0.16) / 0.9
      if (amount < 0 || amount > 1) continue
      const offset = 4 + (1 - Math.pow(1 - amount, 3)) * 34
      context.globalAlpha = 0.7 * (1 - amount); context.strokeStyle = color; context.lineWidth = 2 * (1 - amount) + 0.4
      context.beginPath(); context.roundRect(x - offset, y - offset, width + offset * 2, height + offset * 2, 14 + offset); context.stroke()
    }
    if (!full) return
    const drag = 3.2
    for (const spark of sparks) {
      if (elapsed > spark.life) continue
      const amount = elapsed / spark.life
      const travelled = (1 - Math.exp(-drag * elapsed)) / drag
      const x2 = spark.x + spark.vx * travelled
      const y2 = spark.y + spark.vy * travelled + 22 * elapsed * elapsed
      const alpha = Math.pow(1 - amount, 1.4)
      if (spark.streak) {
        const before = Math.max(0, elapsed - 0.05)
        const beforeDistance = (1 - Math.exp(-drag * before)) / drag
        context.globalAlpha = alpha; context.strokeStyle = mix(spark.color); context.lineWidth = spark.radius * 0.9; context.lineCap = "round"
        context.beginPath(); context.moveTo(spark.x + spark.vx * beforeDistance, spark.y + spark.vy * beforeDistance + 22 * before * before); context.lineTo(x2, y2); context.stroke()
      } else dot(context, x2, y2, spark.radius * (1 - amount * 0.5), mix(spark.color), alpha)
    }
    for (const star of stars) {
      const amount = (elapsed - star.delay) / 0.75
      if (amount < 0 || amount > 1) continue
      const radius = star.radius * Math.sin(amount * Math.PI)
      context.save(); context.globalAlpha = Math.sin(amount * Math.PI); context.shadowColor = mix(star.color); context.shadowBlur = 10; context.fillStyle = palette === V0_PALETTE ? "#FFFFFF" : palette.darkInk
      context.beginPath(); context.moveTo(star.x, star.y - radius); context.quadraticCurveTo(star.x, star.y, star.x + radius, star.y); context.quadraticCurveTo(star.x, star.y, star.x, star.y + radius); context.quadraticCurveTo(star.x, star.y, star.x - radius, star.y); context.quadraticCurveTo(star.x, star.y, star.x, star.y - radius); context.fill(); context.restore()
    }
  }

  let built = false
  return runCanvasLoop(canvas, (context, width, height, time) => {
    if (!built) { build(width, height); built = true }
    const mobile = options.mobile()
    const loop = Math.floor(time / CYCLE)
    const localTime = options.reducedMotion ? CYCLE : time % CYCLE
    const head = Math.min(1, localTime / TRAVEL)
    const elapsed = localTime - TRAVEL
    const celebrating = !options.reducedMotion && elapsed >= 0 && elapsed < CELEBRATE
    const boost = celebrating ? Math.max(0, 1 - elapsed / CELEBRATE * 2.2) : 0
    const step = mobile ? 7 : 8
    const count = Math.floor(total / step)
    for (let index = 0; index <= count; index++) {
      const fraction = index / count
      const point = at(fraction)
      const lit = fraction <= head
      dot(context, point[0], point[1], lit ? 1.5 + boost * 0.9 : 1.1, mix(fraction), lit ? Math.min(1, 0.85 + boost * 0.15) : 0.22)
    }
    if (!options.reducedMotion && head < 1) for (let index = 0; index < 10; index++) {
      const point = at(head - index * 0.006)
      if (head - index * 0.006 < 0) break
      dot(context, point[0], point[1], 4 - index * 0.32, palette === V0_PALETTE ? "#FFFFFF" : palette.darkInk, (1 - index / 10) * 0.9)
    }
    if (!mobile) STATIONS.forEach((station, index) => {
      const point = at(station)
      const lit = head >= station
      context.globalAlpha = 1; context.fillStyle = palette.dark; context.beginPath(); context.arc(point[0], point[1], 6, 0, Math.PI * 2); context.fill()
      context.globalAlpha = lit ? 1 : 0.35; context.strokeStyle = mix(station); context.lineWidth = 1.5; context.beginPath(); context.arc(point[0], point[1], 6, 0, Math.PI * 2); context.stroke()
      if (lit) dot(context, point[0], point[1], 2.4, mix(station), 1)
      context.globalAlpha = lit ? 0.9 : 0.4; context.fillStyle = lit ? palette.darkInk : palette === V0_PALETTE ? V0_LABEL_DIM : palette.phaseDark[3]; context.font = `600 10px ${options.monoFont}`; context.textAlign = "center"; context.fillText(`0${index + 1} ${LABELS[index]}`, point[0], point[1] + 24)
    })
    const full = BURST === "every" || loop === 0
    setCelebration(celebrating && elapsed < 1.1 ? (full ? "full" : "light") : "")
    if (celebrating) drawBurst(context, elapsed, full)
    context.globalAlpha = 1
  }, { reducedMotion: options.reducedMotion, stillTime: CYCLE, onResize: (width, height) => { if (width && height) { build(width, height); built = true } } })
}
