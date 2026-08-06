"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"

/**
 * V14 — THE COUNT, "catch, replace, clear."
 *
 * A desk of twenty-four paper documents (6×4, 4×6 on a phone). ONE reticle walks
 * a serpentine path; each sheet stamps a verdict (SATISFIED / CHASING / NEEDS A
 * FIX / EXPIRED), a flagged sheet is lifted away and a fresh one drawn in, and
 * clearing one problem raises another elsewhere — so the desk never drifts all
 * green and the mix holds near 17 / 3 / 3 / 1.
 *
 * The static desk, ledger, copy and the wall's descriptive aria-label are all
 * SERVER-RENDERED (real HTML for crawlers, and the correct no-JS / reduced-motion
 * still frame). The animation is run imperatively in one effect over a root ref —
 * no React state in the loop, no re-render after mount, so the DOM the effect
 * mutates is never reconciled out from under it. All motion is CSS (globals.css
 * `.the-count` / `tc-*`); every colour flows through config/brand.ts.
 *
 * A11y: the wall is `role="img"` with a label naming the verdict split (colour
 * carries meaning, so it must be described). Reticle, strip, ledger dots, edges
 * and glyphs are decoration. The ONLY tab stop is the /how-it-works link. Each
 * verdict also carries a distinct glyph + word, never colour alone.
 */

/* ── data, all index-derived so SSR and client agree ─────────────────────── */
const NAMED: Record<number, boolean> = { 2: true, 6: true, 10: true, 13: true, 21: true }
// 17 satisfied · 3 chasing · 3 needing a fix · 1 expired = 24. The named five
// cover all four states, and 11 (the safety course, index 10) is the expired
// one — the same certificate the ProductFeature card warns is aging out.
const V: Record<number, string> = {}
;[4, 13, 18].forEach((i) => (V[i] = "wait"))
;[8, 16, 21].forEach((i) => (V[i] = "fix"))
V[10] = "exp"
const verdict = (i: number) => V[i] || "ok"

const LABEL: Record<string, string> = { ok: "Satisfied", wait: "Chasing", fix: "Needs a fix", exp: "Expired", fresh: "Satisfied" }
const TONE: Record<string, string> = { ok: "#9BE7B8", wait: "#A8DDE8", fix: "#F0CE9A", exp: "#F0A0A3" }

/* the drawn marks — the fingerprint is three shallow arcs (reads as a print) */
function seal() {
  let t = ""
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2
    t +=
      `<line pathLength="1" x1="${(16 + Math.cos(a) * 10.5).toFixed(1)}" y1="${(16 + Math.sin(a) * 10.5).toFixed(1)}" ` +
      `x2="${(16 + Math.cos(a) * 13.5).toFixed(1)}" y2="${(16 + Math.sin(a) * 13.5).toFixed(1)}"/>`
  }
  return (
    '<svg class="mark seal right" viewBox="0 0 32 32" width="42%" fill="none" stroke="currentColor" stroke-width="1.1" stroke-linecap="round">' +
    '<circle pathLength="1" cx="16" cy="16" r="10.5"/><circle pathLength="1" cx="16" cy="16" r="5.6"/>' +
    t +
    "</svg>"
  )
}
const SIG =
  '<svg class="mark" viewBox="0 0 64 18" width="80%" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' +
  '<path pathLength="1" d="M2 13c5-10 8 3 12-4s6 6 10-1 7 5 11-2 8 4 12 1"/>' +
  '<line pathLength="1" x1="2" y1="17" x2="62" y2="17" stroke-width="1.1" opacity=".5"/></svg>'
const PRINT =
  '<svg class="mark right" viewBox="0 0 24 28" width="40%" fill="none" stroke="currentColor" stroke-width="1.25" stroke-linecap="round">' +
  '<path pathLength="1" d="M2.4 26C1 18.4 2 9.4 7 5.2c3-2.6 7-2.6 10 0C22 9.4 23 18.4 21.6 26"/>' +
  '<path pathLength="1" d="M5.9 26C5 19.2 5.6 12.4 9 9.4c2-1.8 4-1.8 6 0 3.4 3 4 9.8 3.1 16.6"/>' +
  '<path pathLength="1" d="M9.4 26c-.5-5.5-.3-11 2.1-13 .9-.7 1.7 0 2.1 1 1 2.6.8 7.2.4 12"/>' +
  '<path pathLength="1" d="M12 26c0-4 0-7 .4-9"/></svg>'
const STAMP =
  '<svg class="mark" viewBox="0 0 52 22" width="66%" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round">' +
  '<rect pathLength="1" x="1" y="1" width="50" height="20" rx="3" opacity=".9"/>' +
  '<line pathLength="1" x1="7" y1="8.5" x2="45" y2="8.5"/><line pathLength="1" x1="7" y1="14" x2="33" y2="14"/></svg>'

/* verdict glyphs (centre stamp) + corner chips (persistent) */
const G: Record<string, string> = {
  ok: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  fix: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"><path d="M12 4v10"/><path d="M12 19.4v.2"/></svg>',
  exp: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  wait: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round"><circle cx="12" cy="12" r="8.5" stroke-dasharray="7 6"/></svg>',
}
const chipSvg = (v: string) => G[v === "fresh" ? "ok" : v].replace("<svg ", '<svg class="vchip" ')

/* build the 24 cells ONCE (module scope) — the component never rebuilds them */
type Cell = { i: number; named: string | null; v: string; breathe: boolean; sheet: string; vars: Record<string, string | number> }
const CELLS: Cell[] = Array.from({ length: 24 }, (_, i) => {
  const row = Math.floor(i / 6)
  // the row offset is load-bearing: `i % 6` alone makes the mark equal the
  // column and the desk renders as six identical stripes.
  const t = (i + row) % 6
  const r = ((i % 5) - 2) * 0.55
  const ry = ((i % 3) - 1) * 5
  const dx = (-1.35 - (i % 6)) * 1.13
  const dy = (1.5 - row) * 1.1
  let mark = ""
  if (t === 1) mark = '<div class="photo"></div>'
  else if (t === 2) mark = seal()
  else if (t === 3) mark = SIG
  else if (t === 4) mark = PRINT
  else if (t === 5) mark = STAMP
  const lines = t === 0 ? ["w92", "w78", "w92", "w64"] : t === 1 || t === 4 ? ["w92", "w64"] : ["w92", "w78", "w50"]
  let li = 1
  const body = lines.map((cls) => `<div class="ln ${cls}" style="--li:${li++}"></div>`).join("")
  const hd = `<div class="hd ${i % 3 === 0 ? "w64" : "w50"}" style="--li:0"></div>`
  return {
    i,
    named: NAMED[i] ? String(i + 1).padStart(2, "0") : null,
    v: verdict(i),
    breathe: i % 3 === 0,
    sheet: hd + mark + body,
    vars: { "--i": i, "--r": `${r.toFixed(2)}deg`, "--ry": `${ry}px`, "--dx": dx.toFixed(2), "--dy": dy.toFixed(2) },
  }
})

/* the five named documents surfaced in the ledger (index, verdict, provenance) */
const LEDGER = [
  { idx: 2, v: "ok", ix: "03", nm: "Four notarized references", src: "Four people who know you" },
  { idx: 6, v: "ok", ix: "07", nm: "Passport-style photo", src: "You" },
  { idx: 10, v: "exp", ix: "11", nm: "18-hour safety course", src: "Your certified instructor" },
  { idx: 13, v: "wait", ix: "14", nm: "A statement from everyone at home", src: "Every adult in your household" },
  { idx: 21, v: "fix", ix: "22", nm: "Proof any past record is resolved", src: "The court that heard it" },
]

export function TheCount() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const $ = <T extends Element = HTMLElement,>(sel: string) => root.querySelector(sel) as T | null
    const wall = $(".wall")!
    const artwrap = $(".artwrap")!
    const head = $(".audit")!
    const nnum = $(".nnum")!
    const nlab = $<HTMLElement>(".nlab")!
    const SHEETS = Array.from(root.querySelectorAll<HTMLElement>(".doc"))
    const rows = Array.from(root.querySelectorAll<HTMLElement>(".ledger li"))
    const TN: Record<string, HTMLElement | null> = {
      ok: $(".t.ok em"),
      wait: $(".t.wait em"),
      fix: $(".t.fix em"),
      exp: $(".t.exp em"),
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches

    type Doc = { el: HTMLElement; i: number; state: string; bucket: string; timers: ReturnType<typeof setTimeout>[] }
    const docs: Doc[] = SHEETS.map((el, i) => {
      const v = verdict(i)
      return { el, i, state: v, bucket: v, timers: [] }
    })
    const later = (d: Doc, fn: () => void, ms: number) => d.timers.push(setTimeout(fn, ms))
    const clearDoc = (d: Doc) => {
      d.timers.forEach(clearTimeout)
      d.timers = []
    }

    /* repaint a sheet for its current state */
    function paint(d: Doc) {
      const v = d.state
      d.el.setAttribute("data-v", v)
      const chip = d.el.querySelector(".chipslot")!
      chip.innerHTML = v === "fresh" ? "" : chipSvg(v)
      d.el.querySelector(".vglyph")!.innerHTML = G[v === "fresh" ? "ok" : v]
      d.el.querySelector(".vlabel")!.textContent = LABEL[v === "fresh" ? "ok" : v].toUpperCase()
      const li = rows.filter((x) => +x.getAttribute("data-idx")! === d.i)[0]
      if (li) li.setAttribute("data-v", d.bucket)
    }
    function tally() {
      const c: Record<string, number> = { ok: 0, wait: 0, fix: 0, exp: 0 }
      docs.forEach((d) => c[d.bucket]++)
      for (const k in TN) if (TN[k]) TN[k]!.textContent = String(c[k])
    }
    tally()

    /* serpentine order — rebuilt when the column count changes */
    let COLS = 6
    let ORDER: { i: number; c: number; r: number }[] = []
    function buildOrder() {
      COLS = window.matchMedia("(max-width: 600px)").matches ? 4 : 6
      const rowsN = 24 / COLS
      ORDER = []
      for (let r2 = 0; r2 < rowsN; r2++) {
        for (let k = 0; k < COLS; k++) {
          const c = r2 % 2 === 0 ? k : COLS - 1 - k
          ORDER.push({ i: r2 * COLS + c, c, r: r2 })
        }
      }
    }
    function syncDeal() {
      SHEETS.forEach((d, i) => {
        const col = i % COLS
        const row = Math.floor(i / COLS)
        d.style.setProperty("--dx", ((-1.35 - col) * 1.13).toFixed(2))
        d.style.setProperty("--dy", ((24 / COLS / 2 - 0.5 - row) * 1.1).toFixed(2))
      })
    }
    buildOrder()
    syncDeal()
    const mq = window.matchMedia("(max-width: 600px)")
    const onMq = () => {
      buildOrder()
      syncDeal()
    }
    mq.addEventListener("change", onMq)

    /* restart the scan line by REMOUNTING the .scan node (reflow-free) */
    function restartScan() {
      const old = head.querySelector(".scan")
      if (!old) return
      const fresh = old.cloneNode(false)
      old.replaceWith(fresh)
    }

    const STEP = 1450
    const MOVE = 360
    const VERDICT_AT = 960 // the stamp lands AFTER the 560ms scan finishes
    const HOLD_OK = 900 // a satisfied stamp holds past the head leaving, then fades
    const SETTLE = 3400 // a flagged sheet stays on the desk before the swap
    const FLAG_DELAY = [5200, 6800, 8400]
    let running = false
    let cursor = 0
    let prev: Doc | null = null
    let resolved = 0
    let timers: ReturnType<typeof setTimeout>[] = []
    const T = (fn: () => void, ms: number) => timers.push(setTimeout(fn, ms))
    const clearAll = () => {
      timers.forEach(clearTimeout)
      timers = []
    }

    /* the flagged sheet is taken away and a fresh one put in its place */
    function replace(d: Doc) {
      if (!running) return
      d.el.setAttribute("data-swap", "out")
      later(
        d,
        () => {
          d.el.removeAttribute("data-stage")
          d.state = "fresh"
          paint(d)
          d.el.setAttribute("data-swap", "in")
          later(d, () => d.el.removeAttribute("data-swap"), 700)
        },
        440
      )
    }

    /* resolving one problem raises another elsewhere, on the satisfied sheet
       furthest from the head, so the desk never settles all-green */
    function raiseFlag(kind: string, seed: number) {
      const here = ORDER[cursor % ORDER.length].i
      const pool = docs.filter((d) => d.state === "ok" && d.i !== here)
      if (!pool.length) return
      pool.sort((a, b) => Math.abs(b.i - here) - Math.abs(a.i - here))
      const d = pool[seed % Math.min(4, pool.length)]
      clearDoc(d)
      d.state = kind
      d.bucket = kind
      paint(d)
      tally()
      d.el.setAttribute("data-flagging", "true")
      later(d, () => d.el.removeAttribute("data-flagging"), 700)
    }

    function step() {
      const cell = ORDER[cursor % ORDER.length]
      const d = docs[cell.i]
      if (prev && prev !== d) {
        prev.el.removeAttribute("data-audit")
        prev.el.removeAttribute("data-read")
      }
      head.style.setProperty("--c", String(cell.c))
      head.style.setProperty("--r2", String(cell.r))
      head.style.setProperty("--as", NAMED[cell.i] ? "1.12" : "1.045")

      T(() => {
        /* the head arrives */
        if (!running) return
        d.el.setAttribute("data-audit", "true")
        prev = d
        head.setAttribute("data-scan", "true")
        restartScan()
        T(() => {
          if (running) d.el.setAttribute("data-read", "true")
        }, 110)
        rows.forEach((x) => {
          if (+x.getAttribute("data-idx")! === cell.i) x.setAttribute("data-on", "true")
        })
        nnum.textContent = String(cell.i + 1).padStart(2, "0")
      }, MOVE)

      T(() => {
        /* the verdict lands */
        if (!running) return
        d.el.removeAttribute("data-read")
        const shown = d.state === "fresh" ? "ok" : d.state
        d.el.setAttribute("data-stage", "verdict")
        nlab.textContent = LABEL[shown]
        nlab.style.color = TONE[shown]

        if (d.state === "fresh") {
          /* the replacement clears — and its ledger row goes green */
          d.state = "ok"
          d.bucket = "ok"
          paint(d)
          tally()
          /* replace the flag in whichever bucket is furthest below target, so
             the mix stays pinned near 17 / 3 / 3 / 1 instead of drifting green */
          const TARGET: Record<string, number> = { wait: 3, fix: 3, exp: 1 }
          const c: Record<string, number> = { ok: 0, wait: 0, fix: 0, exp: 0 }
          docs.forEach((x) => c[x.bucket]++)
          const kind = Object.keys(TARGET).sort((a, b) => TARGET[b] - c[b] - (TARGET[a] - c[a]))[0]
          resolved++
          T(() => {
            if (running) raiseFlag(kind, resolved)
          }, FLAG_DELAY[resolved % 3])
        }
      }, VERDICT_AT)

      T(() => {
        /* release, and move on */
        if (!running) return
        rows.forEach((x) => {
          if (+x.getAttribute("data-idx")! === cell.i) x.removeAttribute("data-on")
        })
        if (d.state === "ok") {
          /* keep the stamp for a beat, THEN let it fade — the head is already
             two cells away (removing data-stage now is what makes it blink) */
          later(d, () => d.el.removeAttribute("data-stage"), HOLD_OK)
        } else {
          d.el.setAttribute("data-stage", "flagged") // the flag stays on the desk
          later(d, () => replace(d), SETTLE)
        }
        cursor++
        step()
      }, STEP)
    }

    function start() {
      if (running || reduce) return
      running = true
      artwrap.setAttribute("data-live", "true")
      clearAll()
      /* anything left flagged when we paused still owes a replacement */
      docs.forEach((d) => {
        if (d.el.getAttribute("data-stage") === "flagged") {
          clearDoc(d)
          later(d, () => replace(d), SETTLE)
        }
      })
      step()
    }
    function stop() {
      running = false
      artwrap.setAttribute("data-live", "false")
      clearAll()
      docs.forEach(clearDoc)
      if (prev) {
        prev.el.removeAttribute("data-audit")
        prev.el.removeAttribute("data-read")
      }
      head.removeAttribute("data-scan")
      SHEETS.forEach((el) => {
        if (el.getAttribute("data-stage") === "verdict") el.removeAttribute("data-stage")
        el.removeAttribute("data-swap")
        el.removeAttribute("data-flagging")
      })
      rows.forEach((x) => x.removeAttribute("data-on"))
    }

    /* entrance, then the loop — pause off-screen and on a hidden tab */
    let seen = false
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          if (!seen) {
            seen = true
            if (!reduce && e[0].boundingClientRect.top > 0) {
              wall.setAttribute("data-play", "true")
              // MUST drop data-play once the entrance is done, or it stays in the
              // cascade and re-fires `deal` on any breathing cell whose
              // :not([data-audit]) guard stops matching.
              T(() => {
                wall.removeAttribute("data-play")
                start()
              }, 1800)
            } else start()
          } else start()
        } else stop()
      },
      { threshold: 0.12 }
    )
    io.observe(wall)

    const onVis = () => {
      if (document.hidden) stop()
      else if (seen) start()
    }
    document.addEventListener("visibilitychange", onVis)

    /* pointer parallax — CSS vars written straight to the node, never state */
    let onMove: ((ev: PointerEvent) => void) | null = null
    let onLeave: (() => void) | null = null
    if (!reduce && window.matchMedia("(hover: hover)").matches) {
      let raf = 0
      let tx = 0
      let ty = 0
      onMove = (ev: PointerEvent) => {
        const b = artwrap.getBoundingClientRect()
        tx = ((ev.clientX - b.left) / b.width - 0.5) * 2
        ty = ((ev.clientY - b.top) / b.height - 0.5) * 2
        artwrap.setAttribute("data-track", "true")
        if (!raf)
          raf = requestAnimationFrame(() => {
            raf = 0
            wall.style.setProperty("--px", tx.toFixed(3))
            wall.style.setProperty("--py", ty.toFixed(3))
          })
      }
      onLeave = () => {
        artwrap.removeAttribute("data-track")
        wall.style.setProperty("--px", "0")
        wall.style.setProperty("--py", "0")
      }
      artwrap.addEventListener("pointermove", onMove)
      artwrap.addEventListener("pointerleave", onLeave)
    }

    return () => {
      io.disconnect()
      document.removeEventListener("visibilitychange", onVis)
      mq.removeEventListener("change", onMq)
      if (onMove) artwrap.removeEventListener("pointermove", onMove)
      if (onLeave) artwrap.removeEventListener("pointerleave", onLeave)
      stop()
    }
  }, [])

  return (
    <section ref={rootRef} className="the-count" id="the-count">
      <span className="horizon top" aria-hidden />
      <div className="tc-wrap">
        <div className="tc-grid">
          {/* the desk */}
          <div className="tc-art">
            <div className="artwrap" data-live="false">
              <div className="lamp" aria-hidden />
              <div
                className="wall"
                role="img"
                aria-label="Twenty-four documents drawn as paper forms on a desk, each carrying a status: seventeen satisfied, three being chased, three needing a fix, and one expired. One review marker moves continuously across them. Five are highlighted and numbered: four notarized references, a passport-style photo, the 18-hour safety course, a statement from everyone at home, and proof any past record is resolved."
              >
                {CELLS.map((cell) => (
                  <div
                    key={cell.i}
                    className={`doc${cell.named ? " named" : ""}`}
                    data-i={cell.i}
                    data-v={cell.v}
                    {...(cell.breathe ? { "data-breathe": "1" } : {})}
                    style={cell.vars as React.CSSProperties}
                  >
                    <div className="sheet paper" dangerouslySetInnerHTML={{ __html: cell.sheet }} />
                    <span className="vedge" aria-hidden />
                    <div className="verdict" aria-hidden>
                      <div className="vwash" />
                      <span className="vring" />
                      <div className="vglyph" dangerouslySetInnerHTML={{ __html: G[cell.v] }} />
                      <div className="vlabel">{LABEL[cell.v].toUpperCase()}</div>
                    </div>
                    <span className="chipslot" aria-hidden dangerouslySetInnerHTML={{ __html: chipSvg(cell.v) }} />
                    {cell.named && <span className="idx">{cell.named}</span>}
                  </div>
                ))}
                <div className="audit" aria-hidden>
                  <b />
                  <b />
                  <b />
                  <b />
                  <span className="scan" />
                </div>
              </div>

              <div className="strip" aria-hidden>
                <span className="now">
                  <span className="dot" />
                  <span className="nnum">01</span>
                  <span className="nsep">/ 24</span>
                  <span className="nlab">checking</span>
                </span>
                <span className="tallies">
                  <span className="t ok">
                    <i />
                    <em>17</em>
                  </span>
                  <span className="t wait">
                    <i />
                    <em>3</em>
                  </span>
                  <span className="t fix">
                    <i />
                    <em>3</em>
                  </span>
                  <span className="t exp">
                    <i />
                    <em>1</em>
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* copy */}
          <div className="tc-head">
            <div className="eyerule" aria-hidden />
            <div className="eyebrow">
              <i aria-hidden>[</i>
              <span>Everything you&rsquo;ll need</span>
              <i aria-hidden>]</i>
            </div>
            <h2 className="tch">
              Twenty-four documents stand between you and your license.{" "}
              <span className="q">We track every one.</span>
            </h2>
            <p className="lead">
              Only some of them are yours to write. <b>Four come from people who know you</b>, one from your instructor,
              others from a court or an agency. We hold, track, and chase every one &mdash; so you never have to keep the
              list in your head.
            </p>
          </div>

          {/* the five, and the CTA to the full list */}
          <div className="tc-tail">
            <div className="lcap">
              <span className="t2">Five of the twenty-four</span>
              <span className="c">Where it comes from</span>
            </div>
            <ul className="ledger">
              {LEDGER.map((r) => (
                <li key={r.idx} data-idx={r.idx} data-v={r.v}>
                  <span className="sdot" aria-hidden />
                  <span className="ix">{r.ix}</span>
                  <span className="nm">{r.nm}</span>
                  <span className="src">
                    <em>{r.src}</em>
                  </span>
                </li>
              ))}
            </ul>
            <Link className="cta" href="/how-it-works">
              See the full list
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <p className="ctanote">All twenty-four, with the rule each one comes from.</p>
          </div>
        </div>
      </div>
      <span className="horizon bot" aria-hidden />
    </section>
  )
}
