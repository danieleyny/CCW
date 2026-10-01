"use client"

import { useEffect, useRef } from "react"
import { CASE_STAGES, isNypdControlled } from "@/config/stages"

/**
 * The hero "Hero Journey" walker — ported from redesign/hero-options.html §o1 ("The Line").
 * Our shield, personified, walks in from off the map, reaches the applicant where they
 * stalled (stage 06, Document Collection), and walks them through every remaining stage to
 * Licensed with a STEP-AND-HOLD rhythm: it steps to a station, stands still while that
 * station's line holds on screen long enough to read, then steps to the next.
 *
 * Honesty (guardrail): the readout suffix and the station ring are BOTH derived from
 * `isNypdControlled` — we never claim to "handle" the four stages whose clock belongs to
 * the NYPD (filed, fingerprinting_booked, under_investigation, decision). Those get
 * "NYPD's clock, we track it" and a dashed ring; ours get "handled by us" and a solid ring.
 * The same truth drives the "NYPD'S CLOCK" background band under stations 09–12.
 *
 * Motion: route draw, station pops, limb swings, bob, background reveals, confetti and
 * readout steps are pure CSS gated on `.is-playing`; only the walker's travel uses the Web
 * Animations API (path keyframes, constant arc-length within each step, repeated across each
 * hold). Everything rides ONE once-only timeline — no rAF loop, nothing runs at rest. A
 * quiet Replay control restarts the single `run()` code path.
 */

// Stage 06 (document_collection) is where almost everyone stalls. Illustrative default for
// the hero — NOT live case data.
const HERE = 6

export function HeroJourney() {
  const rootRef = useRef<HTMLDivElement>(null)
  const bgRef = useRef<SVGGElement>(null)
  const routeRef = useRef<SVGPathElement>(null)
  const route2Ref = useRef<SVGPathElement>(null)
  const stopsRef = useRef<SVGGElement>(null)
  const confettiRef = useRef<SVGGElement>(null)
  const walkerRef = useRef<SVGGElement>(null)
  const readoutRef = useRef<HTMLParagraphElement>(null)
  const replayRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const root = rootRef.current
    const bg = bgRef.current
    const path = routeRef.current
    const route2 = route2Ref.current
    const stops = stopsRef.current
    const conf = confettiRef.current
    const walker = walkerRef.current
    const readout = readoutRef.current
    const replay = replayRef.current
    if (!root || !bg || !path || !route2 || !stops || !conf || !walker || !readout || !replay) return

    const SVGNS = "http://www.w3.org/2000/svg"
    const N = CASE_STAGES.length // 13, the SSOT — never a retyped literal
    const SEGS = N - HERE // 7 remaining stages to walk
    const len = path.getTotalLength()
    const doneLen = len * ((HERE - 1) / (N - 1))
    const sLen = (k: number) => len * ((k - 1) / (N - 1)) // arc-length of station k
    const BESIDE = 12 // stand this far before a station so its ring stays visible beside the foot

    // ── timing — step then hold; everything derives from this (never a magic number) ──
    const T = {
      walkIn: 1350,
      walkInDur: 700,
      // the crossing begins the instant the walk-in ends (walkIn + walkInDur) — no dead
      // beat, and it lands each foot on an 800ms grid so holds are easy to read and sample.
      cross: 2050,
      step: 300, // walking between two stations
      hold: 500, // standing still at a station, readout held
      get segDur() { return this.step + this.hold }, // 800
      get crossDur() { return this.segDur * SEGS }, // 5600
      get arrive() { return this.cross + this.crossDur }, // 7650 (end of the final hold)
    }
    const landAt = T.arrive - T.hold // 7150 — the foot lands on stage 13; the finale fires here
    const landTime = (seg: number) => T.cross + (seg - 1) * T.segDur + T.step // foot lands at stage HERE+seg

    for (const el of [path, route2]) {
      el.style.setProperty("--done", String(doneLen))
      el.style.setProperty("--rest", String(len - doneLen))
      el.style.setProperty("--gap", String(len + 2)) // never let the dash pattern wrap onto the route
    }

    const LIFT = 2.5 // stand on the line, not through it
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches

    // Constant-arc-length samples between two arc-lengths (even-looking travel).
    const travelFrames = (from: number, to: number, lead?: { x: number; y: number }) => {
      const pts: { x: number; y: number }[] = []
      const STEPS = 24
      if (lead) pts.push(lead)
      for (let k = 0; k <= STEPS; k++) pts.push(path.getPointAtLength(from + (to - from) * (k / STEPS)))
      const cum = [0]
      for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y))
      const total = cum[cum.length - 1] || 1
      return { pts, cum, total }
    }

    // Walk-in: off-map → beside stage 06. Uniform, so a plain duration is right.
    const meet = doneLen - BESIDE
    const walkInKeyframes = () => {
      const p0 = path.getPointAtLength(0)
      const { pts, cum, total } = travelFrames(0, meet, { x: -52, y: p0.y })
      return pts.map((p, k) => ({
        transform: `translate(${p.x.toFixed(2)}px,${(p.y - LIFT).toFixed(2)}px)`,
        offset: Math.min(1, cum[k] / total),
      }))
    }

    // Cross: 7 segments. Each segment travels across `step` then REPEATS the arrival pose
    // across `hold`, so a uniform linear WAAPI animation moves-stops-moves. Offsets are
    // fractions of crossDur; the constant-arc-length sampling keeps each step even.
    const crossKeyframes = () => {
      const stopLens: number[] = [meet]
      for (let s = 1; s <= SEGS; s++) {
        const gi = HERE + s
        stopLens.push(gi === N ? len : sLen(gi) - BESIDE)
      }
      const segFrac = 1 / SEGS
      const stepFrac = (T.step / T.segDur) * segFrac // step portion within one segment of the whole timeline
      const kf: Keyframe[] = []
      for (let j = 0; j < SEGS; j++) {
        const segStart = j * segFrac
        const { pts, cum, total } = travelFrames(stopLens[j], stopLens[j + 1])
        for (let k = 0; k < pts.length; k++) {
          kf.push({
            transform: `translate(${pts[k].x.toFixed(2)}px,${(pts[k].y - LIFT).toFixed(2)}px)`,
            offset: Math.min(1, segStart + (cum[k] / total) * stepFrac),
          })
        }
        // hold: same arrival pose from end-of-travel to end-of-segment
        const endPt = pts[pts.length - 1]
        kf.push({
          transform: `translate(${endPt.x.toFixed(2)}px,${(endPt.y - LIFT).toFixed(2)}px)`,
          offset: Math.min(1, (j + 1) * segFrac),
        })
      }
      return kf
    }

    // ── build (recreate every generated node; safe for StrictMode AND replay) ──────
    const nameFor = (i: number) => CASE_STAGES[i - 1].short
    const build = () => {
      bg.replaceChildren()
      stops.replaceChildren()
      conf.replaceChildren()
      readout.replaceChildren()

      // stations (and collect NYPD-controlled x's for the band — never hardcoded)
      const nypdX: number[] = []
      for (let i = 1; i <= N; i++) {
        const stage = CASE_STAGES[i - 1]
        const pt = path.getPointAtLength(sLen(i))
        const ahead = i > HERE
        const nypd = isNypdControlled(stage.key)
        if (nypd) nypdX.push(pt.x)
        const d = ahead ? Math.round(1000 + (i - HERE) * 55) : Math.round(300 + ((i - 1) / (HERE - 1)) * 760)

        const c = document.createElementNS(SVGNS, "circle")
        c.setAttribute("cx", String(pt.x))
        c.setAttribute("cy", String(pt.y))
        c.setAttribute("r", String(i === HERE ? 9 : 6.5))
        c.setAttribute("class", "stop" + (ahead ? " ahead" : " done") + (i === HERE ? " here" : "") + (nypd ? " nypd" : ""))
        c.style.setProperty("--sd", d + "ms")
        if (ahead) c.style.setProperty("--ld", landTime(i - HERE) + "ms") // lights as the foot lands

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

      // ── background layers (all behind route + stations; all on the once-only timeline) ──
      // 2b · colour wash under the route — cool (left, travelled) to warm (right, ahead),
      // on the same userSpaceOnUse span as #hjGrad so it lines up with the route exactly.
      const wash = document.createElementNS(SVGNS, "rect")
      wash.setAttribute("x", "40"); wash.setAttribute("y", "150")
      wash.setAttribute("width", "560"); wash.setAttribute("height", "96")
      wash.setAttribute("rx", "40")
      wash.setAttribute("fill", "url(#hjGrad)")
      wash.setAttribute("class", "hj-wash")
      wash.style.setProperty("--wash-in", T.cross + "ms")
      bg.appendChild(wash)

      // 2a · the NYPD stretch band — extent derived from the NYPD station x's.
      if (nypdX.length) {
        const pad = 18
        const minX = Math.min(...nypdX) - pad
        const maxX = Math.max(...nypdX) + pad
        const band = document.createElementNS(SVGNS, "rect")
        band.setAttribute("x", String(minX)); band.setAttribute("y", "122")
        band.setAttribute("width", String(maxX - minX)); band.setAttribute("height", "132")
        band.setAttribute("rx", "10")
        band.setAttribute("class", "hj-band")
        band.style.setProperty("--band-in", landTime(2) + "ms") // reveal around when the walker reaches stage 08
        bg.appendChild(band)

        const bl = document.createElementNS(SVGNS, "text")
        bl.setAttribute("x", String(minX + 10)); bl.setAttribute("y", "133")
        bl.setAttribute("class", "hj-band-label")
        bl.style.setProperty("--band-in", landTime(2) + "ms")
        bl.textContent = "NYPD’S CLOCK"
        bg.appendChild(bl)
      }

      // 2c · arrival bloom at stage 13.
      const e = path.getPointAtLength(len)
      const bloom = document.createElementNS(SVGNS, "circle")
      bloom.setAttribute("cx", String(e.x)); bloom.setAttribute("cy", String(e.y))
      bloom.setAttribute("r", "120")
      bloom.setAttribute("fill", "url(#hjBloom)")
      bloom.setAttribute("class", "hj-bloom")
      bloom.style.setProperty("--bloom-in", landAt + "ms")
      bg.appendChild(bloom)

      // ── readout: one row at a time; appears as the foot lands, blanks during the next step ──
      const row = (html: string, inMs: number, outMs: number | null, cls?: string) => {
        const sp = document.createElement("span")
        if (cls) sp.className = cls
        sp.innerHTML = html
        sp.style.setProperty("--in", inMs + "ms")
        if (outMs != null) sp.style.setProperty("--out", outMs + "ms")
        readout.appendChild(sp)
      }
      row(`Stage 06 &middot; <b>${nameFor(HERE)}</b> &mdash; stalled, seven stages to go`, 1180, T.cross)
      for (let i = HERE + 1; i < N; i++) {
        const seg = i - HERE
        const inMs = landTime(seg)
        const suffix = isNypdControlled(CASE_STAGES[i - 1].key) ? "NYPD&rsquo;s clock, we track it" : "handled by us"
        row(`Stage ${String(i).padStart(2, "0")} &middot; <b>${nameFor(i)}</b> &mdash; ${suffix}`, inMs, inMs + T.hold)
      }
      row(`Stage 13 &middot; <b>${nameFor(N)}</b> &mdash; we walked you the rest`, landAt, null, "fin")

      // ── confetti at the finish line (fires on landing) ──
      conf.setAttribute("transform", `translate(${e.x},${e.y - 14})`)
      const COLS = ["--cyan", "--electric", "--violet", "--magenta", "--tangerine", "--shield-gold", "--success"]
      for (let i = 0; i < 34; i++) {
        const a = -Math.PI * 0.96 + Math.random() * (Math.PI * 0.7)
        const sp = 34 + Math.random() * 54
        const w = 2 + Math.random() * 2.4
        const h = 3.4 + Math.random() * 3.4
        const r = document.createElementNS(SVGNS, "rect")
        r.setAttribute("x", String(-w / 2)); r.setAttribute("y", String(-h / 2))
        r.setAttribute("width", String(w)); r.setAttribute("height", String(h))
        r.setAttribute("rx", ".6")
        r.setAttribute("class", "conf")
        r.style.fill = `var(${COLS[i % COLS.length]})`
        const dx = Math.cos(a) * sp
        const peak = Math.sin(a) * sp
        r.style.setProperty("--dx", dx.toFixed(1) + "px")
        r.style.setProperty("--peak", peak.toFixed(1) + "px")
        r.style.setProperty("--dy", (peak + 52 + Math.random() * 36).toFixed(1) + "px")
        r.style.setProperty("--rot", Math.round(-300 + Math.random() * 600) + "deg")
        r.style.setProperty("--cd", Math.round(1150 + Math.random() * 520) + "ms")
        r.style.setProperty("--cdel", Math.round(landAt + 60 + Math.random() * 220) + "ms")
        conf.appendChild(r)
      }
    }

    // ── run: the single code path the effect and the Replay button both call ──────
    let anims: Animation[] = []
    const run = () => {
      anims.forEach((a) => a.cancel())
      anims = []
      root.classList.remove("is-playing")
      build()
      void root.offsetWidth // reflow so re-adding the class restarts every CSS animation
      root.classList.add("is-playing")
      if (reduced) {
        const e = path.getPointAtLength(len)
        walker.style.transform = `translate(${e.x}px,${e.y - LIFT}px)`
        return
      }
      walker.style.transform = ""
      anims.push(walker.animate(walkInKeyframes(), { duration: T.walkInDur, delay: T.walkIn, easing: "linear", fill: "both" }))
      // 'forwards' only — 'both' back-applies the start pose and swallows the walk-in phase.
      anims.push(walker.animate(crossKeyframes(), { duration: T.crossDur, delay: T.cross, easing: "linear", fill: "forwards" }))
    }

    // start once when in view (observer only guards against starting off-screen on a deep link)
    let started = false
    const startOnce = () => { if (!started) { started = true; run() } }
    let observer: IntersectionObserver | null = null
    const rect = root.getBoundingClientRect()
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      startOnce()
    } else {
      observer = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { startOnce(); observer?.disconnect() }
      })
      observer.observe(root)
    }

    const onReplay = () => run() // replay re-runs the whole sequence through the one code path
    replay.addEventListener("click", onReplay)

    return () => {
      anims.forEach((a) => a.cancel())
      observer?.disconnect()
      replay.removeEventListener("click", onReplay)
    }
  }, [])

  return (
    <div className="hero-journey" ref={rootRef}>
      <p className="hj-kicker">Your licence — all thirteen stages</p>
      <svg
        viewBox="0 100 640 190"
        role="img"
        aria-label="Thirteen-stage licence journey: six done, then our shield walks you through the remaining seven to licensed. Stages nine to twelve sit on the NYPD's clock, which we track but do not control."
      >
        <defs>
          <linearGradient id="hjGrad" gradientUnits="userSpaceOnUse" x1="40" y1="0" x2="600" y2="0">
            <stop offset="0" style={{ stopColor: "var(--cyan)" }} />
            <stop offset=".28" style={{ stopColor: "var(--electric)" }} />
            <stop offset=".52" style={{ stopColor: "var(--violet)" }} />
            <stop offset=".74" style={{ stopColor: "var(--magenta)" }} />
            <stop offset="1" style={{ stopColor: "var(--tangerine)" }} />
          </linearGradient>
          <radialGradient id="hjBloom">
            <stop offset="0" style={{ stopColor: "var(--electric)" }} />
            <stop offset="1" style={{ stopColor: "var(--electric)", stopOpacity: 0 }} />
          </radialGradient>
        </defs>

        {/* Background layers — generated behind the route + stations (see effect). */}
        <g ref={bgRef} className="hj-bg" />

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
      {/* aria-live off: decorative narration of a visual; announcing eight stage changes in
          eight seconds would be hostile to a screen-reader user. */}
      <p className="hj-readout" ref={readoutRef} aria-live="off" aria-hidden="true" />
      {/* Quiet utility — the run is ~8s, so give people a way back to the start. Hidden under
          prefers-reduced-motion (there is nothing to replay). */}
      <button type="button" className="hj-replay" ref={replayRef} aria-label="Replay the licence journey animation">
        <span aria-hidden="true">↻</span> Replay
      </button>
    </div>
  )
}
