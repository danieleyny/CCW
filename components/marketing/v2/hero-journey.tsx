"use client"

import { useEffect, useRef } from "react"
import { CASE_STAGES, isNypdControlled } from "@/config/stages"

/**
 * The hero "Hero Journey" walker — ported from redesign/hero-options.html §o1 ("The Line").
 * Our shield, personified, walks in from off the map, reaches the applicant where they
 * stalled (stage 06, Document Collection), and walks them through every remaining stage to
 * Licensed: laying the route under its feet, lighting each station, and NAMING what it is
 * handling as it goes.
 *
 * Honesty (guardrail): the readout suffix and the station ring are BOTH derived from
 * `isNypdControlled` — we never claim to "handle" the four stages whose clock belongs to
 * the NYPD (filed, fingerprinting_booked, under_investigation, decision). Those get
 * "NYPD's clock, we track it" and a dashed ring; ours get "handled by us" and a solid ring.
 *
 * Motion: route draw, station pops, limb swings, bob, confetti and readout crossfades are
 * pure CSS, gated on `.is-playing`. Only the walker's travel uses the Web Animations API
 * (keyframes sampled from the path at constant arc-length speed). Plays ONCE, ~5.5s, then
 * nothing runs — no rAF loop, no re-entry replay.
 */

// Stage 06 (document_collection) is where almost everyone stalls. Illustrative default for
// the hero — NOT live case data.
const HERE = 6

export function HeroJourney() {
  const rootRef = useRef<HTMLDivElement>(null)
  const routeRef = useRef<SVGPathElement>(null)
  const route2Ref = useRef<SVGPathElement>(null)
  const stopsRef = useRef<SVGGElement>(null)
  const confettiRef = useRef<SVGGElement>(null)
  const walkerRef = useRef<SVGGElement>(null)
  const readoutRef = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const path = routeRef.current
    const route2 = route2Ref.current
    const stops = stopsRef.current
    const conf = confettiRef.current
    const walker = walkerRef.current
    const readout = readoutRef.current
    if (!root || !path || !route2 || !stops || !conf || !walker || !readout) return

    const N = CASE_STAGES.length // 13, the SSOT — never a retyped literal
    const len = path.getTotalLength()
    const SVGNS = "http://www.w3.org/2000/svg"

    // Guard React StrictMode's double-invoke: clear the generated containers each run.
    stops.replaceChildren()
    conf.replaceChildren()
    readout.replaceChildren()

    const doneLen = len * ((HERE - 1) / (N - 1))
    for (const el of [path, route2]) {
      el.style.setProperty("--done", String(doneLen))
      el.style.setProperty("--rest", String(len - doneLen))
      el.style.setProperty("--gap", String(len + 2)) // never let the dash pattern wrap onto the route
    }

    const T = { walkIn: 1350, walkInDur: 700, cross: 2300, crossDur: 1750, arrive: 4050 }

    // ── stations ──────────────────────────────────────────────────────────────
    for (let i = 1; i <= N; i++) {
      const stage = CASE_STAGES[i - 1]
      const pt = path.getPointAtLength(len * ((i - 1) / (N - 1)))
      const ahead = i > HERE
      const d = ahead
        ? Math.round(1000 + (i - HERE) * 55)
        : Math.round(300 + ((i - 1) / (HERE - 1)) * 760)

      const c = document.createElementNS(SVGNS, "circle")
      c.setAttribute("cx", String(pt.x))
      c.setAttribute("cy", String(pt.y))
      c.setAttribute("r", String(i === HERE ? 9 : 6.5))
      // The NYPD-controlled stages get a DASHED ring so the distinction is legible without
      // reading the readout — same size, same colour, the dash alone carries it.
      const nypd = isNypdControlled(stage.key) ? " nypd" : ""
      c.setAttribute("class", "stop" + (ahead ? " ahead" : " done") + (i === HERE ? " here" : "") + nypd)
      c.style.setProperty("--sd", d + "ms")
      if (ahead) c.style.setProperty("--ld", Math.round(T.cross + ((i - HERE) / (N - HERE)) * T.crossDur - 90) + "ms")

      if (i === HERE) {
        const h = document.createElementNS(SVGNS, "circle")
        h.setAttribute("cx", String(pt.x))
        h.setAttribute("cy", String(pt.y))
        h.setAttribute("r", "11")
        h.setAttribute("class", "halo")
        stops.appendChild(h)
      }
      stops.appendChild(c)

      const lab = document.createElementNS(SVGNS, "text")
      lab.setAttribute("x", String(pt.x))
      lab.setAttribute("y", String(pt.y + (i === HERE ? 30 : 24)))
      lab.setAttribute("text-anchor", "middle")
      lab.setAttribute("class", "stop-label" + (ahead ? " ahead-l" : ""))
      lab.textContent = String(i).padStart(2, "0")
      stops.appendChild(lab)
    }

    // ── readout: names the stage under the walker's feet, in step with it ──────
    // Every stage carries a compact `short` — the right length for this mono readout.
    const nameFor = (i: number) => CASE_STAGES[i - 1].short
    const row = (html: string, inMs: number, outMs: number | null, cls?: string) => {
      const sp = document.createElement("span")
      if (cls) sp.className = cls
      sp.innerHTML = html
      sp.style.setProperty("--in", inMs + "ms")
      if (outMs != null) sp.style.setProperty("--out", outMs + "ms")
      readout.appendChild(sp)
    }
    row(`Stage 06 &middot; <b>${nameFor(HERE)}</b> &mdash; stalled, seven stages to go`, 1180, T.cross)
    const seg = T.crossDur / (N - HERE)
    for (let i = HERE + 1; i < N; i++) {
      const t0 = Math.round(T.cross + (i - HERE - 1) * seg)
      // Suffix DERIVED from the truth, never hardcoded (Phase 1).
      const suffix = isNypdControlled(CASE_STAGES[i - 1].key) ? "NYPD&rsquo;s clock, we track it" : "handled by us"
      row(`Stage ${String(i).padStart(2, "0")} &middot; <b>${nameFor(i)}</b> &mdash; ${suffix}`, t0 + 120, Math.round(t0 + seg))
    }
    row(`Stage 13 &middot; <b>${nameFor(N)}</b> &mdash; we walked you the rest`, T.arrive + 260, null, "fin")

    // ── confetti at the finish line ─────────────────────────────────────────────
    const end = path.getPointAtLength(len)
    conf.setAttribute("transform", `translate(${end.x},${end.y - 14})`)
    // Tokens only — set via inline style (presentation attrs don't take var()).
    const COLS = ["--cyan", "--electric", "--violet", "--magenta", "--tangerine", "--shield-gold", "--success"]
    for (let i = 0; i < 34; i++) {
      const a = -Math.PI * 0.96 + Math.random() * (Math.PI * 0.7) // up, fanned back into frame
      const sp = 34 + Math.random() * 54
      const w = 2 + Math.random() * 2.4
      const h = 3.4 + Math.random() * 3.4
      const r = document.createElementNS(SVGNS, "rect")
      r.setAttribute("x", String(-w / 2))
      r.setAttribute("y", String(-h / 2))
      r.setAttribute("width", String(w))
      r.setAttribute("height", String(h))
      r.setAttribute("rx", ".6")
      r.setAttribute("class", "conf")
      r.style.fill = `var(${COLS[i % COLS.length]})`
      const dx = Math.cos(a) * sp
      const peak = Math.sin(a) * sp
      r.style.setProperty("--dx", dx.toFixed(1) + "px")
      r.style.setProperty("--peak", peak.toFixed(1) + "px")
      r.style.setProperty("--dy", (peak + 52 + Math.random() * 36).toFixed(1) + "px") // then gravity
      r.style.setProperty("--rot", Math.round(-300 + Math.random() * 600) + "deg")
      r.style.setProperty("--cd", Math.round(1150 + Math.random() * 520) + "ms")
      r.style.setProperty("--cdel", Math.round(T.arrive + 60 + Math.random() * 220) + "ms")
      conf.appendChild(r)
    }

    // ── walker travel (Web Animations API — the only JS-driven motion) ──────────
    const LIFT = 2.5 // stand on the line, not through it
    const frames = (from: number, to: number, lead?: { x: number; y: number }) => {
      const pts: { x: number; y: number }[] = []
      const STEPS = 46
      if (lead) pts.push(lead)
      for (let k = 0; k <= STEPS; k++) pts.push(path.getPointAtLength(from + (to - from) * (k / STEPS)))
      const cum = [0]
      for (let k = 1; k < pts.length; k++) {
        cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y))
      }
      const total = cum[cum.length - 1] || 1
      return pts.map((p, k) => ({
        transform: `translate(${p.x.toFixed(2)}px,${(p.y - LIFT).toFixed(2)}px)`,
        offset: Math.min(1, cum[k] / total),
      }))
    }

    let anims: Animation[] = []
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches
    let played = false

    const play = () => {
      if (played) return // once only — never loop, never replay on re-entry
      played = true
      root.classList.add("is-playing")
      anims.forEach((a) => a.cancel())
      anims = []
      if (reduced) {
        const e = path.getPointAtLength(len)
        walker.style.transform = `translate(${e.x}px,${e.y - LIFT}px)`
        return
      }
      const p0 = path.getPointAtLength(0)
      const meet = doneLen - 12 // stand beside stage 06, not on top of it
      // 1 · walks in from off-stage and catches up to where you stalled.
      anims.push(walker.animate(frames(0, meet, { x: -52, y: p0.y }), { duration: T.walkInDur, delay: T.walkIn, easing: "linear", fill: "both" }))
      // 2 · walks you across. 'forwards' only — 'both' back-applies the start pose and
      //     silently swallows the walk-in phase.
      anims.push(walker.animate(frames(meet, len), { duration: T.crossDur, delay: T.cross, easing: "linear", fill: "forwards" }))
    }

    // Above the fold → start on mount. The observer only avoids starting while off-screen
    // when someone deep-links mid-page; it plays once and never replays.
    let observer: IntersectionObserver | null = null
    const rect = root.getBoundingClientRect()
    const inView = rect.top < window.innerHeight && rect.bottom > 0
    if (inView) {
      play()
    } else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          play()
          observer?.disconnect()
        }
      })
      observer.observe(root)
    }

    return () => {
      anims.forEach((a) => a.cancel())
      observer?.disconnect()
    }
  }, [])

  return (
    <div className="hero-journey" ref={rootRef}>
      <p className="hj-kicker">Your licence — all thirteen stages</p>
      <svg
        viewBox="0 100 640 190"
        role="img"
        aria-label="Thirteen-stage licence journey: six done, then our shield walks you through the remaining seven to licensed."
      >
        <defs>
          <linearGradient id="hjGrad" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="600" y2="0">
            <stop offset="0" style={{ stopColor: "var(--cyan)" }} />
            <stop offset=".28" style={{ stopColor: "var(--electric)" }} />
            <stop offset=".52" style={{ stopColor: "var(--violet)" }} />
            <stop offset=".74" style={{ stopColor: "var(--magenta)" }} />
            <stop offset="1" style={{ stopColor: "var(--tangerine)" }} />
          </linearGradient>
        </defs>
        <path id="hj-ghost" className="hj-ghost" d="M40 232 L104 232 L152 184 L232 184 L280 232 L360 232 L408 184 L468 184 L516 136 L600 136" />
        <path ref={routeRef} className="hj-trace" d="M40 232 L104 232 L152 184 L232 184 L280 232 L360 232 L408 184 L468 184 L516 136 L600 136" />
        <path ref={route2Ref} className="hj-trace2" d="M40 232 L104 232 L152 184 L232 184 L280 232 L360 232 L408 184 L468 184 L516 136 L600 136" />
        {/* Station <g> stays AFTER both route paths so the zero-length route2 dashes (which
            land under station circles) are hidden. */}
        <g ref={stopsRef} />
        <g ref={confettiRef} />

        {/* The shield, personified: skyline crown, eyes, gold check, arms and legs. */}
        <g ref={walkerRef} className="hj-walker">
          <g transform="scale(.86)">
            <g className="hj-bob">
              <rect className="hj-limb hj-leg-b" x="-4.6" y="-13" width="3.1" height="13" rx="1.55" />
              <rect className="hj-limb hj-leg-a" x="1.5" y="-13" width="3.1" height="13" rx="1.55" />
              <rect className="hj-limb hj-arm-b" x="-14.6" y="-31" width="2.7" height="12" rx="1.35" />
              <rect className="hj-limb hj-arm-a" x="11.9" y="-31" width="2.7" height="12" rx="1.35" />
              <g className="hj-body">
                <rect className="hj-shield" x="-10.4" y="-38" width="2.8" height="4.4" />
                <rect className="hj-shield" x="-6.4" y="-40.5" width="3.2" height="7" />
                <line className="hj-spire" x1="-4.8" y1="-40.5" x2="-4.8" y2="-44.4" />
                <rect className="hj-shield" x="-1.8" y="-39" width="3.6" height="5.4" />
                <rect className="hj-shield" x="3" y="-41.4" width="3" height="7.8" />
                <line className="hj-spire" x1="4.5" y1="-41.4" x2="4.5" y2="-45.6" />
                <rect className="hj-shield" x="7.6" y="-37.4" width="2.8" height="4" />
                <path className="hj-shield" d="M-12 -34 L12 -34 L12 -22 C12 -16 6 -13.2 0 -11 C-6 -13.2 -12 -16 -12 -22 Z" />
                <circle className="hj-eye-w" cx="-4.6" cy="-27.2" r="3" />
                <circle className="hj-eye-w" cx="4.6" cy="-27.2" r="3" />
                <circle className="hj-eye-p" cx="-3.9" cy="-26.9" r="1.4" />
                <circle className="hj-eye-p" cx="5.3" cy="-26.9" r="1.4" />
                <path className="hj-check" d="M-5.2 -18.6 L-1.8 -15.4 L5.2 -22.6" />
              </g>
            </g>
          </g>
        </g>
      </svg>
      {/* aria-live off: decorative narration of a visual; announcing seven stage changes in
          five seconds would be hostile to a screen-reader user. */}
      <p className="hj-readout" ref={readoutRef} aria-live="off" aria-hidden="true" />
    </div>
  )
}
