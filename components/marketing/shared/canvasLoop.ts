export type CanvasDraw = (context: CanvasRenderingContext2D, width: number, height: number, time: number, deltaTime: number) => void

export type CanvasLoopOptions = {
  reducedMotion?: boolean
  stillTime?: number
  onResize?: (width: number, height: number) => void
}

export type CanvasLoopHandle = { redraw: () => void; destroy: () => void }

export function runCanvasLoop(canvas: HTMLCanvasElement, draw: CanvasDraw, options: CanvasLoopOptions = {}): CanvasLoopHandle {
  const context = canvas.getContext("2d")
  if (!context) return { redraw() {}, destroy() {} }

  const reduced = !!options.reducedMotion
  let width = 0
  let height = 0
  let dpr = 1
  let time = reduced ? options.stillTime ?? 0 : 0
  let last = 0
  let frameId = 0
  let running = false
  let onScreen = false
  let pageVisible = !document.hidden

  const paint = (deltaTime: number) => {
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
    context.clearRect(0, 0, width, height)
    if (width && height) draw(context, width, height, time, deltaTime)
    context.globalAlpha = 1
  }

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    width = rect.width
    height = rect.height
    dpr = Math.min(2, window.devicePixelRatio || 1)
    const bitmapWidth = Math.max(1, Math.round(width * dpr))
    const bitmapHeight = Math.max(1, Math.round(height * dpr))
    if (canvas.width !== bitmapWidth || canvas.height !== bitmapHeight) {
      canvas.width = bitmapWidth
      canvas.height = bitmapHeight
    }
    options.onResize?.(width, height)
    if (!running) paint(0)
    update()
  }

  const frame = (now: number) => {
    const deltaTime = last ? Math.min(0.05, (now - last) / 1000) : 0
    last = now
    time += deltaTime
    paint(deltaTime)
    frameId = requestAnimationFrame(frame)
  }

  function update() {
    const shouldRun = !reduced && onScreen && pageVisible && width > 0 && height > 0
    if (shouldRun && !running) {
      running = true
      last = 0
      frameId = requestAnimationFrame(frame)
    } else if (!shouldRun && running) {
      running = false
      cancelAnimationFrame(frameId)
    }
  }

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(canvas)
  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      onScreen = entry.isIntersecting
      update()
    },
    { rootMargin: "100px" }
  )
  intersectionObserver.observe(canvas)

  const onVisibilityChange = () => {
    pageVisible = !document.hidden
    update()
  }
  document.addEventListener("visibilitychange", onVisibilityChange)
  resize()

  return {
    redraw() {
      if (!running) paint(0)
    },
    destroy() {
      running = false
      cancelAnimationFrame(frameId)
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", onVisibilityChange)
    },
  }
}
