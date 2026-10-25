import { runCanvasLoop, type CanvasLoopHandle } from "./canvasLoop"
import { ILLUSTRATIONS } from "./phaseIllustrations"
import { LOOP_MS } from "./phasesData"

export type IllustrationHandle = CanvasLoopHandle & { setActive: (on: boolean) => void }

/** One canvas = one phase. Draws only while its phase is active; restarts the story on activation. */
export function startPhaseIllustration(
  canvas: HTMLCanvasElement,
  index: number,
  color: string,
  opts: { reducedMotion?: boolean; initiallyActive: boolean }
): IllustrationHandle {
  let active = opts.initiallyActive
  let restart = true
  let t0 = 0
  const loopS = LOOP_MS / 1000

  const loop = runCanvasLoop(
    canvas,
    (c, w, h, t) => {
      if (!active) return
      if (restart) {
        t0 = t
        restart = false
      }
      const lt = t - t0
      const vis = opts.reducedMotion ? 1 : Math.min(1, lt / 0.5)
      const u = opts.reducedMotion ? 0.92 : (lt % loopS) / loopS
      c.save()
      ILLUSTRATIONS[index]({ c, w, h, u, vis, col: color, compact: w < 420 })
      c.restore()
    },
    { reducedMotion: opts.reducedMotion, stillTime: 0 }
  )

  if (!active) loop.pause()

  return {
    ...loop,
    setActive(on: boolean) {
      if (on && !active) restart = true
      active = on
      if (on) loop.resume()
      else loop.pause()
    },
  }
}
