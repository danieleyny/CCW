/**
 * HERO FILM — deterministic geometry (ported verbatim from mockups/hero-film-v6.html).
 *
 * Everything here is INDEX-DERIVED with a hashed sine — never Math.random — so the
 * server and client render byte-identical markup (no hydration mismatch), the
 * confetti burst looks the same on every loop, and a screenshot diff is meaningful.
 *
 * These generators originally built SVG via innerHTML in a single static file; here
 * they export plain data arrays and the component maps them to real JSX (no
 * dangerouslySetInnerHTML). The numbers — columns, heights, pivots, per-piece
 * physics — were solved/measured in the mockup and are copied, not re-derived.
 *
 * Colour policy: brand-accent colours flow through config/brand.ts tokens
 * (--brass / --brass-bright / --brass-deep / --signal / --ok / --danger) so a
 * palette change can't silently drift. The bespoke warm-PAPER illustration tones
 * (sheet shadings, desk browns, figure ink) have no dark-palette token equivalent
 * and are kept as literals — they mirror paletteLight's paper family.
 */

/* ── the pile: exactly 24 sheets — 19 stacked in 7 columns + 3 sliding + 2 on the floor ── */
const DESK = 306
const COLS = [306, 350, 394, 438, 480, 520, 558]
const HEIGHTS = [5, 4, 3, 3, 2, 1, 1] // 19 stacked

export type Sheet = { i: number; x: number; y: number; w: number; r: number }

function buildPaper(): Sheet[] {
  const out: Sheet[] = []
  COLS.forEach((cx, c) => {
    for (let k = 0; k < HEIGHTS[c]; k++) {
      const i = out.length
      out.push({
        i,
        x: cx - 48 + (((i * 29) % 17) - 8),
        y: DESK - 23 - k * 18 - ((i * 13) % 7),
        w: 88 + ((i * 23) % 4) * 9,
        r: ((i * 37) % 29) - 14, // ±14° — a heap, not a wall
      })
    }
  })
  out.push({ i: out.length, x: 470, y: DESK - 9, w: 92, r: 24 })
  out.push({ i: out.length, x: 552, y: DESK - 15, w: 84, r: -27 })
  out.push({ i: out.length, x: 544, y: DESK - 40, w: 90, r: 11 })
  return out
}

/** The 24 sheets behind the figure. */
export const PAPER: Sheet[] = buildPaper()

/** Two sheets already on the floor (moved up for the 1.85:1 plate crop so the
 *  shorter frame doesn't decapitate them). Indices reuse tone slots 1 and 2. */
export const FLOOR: Sheet[] = [
  { i: 1, x: 146, y: 364, w: 98, r: -13 },
  { i: 2, x: 412, y: 382, w: 90, r: 9 },
]

/** Warm-paper sheet tones (bespoke illustration literals; mirror paletteLight paper). */
export const SHEET_TONES = ["#FFFDF8", "#F8F3E9", "#FBF7EF"] as const

/** Two ruled lines drawn on a sheet, index-derived. */
export function sheetLines(p: Sheet, i: number) {
  const lines: { x: number; y: number; w: number }[] = []
  for (let l = 0; l < 2; l++) {
    lines.push({ x: p.x + 9, y: p.y + 7 + l * 7, w: p.w - 18 - ((i + l) % 3) * 14 })
  }
  return lines
}

/* ── confetti: 56 pieces, half behind the card + half in front, deterministic ── */
function rnd(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453
  return x - Math.floor(x)
}

// brass/brass-bright/paper/paper-hi/brass/brass-bright/ok/brass-deep
const CF_TONE = [
  "var(--brass)",
  "var(--brass-bright)",
  "#F4F2EE", // paper
  "#FFF6E2", // paper-hi
  "var(--brass)",
  "var(--brass-bright)",
  "var(--ok)",
  "var(--brass-deep)",
] as const

export type ConfettiPiece = {
  i: number
  front: boolean
  x: number
  y: number
  dx: number
  up: number
  dy: number
  rot: number
  t: number
  d: number
  tone: string
  kind: number
}

function buildConfetti(): ConfettiPiece[] {
  const out: ConfettiPiece[] = []
  for (let i = 0; i < 56; i++) {
    const front = i >= 36 // confetti(0,36,false) behind, confetti(36,56,true) in front
    const x = 202 + rnd(i, 1) * 236
    const y = 198 + rnd(i, 2) * 44
    const dx0 = (rnd(i, 3) - 0.5) * 640
    const dx = front ? dx0 * 1.3 + (dx0 < 0 ? -70 : 70) : dx0
    const up = -(78 + rnd(i, 4) * 142)
    const dy = 280 + rnd(i, 5) * 220
    const rot = (rnd(i, 6) - 0.5) * 1640
    const t = 2.15 + rnd(i, 7) * 0.95
    const d = 0.46 + rnd(i, 8) * 0.5
    out.push({
      i,
      front,
      x: +x.toFixed(1),
      y: +y.toFixed(1),
      dx: +dx.toFixed(0),
      up: +up.toFixed(0),
      dy: +dy.toFixed(0),
      rot: +rot.toFixed(0),
      t: +t.toFixed(2),
      d: +d.toFixed(2),
      tone: CF_TONE[i % CF_TONE.length],
      kind: i % 3,
    })
  }
  return out
}

export const CONFETTI: ConfettiPiece[] = buildConfetti()
export const CONFETTI_BACK = CONFETTI.filter((p) => !p.front)
export const CONFETTI_FRONT = CONFETTI.filter((p) => p.front)

/* ── the seal's 18 radial ticks ── */
export const SEAL_TICKS = Array.from({ length: 18 }, (_, t) => {
  const a = (t / 18) * Math.PI * 2
  return {
    x1: +(Math.cos(a) * 13.5).toFixed(1),
    y1: +(Math.sin(a) * 13.5).toFixed(1),
    x2: +(Math.cos(a) * 17).toFixed(1),
    y2: +(Math.sin(a) * 17).toFixed(1),
  }
})

/* ── the checklist rows — real published requirements.
   §8 rulings: references × 4 (requiredReferences carry = 4), 16-hour course and
   household affidavits are published; fingerprints SOFTENED to "submitted" because
   the NYPD schedules the in-person prints, not us. ── */
export const ROWS = [
  "Character references × 4 · notarized",
  "16-hour safety course · certificate",
  "Household affidavits · every adult",
  "Fingerprints · submitted",
] as const
