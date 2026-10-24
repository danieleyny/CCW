// Canvas engine for the Planning Realities "Signal Field".
// A perspective plane of dots, gently waving, with a lit band that
// glides to the selected fact. No dependencies.

export type SignalFieldOptions = {
  count?: number
  dotColor?: string
  hotColor?: string
  reducedMotion?: boolean
  initialIndex?: number
}

export type SignalFieldHandle = {
  setActive: (index: number) => void
  destroy: () => void
}

export function startSignalField(
  canvas: HTMLCanvasElement,
  opts: SignalFieldOptions = {},
): SignalFieldHandle {
  const context = canvas.getContext("2d")
  if (!context) return { setActive() {}, destroy() {} }
  const ctx: CanvasRenderingContext2D = context

  const count = Math.max(1, opts.count ?? 5)
  const dotColor = opts.dotColor ?? "#7E9BAD"
  const hotColor = opts.hotColor ?? "#5FD4E0"
  const reduced = !!opts.reducedMotion
  const bandFor = (index: number) => (count <= 1 ? 0 : -0.8 + (1.6 * index) / (count - 1))

  let w = 0
  let h = 0
  let target = opts.initialIndex ?? 0
  let bandX = bandFor(target)
  let t = reduced ? 4 : 0
  let last = 0
  let raf = 0
  let running = false
  let onScreen = false
  let pageVisible = typeof document === "undefined" ? true : !document.hidden

  function resize() {
    const rect = canvas.getBoundingClientRect()
    w = rect.width
    h = rect.height
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    const bufferWidth = Math.max(1, Math.round(w * dpr))
    const bufferHeight = Math.max(1, Math.round(h * dpr))
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth
      canvas.height = bufferHeight
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!running) draw()
  }

  function draw() {
    ctx.clearRect(0, 0, w, h)
    if (!w || !h) return

    const compact = h < 320
    const nx = Math.round(w / (compact ? 9 : 13))
    const nz = compact ? 22 : 34
    const horizon = h * (compact ? 0.02 : 0.44)
    const scale = h * (compact ? 0.85 : 0.62)
    const baseRadius = compact ? 1.8 : 2.1

    // Back to front so near dots paint over far ones.
    for (let zi = nz - 1; zi >= 0; zi--) {
      const z = zi / (nz - 1)
      const depth = 1 + z * 3.2
      const alphaDepth = (1 - z) * 0.75 + 0.08
      for (let xi = 0; xi < nx; xi++) {
        const x = -1.3 + (2.6 * xi) / (nx - 1)
        let y =
          0.18 * Math.sin(x * 3.1 + t * 0.7 + z * 4) * Math.cos(z * 3 - t * 0.45) +
          0.07 * Math.sin(x * 7 - t * 1.1)
        const band = Math.exp(-Math.pow((x - bandX) / 0.17, 2))
        y += band * 0.24 * (0.6 + 0.4 * Math.sin(t * 1.6 + z * 5))

        const sx = w * 0.5 + (x * w * 0.55) / depth
        const sy = horizon + ((1.05 - y) * scale) / depth
        if (sx < -4 || sx > w + 4 || sy > h + 4) continue

        const hot = band > 0.35
        const radius = (baseRadius / Math.sqrt(depth)) * (1 + band * 0.5)
        ctx.globalAlpha = Math.min(1, alphaDepth * (hot ? 1 : 0.5))
        ctx.fillStyle = hot ? hotColor : dotColor
        ctx.beginPath()
        ctx.arc(sx, sy, radius, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  function frame(now: number) {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    t += dt
    bandX += (bandFor(target) - bandX) * (1 - Math.pow(0.046, dt))
    draw()
    raf = requestAnimationFrame(frame)
  }

  function update() {
    const shouldRun = !reduced && onScreen && pageVisible
    if (shouldRun && !running) {
      running = true
      last = 0
      raf = requestAnimationFrame(frame)
    } else if (!shouldRun && running) {
      running = false
      cancelAnimationFrame(raf)
    }
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting
      update()
    },
    { rootMargin: "100px" },
  )
  intersectionObserver.observe(canvas)

  const onVisibilityChange = () => {
    pageVisible = !document.hidden
    update()
  }
  document.addEventListener("visibilitychange", onVisibilityChange)
  resize()

  return {
    setActive(index: number) {
      target = Math.max(0, Math.min(count - 1, index))
      if (!running) {
        bandX = bandFor(target)
        draw()
      }
    },
    destroy() {
      running = false
      cancelAnimationFrame(raf)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    },
  }
}
