import { runCanvasLoop, type CanvasLoopHandle } from "../shared/canvasLoop"

const PALETTE = [[47, 168, 238], [91, 108, 255], [138, 91, 234], [194, 79, 201], [238, 94, 140], [245, 154, 74]]
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

export function startClosingPath(canvas: HTMLCanvasElement, anchor: HTMLElement, options: { reducedMotion: boolean; mobile: () => boolean; monoFont: string }): CanvasLoopHandle {
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
      gradient.addColorStop(0, `rgba(162,79,217,${0.35 * bloom})`)
      gradient.addColorStop(0.5, `rgba(91,108,255,${0.18 * bloom})`)
      gradient.addColorStop(1, "rgba(0,0,0,0)")
      context.globalAlpha = 1; context.fillStyle = gradient; context.beginPath(); context.arc(centerX, centerY, width * 0.9, 0, Math.PI * 2); context.fill()
    }
    for (const [index, color] of ["#8FA8FF", "#E58CC8", "#F5B27A"].entries()) {
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
      context.save(); context.globalAlpha = Math.sin(amount * Math.PI); context.shadowColor = mix(star.color); context.shadowBlur = 10; context.fillStyle = "#FFFFFF"
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
      dot(context, point[0], point[1], 4 - index * 0.32, "#FFFFFF", (1 - index / 10) * 0.9)
    }
    if (!mobile) STATIONS.forEach((station, index) => {
      const point = at(station)
      const lit = head >= station
      context.globalAlpha = 1; context.fillStyle = "#0A1520"; context.beginPath(); context.arc(point[0], point[1], 6, 0, Math.PI * 2); context.fill()
      context.globalAlpha = lit ? 1 : 0.35; context.strokeStyle = mix(station); context.lineWidth = 1.5; context.beginPath(); context.arc(point[0], point[1], 6, 0, Math.PI * 2); context.stroke()
      if (lit) dot(context, point[0], point[1], 2.4, mix(station), 1)
      context.globalAlpha = lit ? 0.9 : 0.4; context.fillStyle = lit ? "#F4F7F9" : "#8A99A6"; context.font = `600 10px ${options.monoFont}`; context.textAlign = "center"; context.fillText(`0${index + 1} ${LABELS[index]}`, point[0], point[1] + 24)
    })
    const full = BURST === "every" || loop === 0
    setCelebration(celebrating && elapsed < 1.1 ? (full ? "full" : "light") : "")
    if (celebrating) drawBurst(context, elapsed, full)
    context.globalAlpha = 1
  }, { reducedMotion: options.reducedMotion, stillTime: CYCLE, onResize: (width, height) => { if (width && height) { build(width, height); built = true } } })
}
