export type CanvasLoopHandle = {
  destroy: () => void
  pause: () => void
  redraw: () => void
  resume: () => void
}

type DrawFrame = (context: CanvasRenderingContext2D, width: number, height: number, time: number) => void

/**
 * Resize-aware canvas loop shared by the five phase stories. It caps DPR at 2,
 * stops when paused, off-screen, or in a hidden tab, and clears before every draw.
 */
export function runCanvasLoop(
  canvas: HTMLCanvasElement,
  draw: DrawFrame,
  opts: { reducedMotion?: boolean; stillTime?: number } = {}
): CanvasLoopHandle {
  const context = canvas.getContext("2d")
  if (!context) {
    return { destroy() {}, pause() {}, redraw() {}, resume() {} }
  }

  let destroyed = false
  let inView = false
  let manuallyPaused = false
  let frame = 0
  let width = 0
  let height = 0

  const resize = () => {
    const rect = canvas.getBoundingClientRect()
    const nextWidth = Math.max(0, rect.width)
    const nextHeight = Math.max(0, rect.height)
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    width = nextWidth
    height = nextHeight
    const pixelWidth = Math.max(1, Math.round(nextWidth * dpr))
    const pixelHeight = Math.max(1, Math.round(nextHeight * dpr))
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth
      canvas.height = pixelHeight
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const paint = (time: number) => {
    resize()
    context.clearRect(0, 0, width, height)
    if (width > 0 && height > 0) draw(context, width, height, time)
  }

  const shouldRun = () =>
    !destroyed && !manuallyPaused && inView && !document.hidden && !opts.reducedMotion

  const tick = (timeMs: number) => {
    frame = 0
    if (!shouldRun()) return
    paint(timeMs / 1000)
    frame = window.requestAnimationFrame(tick)
  }

  const schedule = () => {
    if (shouldRun() && frame === 0) frame = window.requestAnimationFrame(tick)
  }

  const stop = () => {
    if (frame !== 0) window.cancelAnimationFrame(frame)
    frame = 0
  }

  const redraw = () => {
    stop()
    if (inView && !document.hidden) {
      paint(opts.reducedMotion ? (opts.stillTime ?? 0) : performance.now() / 1000)
    }
    schedule()
  }

  const visibility = () => {
    if (document.hidden) stop()
    else if (inView) {
      redraw()
      schedule()
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    resize()
    if (inView && !document.hidden) redraw()
  })
  resizeObserver.observe(canvas)

  const intersectionObserver = new IntersectionObserver(
    ([entry]) => {
      inView = entry.isIntersecting
      if (inView) redraw()
      else stop()
    },
    { threshold: 0.01 }
  )
  intersectionObserver.observe(canvas)
  document.addEventListener("visibilitychange", visibility)

  return {
    destroy() {
      destroyed = true
      stop()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener("visibilitychange", visibility)
    },
    pause() {
      manuallyPaused = true
      stop()
      redraw()
    },
    redraw,
    resume() {
      manuallyPaused = false
      redraw()
      schedule()
    },
  }
}
