"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, Crosshair, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { cn } from "@/lib/utils"

const TOTAL = 10

type Phase = "idle" | "playing" | "done"
type Target = { x: number; y: number; born: number }
type Ping = { id: number; x: number; y: number }

function rank(acc: number, avg: number): { label: string; tone: string } {
  if (acc >= 0.9 && avg > 0 && avg < 480) return { label: "MARKSMAN", tone: "text-brass-bright" }
  if (acc >= 0.8) return { label: "SHARPSHOOTER", tone: "text-brass" }
  if (acc >= 0.6) return { label: "QUALIFIED", tone: "text-signal" }
  return { label: "RECRUIT", tone: "text-text-mid" }
}

export function PrecisionTest() {
  const [phase, setPhase] = useState<Phase>("idle")
  const [round, setRound] = useState(0)
  const [hits, setHits] = useState(0)
  const [reactions, setReactions] = useState<number[]>([])
  const [target, setTarget] = useState<Target | null>(null)
  const [pings, setPings] = useState<Ping[]>([])
  const pingId = useRef(0)

  // Spawn / miss-timer driven by (phase, round) — this IS the game loop, so it
  // intentionally sets state when the round advances.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (phase !== "playing") return
    if (round >= TOTAL) {
      setPhase("done")
      setTarget(null)
      return
    }
    const x = 8 + Math.random() * 80
    const y = 16 + Math.random() * 68
    setTarget({ x, y, born: performance.now() })
    const windowMs = Math.max(720, 1300 - round * 58)
    const tid = window.setTimeout(() => {
      // miss → next round
      setRound((r) => r + 1)
    }, windowMs)
    return () => window.clearTimeout(tid)
  }, [phase, round])
  /* eslint-enable react-hooks/set-state-in-effect */

  function start() {
    setHits(0)
    setReactions([])
    setRound(0)
    setPhase("playing")
  }

  function hit(e: React.PointerEvent) {
    e.stopPropagation()
    if (!target) return
    const rt = performance.now() - target.born
    setReactions((r) => [...r, rt])
    setHits((h) => h + 1)
    const id = ++pingId.current
    setPings((p) => [...p, { id, x: target.x, y: target.y }])
    window.setTimeout(() => setPings((p) => p.filter((x) => x.id !== id)), 480)
    setTarget(null)
    setRound((r) => r + 1)
  }

  const accuracy = hits / TOTAL
  const avg = reactions.length ? Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length) : 0
  const r = rank(accuracy, avg)

  return (
    <section className="border-y border-hairline">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6">
        <SectionEyebrow>Calibration</SectionEyebrow>
        <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Test your precision
        </h2>
        <p className="mt-2 max-w-xl text-text-mid">
          Lock onto {TOTAL} targets as fast as you can. A small taste of the precision we bring to
          your application.
        </p>

        <div className="relative mt-8 h-[clamp(320px,52vh,460px)] w-full overflow-hidden rounded-lg border border-hairline bg-surface-1/60 tech-grid">
          {/* HUD header */}
          <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-hairline bg-surface-1/70 px-4 py-2 backdrop-blur-sm">
            <span className="engraved text-brass">Precision Range</span>
            {phase === "playing" && (
              <span className="font-mono text-xs text-text-mid">
                TGT <span className="text-signal">{Math.min(round + 1, TOTAL)}</span>/{TOTAL} · HITS{" "}
                <span className="text-brass">{hits}</span>
              </span>
            )}
          </div>

          {/* idle */}
          {phase === "idle" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
              <Crosshair className="size-8 text-signal" />
              <p className="max-w-xs text-sm text-text-mid">
                Tap the reticles the instant they appear. Targets get faster.
              </p>
              <Button onClick={start} size="lg">
                Begin calibration
              </Button>
            </div>
          )}

          {/* playing */}
          {phase === "playing" && target && (
            <button
              type="button"
              onPointerDown={hit}
              aria-label="Lock target"
              className="absolute z-10 flex size-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
              style={{ left: `${target.x}%`, top: `${target.y}%` }}
            >
              <span className="reticle-active absolute inset-1 rounded-full border border-signal" />
              <span className="absolute inset-[30%] rounded-full border border-signal/60" />
              <span className="absolute left-1/2 top-0 h-2 w-px -translate-x-1/2 bg-signal" />
              <span className="absolute bottom-0 left-1/2 h-2 w-px -translate-x-1/2 bg-signal" />
              <span className="absolute left-0 top-1/2 h-px w-2 -translate-y-1/2 bg-signal" />
              <span className="absolute right-0 top-1/2 h-px w-2 -translate-y-1/2 bg-signal" />
              <span className="size-1.5 rounded-full bg-signal" />
            </button>
          )}

          {/* hit pings */}
          {pings.map((p) => (
            <span
              key={p.id}
              aria-hidden
              className="pointer-events-none absolute z-10 size-12 rounded-full border border-brass"
              style={{ left: `${p.x}%`, top: `${p.y}%`, animation: "hud-ping 480ms ease-out forwards" }}
            />
          ))}

          {/* done */}
          {phase === "done" && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-1 bg-surface-1/80 text-center backdrop-blur-sm">
              <div className="engraved text-brass">Result</div>
              <div className={cn("mt-1 font-display text-4xl font-bold tracking-tight", r.tone)}>
                {r.label}
              </div>
              <div className="mt-3 flex items-center gap-6 font-mono text-sm">
                <span>
                  <span className="text-text-low">PRECISION </span>
                  <span className="text-foreground">{Math.round(accuracy * 100)}%</span>
                </span>
                <span>
                  <span className="text-text-low">AVG </span>
                  <span className="text-foreground">{avg || "—"}ms</span>
                </span>
              </div>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button onClick={start} variant="outline" size="sm">
                  <RotateCcw className="size-4" /> Retry
                </Button>
                <Button asChild size="sm">
                  <Link href="/eligibility">
                    Now get licensed <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
