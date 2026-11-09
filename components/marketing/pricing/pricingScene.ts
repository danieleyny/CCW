import { runCanvasLoop } from "../shared/canvasLoop"
import { V0_PALETTE, type Palette } from "@/components/theme/themes"

export type V = { x: number; y: number }
export type SceneMode = "breakdown" | "timeline"
export type FlowPort = { x: number; y: number; lanes: number; ours: boolean; hollowLast: boolean }
export type BreakdownLayout = { kind: "flow"; ports: FlowPort[]; end: V } | { kind: "guard"; rect: { x: number; y: number; w: number; h: number }; radius: number }
export type TimelineLayout = { axis: "x" | "y"; nodes: V[]; riverEnd: number; stems?: number[]; leadIn?: number; meter: { x0: number; x1: number; y: number } }
export type SceneLayout = { breakdown: BreakdownLayout; timeline: TimelineLayout }
export type StopGeo = { lanes: number; ours: boolean; varies: boolean; runMin: number; runMax: number }
export type SceneOptions = { variant: "desktop" | "mobile"; stops: StopGeo[]; initialMode: SceneMode; meterMax: number; oursValue: number; reducedMotion?: boolean; palette?: Palette }
export type SceneHandle = { setMode: (mode: SceneMode) => void; setHover: (index: number | null) => void; setActive: (index: number) => void; relayout: () => void; destroy: () => void }

type Dot = V & { cyan: boolean }
type Lane = { group: number; ours: boolean; hollow: boolean; points: (V & { s: number })[]; length: number; phase: number }
type Geometry = { flow?: { lanes: Lane[]; ports: FlowPort[]; end: V }; guard?: (V & { fraction: number })[]; breakdown: Dot[]; river: Lane[]; timeline: TimelineLayout; meter: { x: number; y: number; value: number }[]; timelineDots: Dot[]; random: number[] }

let COLORS = { cyan: "#5FD4E0", slate: "#9FB3C1", bright: "#DCE6EC", white: "#F4F7F9", dim: "#7E9BAD", panel: "#0A1520" }
const STEP = 7
const SPEED = 70
const PERIOD = 230
const TAIL = 70
const MORPH_SECONDS = 1.25
const TAU = Math.PI * 2
const RIVER_ORDER = [0, -1, 1, -2, 2, -3, 3, -4, 4]
const clamp = (value: number) => Math.max(0, Math.min(1, value))
const ease = (value: number) => (value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2)
const hash = (index: number) => { const value = Math.sin(index * 127.1 + 311.7) * 43758.5453; return value - Math.floor(value) }
const frameEase = (perFrame: number, deltaTime: number) => deltaTime === 0 ? 1 : 1 - (1 - perFrame) ** (deltaTime * 60)

function cubic(a: V, b: V, c: V, d: V, offset = 0) {
  const points: (V & { s: number })[] = []
  let previous = a
  let length = 0
  let next = 0
  for (let i = 0; i <= 240; i++) {
    const u = i / 240
    const q = 1 - u
    const point = { x: q ** 3 * a.x + 3 * q ** 2 * u * b.x + 3 * q * u ** 2 * c.x + u ** 3 * d.x, y: q ** 3 * a.y + 3 * q ** 2 * u * b.y + 3 * q * u ** 2 * c.y + u ** 3 * d.y }
    if (i) length += Math.hypot(point.x - previous.x, point.y - previous.y)
    if (length >= next) { points.push({ ...point, s: offset + length }); next += STEP }
    previous = point
  }
  return { points, length }
}

function perimeter(rect: { x: number; y: number; w: number; h: number }, radius: number) {
  const inset = 1.5, x0 = rect.x + inset, y0 = rect.y + inset, x1 = rect.x + rect.w - inset, y1 = rect.y + rect.h - inset
  const horizontal = Math.max(0, x1 - x0 - radius * 2), vertical = Math.max(0, y1 - y0 - radius * 2), arc = Math.PI * radius / 2
  const segments: [(u: number) => V, number][] = [
    [(u) => ({ x: x0 + radius + u * horizontal, y: y0 }), horizontal],
    [(u) => { const angle = -Math.PI / 2 + u * Math.PI / 2; return { x: x1 - radius + Math.cos(angle) * radius, y: y0 + radius + Math.sin(angle) * radius } }, arc],
    [(u) => ({ x: x1, y: y0 + radius + u * vertical }), vertical],
    [(u) => { const angle = u * Math.PI / 2; return { x: x1 - radius + Math.cos(angle) * radius, y: y1 - radius + Math.sin(angle) * radius } }, arc],
    [(u) => ({ x: x1 - radius - u * horizontal, y: y1 }), horizontal],
    [(u) => { const angle = Math.PI / 2 + u * Math.PI / 2; return { x: x0 + radius + Math.cos(angle) * radius, y: y1 - radius + Math.sin(angle) * radius } }, arc],
    [(u) => ({ x: x0, y: y1 - radius - u * vertical }), vertical],
    [(u) => { const angle = Math.PI + u * Math.PI / 2; return { x: x0 + radius + Math.cos(angle) * radius, y: y0 + radius + Math.sin(angle) * radius } }, arc],
  ]
  const total = segments.reduce((sum, [, length]) => sum + length, 0)
  const count = Math.max(1, Math.round(total / STEP))
  return Array.from({ length: count }, (_, index) => {
    let position = index / count * total
    for (const [fn, length] of segments) { if (position <= length) return { ...fn(length ? position / length : 0), fraction: index / count }; position -= length }
    return { x: x0, y: y0, fraction: 0 }
  })
}

function build(layout: SceneLayout, options: SceneOptions): Geometry {
  const breakdown: Dot[] = []
  let flow: Geometry["flow"]
  let guard: Geometry["guard"]
  if (layout.breakdown.kind === "flow") {
    const { ports, end } = layout.breakdown
    const total = ports.reduce((sum, port) => sum + port.lanes, 0)
    const bundleX = end.x - 120
    const lanes: Lane[] = []
    let laneIndex = 0
    ports.forEach((port, group) => {
      for (let lane = 0; lane < port.lanes; lane++, laneIndex++) {
        const startOffset = (lane - (port.lanes - 1) / 2) * 4.5
        const endOffset = (laneIndex - (total - 1) / 2) * 4.5
        const middle = port.x + (bundleX - port.x) * 0.5
        const first = cubic({ x: port.x, y: port.y + startOffset }, { x: middle, y: port.y + startOffset }, { x: middle, y: end.y + endOffset }, { x: bundleX, y: end.y + endOffset })
        const second = cubic({ x: bundleX, y: end.y + endOffset }, { x: bundleX + 40, y: end.y + endOffset }, { x: end.x - 40, y: end.y + endOffset }, { x: end.x, y: end.y + endOffset }, first.length)
        const points = first.points.concat(second.points.slice(1))
        lanes.push({ group, ours: port.ours, hollow: port.hollowLast && lane === port.lanes - 1, points, length: first.length + second.length, phase: (group * 0.37 + lane * 0.13) % 1 })
        points.forEach((point) => breakdown.push({ x: point.x, y: point.y, cyan: port.ours }))
      }
    })
    flow = { lanes, ports, end }
  } else {
    guard = perimeter(layout.breakdown.rect, layout.breakdown.radius)
    guard.forEach((point) => breakdown.push({ x: point.x, y: point.y, cyan: true }))
  }
  const timelineDots: Dot[] = [], river: Lane[] = [], gap = options.variant === "desktop" ? 4.5 : 3.4
  let laneIndex = 0
  options.stops.forEach((stop, stopIndex) => {
    const node = layout.timeline.nodes[stopIndex]
    if (!node) return
    for (let lane = 0; lane < stop.lanes; lane++, laneIndex++) {
      const offset = RIVER_ORDER[laneIndex % RIVER_ORDER.length] * gap
      const points: (V & { s: number })[] = []
      if (layout.timeline.axis === "x") for (let x = node.x; x <= layout.timeline.riverEnd; x += STEP) points.push({ x, y: node.y + offset, s: x - node.x })
      else for (let y = node.y; y <= layout.timeline.riverEnd; y += STEP) points.push({ x: node.x + offset, y, s: y - node.y })
      river.push({ group: stopIndex, ours: stop.ours, hollow: stop.varies && lane === stop.lanes - 1, points, length: points.at(-1)?.s ?? 0, phase: (laneIndex * 0.29) % 1 })
      points.forEach((point) => timelineDots.push({ x: point.x, y: point.y, cyan: stop.ours }))
    }
  })
  const meter: Geometry["meter"] = []
  for (let x = layout.timeline.meter.x0; x <= layout.timeline.meter.x1; x += 6) { const value = (x - layout.timeline.meter.x0) / Math.max(1, layout.timeline.meter.x1 - layout.timeline.meter.x0) * options.meterMax; meter.push({ x, y: layout.timeline.meter.y, value }); timelineDots.push({ x, y: layout.timeline.meter.y, cyan: value <= options.oursValue }) }
  return { flow, guard, breakdown, river, timeline: layout.timeline, meter, timelineDots, random: Array.from({ length: Math.max(breakdown.length, timelineDots.length) }, (_, index) => hash(index)) }
}

export function createPricingScene(canvas: HTMLCanvasElement, getLayout: () => SceneLayout | null, options: SceneOptions): SceneHandle {
  const palette: Palette = options.palette ?? V0_PALETTE
  COLORS = palette.gold && palette.ice
    ? { cyan: palette.goldText ?? palette.gold, slate: palette.ice[1] ?? palette.phaseDark[2], bright: palette.darkInk, white: palette.darkInk, dim: palette.ice[2] ?? palette.phaseDark[3], panel: palette.dark }
    : { cyan: palette.phaseDark[0], slate: palette.phaseDark[2], bright: palette.darkInk, white: palette.darkInk, dim: palette.phaseDark[3], panel: palette.dark }
  const toAlpha = (color: string, opacity: number) => {
    const hex = color.replace("#", "")
    return `rgba(${parseInt(hex.slice(0, 2), 16)},${parseInt(hex.slice(2, 4), 16)},${parseInt(hex.slice(4, 6), 16)},${opacity})`
  }
  const reduced = !!options.reducedMotion
  let geometry: Geometry | null = null, mode = options.initialMode, morph: { to: SceneMode; at: number } | null = null, now = 0, hover: number | null = null, active = 0, head: number | null = null, runMin = options.stops[0].runMin, runMax = options.stops[0].runMax, burstAt: number | null = null, burstFor = -1, dim: number[] = []
  const axisValue = (point: V, axis: "x" | "y") => axis === "x" ? point.x : point.y
  const dot = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number) => { if (alpha <= 0.01) return; context.globalAlpha = Math.min(1, alpha); context.fillStyle = color; context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fill() }
  const ring = (context: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, alpha: number, lineWidth = 1) => { if (alpha <= 0.01) return; context.globalAlpha = Math.min(1, alpha); context.strokeStyle = color; context.lineWidth = lineWidth; context.beginPath(); context.arc(x, y, radius, 0, TAU); context.stroke() }
  const packet = (time: number, phase: number, distance: number) => { const value = ((time * SPEED + phase * PERIOD - distance) % PERIOD + PERIOD) % PERIOD; return value < TAIL ? (1 - value / TAIL) ** 2 : 0 }

  function drawFlow(context: CanvasRenderingContext2D, flow: NonNullable<Geometry["flow"]>, time: number, deltaTime: number) {
    if (dim.length !== flow.ports.length) dim = flow.ports.map(() => 1)
    const easing = frameEase(0.12, deltaTime)
    dim.forEach((value, index) => dim[index] += ((hover === null || hover === index ? 1 : 0.28) - value) * easing)
    let arrival = 0
    flow.lanes.forEach((lane) => {
      const color = lane.ours ? COLORS.cyan : COLORS.slate
      lane.points.forEach((point) => { const glow = packet(time, lane.phase, point.s), alpha = (0.16 + 0.84 * glow) * dim[lane.group] * (lane.ours ? 1 : 0.85), radius = 1.15 + glow * 1.15; if (lane.hollow) ring(context, point.x, point.y, radius + 0.4, color, alpha + 0.06); else dot(context, point.x, point.y, radius, glow > 0.6 && !lane.ours ? COLORS.bright : color, alpha) })
      const end = ((time * SPEED + lane.phase * PERIOD - lane.length) % PERIOD + PERIOD) % PERIOD
      if (end < 26) arrival = Math.max(arrival, (1 - end / 26) * dim[lane.group])
    })
    flow.ports.forEach((port, index) => { context.globalAlpha = 0.9 * dim[index]; context.fillStyle = COLORS.panel; context.strokeStyle = port.ours ? COLORS.cyan : COLORS.slate; context.lineWidth = 1.4; context.beginPath(); context.arc(port.x - 14, port.y, 4.5, 0, TAU); context.fill(); context.stroke() })
    dot(context, flow.end.x, flow.end.y, 26, COLORS.cyan, 0.18 + arrival * 0.35); dot(context, flow.end.x, flow.end.y, 4 + arrival * 1.5, COLORS.cyan, 1)
  }

  function drawGuard(context: CanvasRenderingContext2D, points: NonNullable<Geometry["guard"]>, time: number) {
    const head = (time * 0.07) % 1
    points.forEach((point) => { let glow = 0; for (let index = 0; index < 2; index++) { const distance = (((head + index * 0.5 - point.fraction) % 1) + 1) % 1; if (distance < 0.16) glow = Math.max(glow, 1 - distance / 0.16) }; glow **= 2; dot(context, point.x, point.y, 1.1 + glow * 1.1, COLORS.cyan, 0.22 + 0.78 * glow) })
  }

  function drawTimeline(context: CanvasRenderingContext2D, geo: Geometry, time: number, deltaTime: number) {
    const timeline = geo.timeline, axis = timeline.axis, desktop = options.variant === "desktop", nodes = timeline.nodes
    if (!nodes.length) return
    const current = Math.min(active, nodes.length - 1), target = axisValue(nodes[current], axis)
    if (head === null) head = axisValue(nodes[0], axis)
    head += (target - head) * frameEase(desktop ? 0.06 : 0.07, deltaTime)
    const headPosition = head
    const stop = options.stops[current]; runMin += (stop.runMin - runMin) * frameEase(0.07, deltaTime); runMax += (stop.runMax - runMax) * frameEase(0.07, deltaTime)
    if (burstFor !== current) { burstFor = current; burstAt = null }
    if (burstAt === null && Math.abs(headPosition - target) < 5) burstAt = time
    if (timeline.leadIn !== undefined) for (let x = timeline.leadIn; x < nodes[0].x; x += STEP) dot(context, x, nodes[0].y, 1, COLORS.slate, 0.14)
    geo.river.forEach((lane) => lane.points.forEach((point, pointIndex) => { const position = axisValue(point, axis), taper = Math.min(1, (pointIndex + 1) / 4); if (position > headPosition + 3) return dot(context, point.x, point.y, desktop ? .95 : .85, COLORS.dim, .1 * taper); const packetGlow = packet(time, lane.phase, point.s), near = Math.max(0, 1 - (headPosition - position) / (desktop ? 120 : 90)) * .35, glow = Math.max(packetGlow, near), alpha = (.2 + .8 * glow) * taper * (lane.ours ? 1 : .9), radius = (desktop ? 1.15 : 1) + glow * (desktop ? 1.1 : .9), color = lane.ours ? COLORS.cyan : COLORS.slate; if (lane.hollow) ring(context, point.x, point.y, radius + .4, color, alpha + .08, desktop ? 1 : .9); else dot(context, point.x, point.y, radius, packetGlow > .6 && !lane.ours ? COLORS.bright : color, alpha) }))
    const nodeRadius = desktop ? 9 : 8
    nodes.forEach((node, index) => { const reached = axisValue(node, axis) <= headPosition + 4; if (timeline.stems?.[index] !== undefined) for (let y = node.y + 26; y < timeline.stems[index]; y += 5) dot(context, node.x, y, .9, reached ? COLORS.cyan : COLORS.dim, reached ? .4 : .15); dot(context, node.x, node.y, nodeRadius, COLORS.panel, 1); ring(context, node.x, node.y, nodeRadius, reached ? index === 0 ? COLORS.cyan : COLORS.bright : COLORS.dim, reached ? .95 : .5, 1.5); if (reached) dot(context, node.x, node.y, desktop ? 3.2 : 2.8, index === 0 ? COLORS.cyan : COLORS.bright, 1); if (index === current && !reduced) { const ripple = (time * .9) % 1; ring(context, node.x, node.y, nodeRadius + 3 + ripple * (desktop ? 22 : 14), COLORS.cyan, (1 - ripple) * .5, 1.3) } })
    if (burstAt !== null && !reduced) { const elapsed = (time - burstAt) / .9; if (elapsed < 1) { const center = axis === "x" ? { x: target, y: nodes[0].y } : { x: nodes[0].x, y: target }, count = desktop ? 18 : 14, reach = desktop ? 38 : 26; for (let index = 0; index < count; index++) { const angle = index / count * TAU + .3, distance = 10 + ease(elapsed) * reach; dot(context, center.x + Math.cos(angle) * distance * (axis === "y" ? .8 : 1), center.y + Math.sin(angle) * distance * (axis === "x" ? .75 : 1), 1.6 * (1 - elapsed) + .4, index % 3 ? COLORS.cyan : COLORS.bright, (1 - elapsed) * .9) } } }
    const light = axis === "x" ? { x: headPosition, y: nodes[0].y } : { x: nodes[0].x, y: headPosition }; dot(context, light.x, light.y, desktop ? 22 : 16, COLORS.cyan, .16); dot(context, light.x, light.y, desktop ? 10 : 8, COLORS.cyan, .3); dot(context, light.x, light.y, desktop ? 4.2 : 3.6, COLORS.white, 1)
    geo.meter.forEach((meter) => { if (meter.value <= runMin) dot(context, meter.x, meter.y, desktop ? 1.7 : 1.6, meter.value <= options.oursValue ? COLORS.cyan : COLORS.bright, .75 + (reduced ? 0 : Math.max(0, Math.sin(time * 2 - meter.x * .02)) * .25)); else if (meter.value <= runMax) ring(context, meter.x, meter.y, 1.6, COLORS.slate, .6); else dot(context, meter.x, meter.y, 1.1, COLORS.dim, .16) })
  }

  function drawMorph(context: CanvasRenderingContext2D, geo: Geometry, progress: number, target: SceneMode, width: number, height: number) {
    const axis = options.variant === "desktop" ? "x" : "y", span = axis === "x" ? width : height, toTimeline = target === "timeline", sweep = progress * 1.3 - .15, alpha = Math.sin(Math.PI * clamp(progress)) * .08
    if (alpha > .005) { const position = sweep * span, gradient = axis === "x" ? context.createLinearGradient(position - span * .12, 0, position + span * .12, 0) : context.createLinearGradient(0, position - span * .12, 0, position + span * .12); gradient.addColorStop(0, toAlpha(COLORS.cyan, 0)); gradient.addColorStop(.5, toAlpha(COLORS.cyan, alpha)); gradient.addColorStop(1, toAlpha(COLORS.cyan, 0)); context.globalAlpha = 1; context.fillStyle = gradient; context.fillRect(0, 0, width, height) }
    const count = Math.max(geo.breakdown.length, geo.timelineDots.length)
    for (let index = 0; index < count; index++) { const a = geo.breakdown[index % geo.breakdown.length], b = geo.timelineDots[index % geo.timelineDots.length], random = geo.random[index], source = toTimeline ? a : b, lead = axisValue(source, axis) / span, local = clamp((progress - lead * .3 - random * .08) / .62), eased = ease(local), position = toTimeline ? eased : 1 - eased, lift = Math.sin(Math.PI * eased); let x = a.x + (b.x - a.x) * position, y = a.y + (b.y - a.y) * position; if (axis === "x") y -= lift * (24 + random * 46); else x += lift * (random - .5) * 60; const cyan = toTimeline ? eased > .5 ? b.cyan : a.cyan : eased > .5 ? a.cyan : b.cyan, brightness = Math.exp(-(((axisValue({ x, y }, axis) / span - sweep) / .06) ** 2)); dot(context, x, y, (options.variant === "desktop" ? 1.2 : 1.1) + lift * .9 + brightness * .6, cyan ? COLORS.cyan : lift > .5 || brightness > .5 ? COLORS.bright : COLORS.slate, .35 + lift * .55 + brightness * .3) }
  }

  const loop = runCanvasLoop(canvas, (context, width, height, time, deltaTime) => {
    now = time
    if (!geometry) { const layout = getLayout(); if (!layout) return; geometry = build(layout, options) }
    if (morph && !reduced) { const progress = (time - morph.at) / MORPH_SECONDS; if (progress < 1) return drawMorph(context, geometry, progress, morph.to, width, height); if (morph.to === "timeline") { head = null; burstFor = -1 }; morph = null }
    if (mode === "timeline") drawTimeline(context, geometry, time, deltaTime); else if (geometry.flow) drawFlow(context, geometry.flow, time, deltaTime); else if (geometry.guard) drawGuard(context, geometry.guard, time)
  }, { reducedMotion: reduced, stillTime: 3, onResize: () => { geometry = null } })

  return { setMode(next) { if (next === mode) return; if (!reduced) { const progress = morph ? clamp((now - morph.at) / MORPH_SECONDS) : 0; morph = { to: next, at: morph ? now - (1 - progress) * MORPH_SECONDS : now } }; mode = next; if (next === "timeline") { active = 0; head = null; runMin = options.stops[0].runMin; runMax = options.stops[0].runMax }; loop.redraw() }, setHover(index) { hover = index; loop.redraw() }, setActive(index) { active = index; loop.redraw() }, relayout() { geometry = null; loop.redraw() }, destroy: loop.destroy }
}
