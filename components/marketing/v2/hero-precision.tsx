import { CASE_STAGES, isNypdControlled } from "@/config/stages"
import { HeroPrecisionReplay } from "./hero-precision-replay"

/**
 * Homepage hero — "Precision Becomes Process".
 *
 * A museum-grade, code-native technical sculpture: an abstract, intentionally non-
 * operational side-profile precision object built from five translucent acrylic plates,
 * standing before thirteen archival case planes (one per CASE_STAGES entry) that fan into
 * a staircase, over a quiet NYC relief and concentric focus apertures, with a spectral
 * datum threading the whole system. A glass-case frame with brass anchors encloses it.
 *
 * Everything is a server-rendered inline SVG — no canvas/WebGL/raster/video, no animation
 * dependency. The ~3.85s entrance is pure CSS (transform + opacity only) that departs from
 * the designed "Ready" frame and settles on the resolved composition, then holds perfectly
 * still. The resolved composition is the base style, so reduced-motion / no-JS / unsupported
 * browsers all get the finished still. See app/(marketing)/hero-precision.css.
 *
 * Honesty: NYPD-controlled stages (isNypdControlled) wear a dashed plane edge and a muted
 * "NYPD" tag — marked, never implied to be under our control. No operational firearm imagery.
 */

// Plane geometry for stage index i (0 = stage 01, front/bottom-left … 12 = stage 13, back/top-right).
// Wide planes with a tight horizontal stagger so their numerals/tags cascade in a clear
// column on the LEFT leading edge — out from under the (translucent) precision object.
const PLANE_W = 330
const PLANE_H = 22
const planeX = (i: number) => 104 + i * 4
const planeY = (i: number) => 432 - i * 17

export function HeroPrecision() {
  const N = CASE_STAGES.length // 13 — the source of truth

  // Planes are rendered back-to-front (stage 13 first) so stage 01 sits on top, matching the
  // staircase. Built in natural order for correct numbers/delays, then reversed for paint order.
  const planes = CASE_STAGES.map((stage, i) => {
    const x = planeX(i)
    const y = planeY(i)
    const nypd = isNypdControlled(stage.key)
    const num = String(i + 1).padStart(2, "0")
    return (
      <g
        key={stage.key}
        className={"hp-plane" + (nypd ? " hp-plane--nypd" : "")}
        style={{ ["--i" as string]: i }}
      >
        <rect className="hp-plane-face" x={x} y={y} width={PLANE_W} height={PLANE_H} rx="4" />
        <rect className="hp-plane-edge" x={x} y={y} width={PLANE_W} height={PLANE_H} rx="4" />
        {/* numeral + NYPD tag on the exposed LEFT leading edge, clear of the firearm */}
        <text className="hp-plane-num" x={x + 7} y={y + 15}>{num}</text>
        {nypd && <text className="hp-plane-tag" x={x + 28} y={y + 15}>NYPD</text>}
        <circle className="hp-tick" cx={x + PLANE_W - 16} cy={y + PLANE_H / 2} r="4.2" />
      </g>
    )
  })

  return (
    <div className="hero-precision" aria-label="">
      <p className="sr-only">
        Thirteen organized stages form a staircase behind an abstract precision sculpture — a
        complex New York City firearms-licensing process made clear and navigable. Stages nine
        through twelve are controlled by the NYPD, which we track but do not control.
      </p>

      {/* The sculpture is decorative; its meaning is in the copy and the description above. */}
      <svg className="hp-svg" viewBox="0 0 640 600" role="img" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hpSpectral" gradientUnits="userSpaceOnUse" x1="210" y1="320" x2="520" y2="230">
            <stop offset="0" style={{ stopColor: "var(--cyan)" }} />
            <stop offset=".3" style={{ stopColor: "var(--electric)" }} />
            <stop offset=".55" style={{ stopColor: "var(--violet)" }} />
            <stop offset=".78" style={{ stopColor: "var(--magenta)" }} />
            <stop offset="1" style={{ stopColor: "var(--tangerine)" }} />
          </linearGradient>
          <radialGradient id="hpAperture">
            <stop offset="0" style={{ stopColor: "var(--electric)", stopOpacity: 0.12 }} />
            <stop offset="1" style={{ stopColor: "var(--electric)", stopOpacity: 0 }} />
          </radialGradient>
          {/* acrylic sheen for the precision plates — lighter top, cool translucent base */}
          <linearGradient id="hpGlass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: "var(--paper)", stopOpacity: 0.9 }} />
            <stop offset="0.5" style={{ stopColor: "var(--paper)", stopOpacity: 0.62 }} />
            <stop offset="1" style={{ stopColor: "color-mix(in srgb, var(--electric) 22%, var(--paper))", stopOpacity: 0.66 }} />
          </linearGradient>
        </defs>

        {/* Layer 2 + 3 + 5 — focus field: NYC relief, aperture rings, coordinate annotation.
            Animates as one "align" group late in the sequence. */}
        <g className="hp-focus">
          <circle className="hp-aperture-glow" cx="470" cy="214" r="150" fill="url(#hpAperture)" />
          <circle className="hp-ring" cx="470" cy="214" r="62" />
          <circle className="hp-ring" cx="470" cy="214" r="104" />
          <circle className="hp-ring" cx="470" cy="214" r="150" />
          <circle className="hp-ring hp-ring--faint" cx="470" cy="214" r="196" />
          {/* abstract borough relief — not a survey-accurate map */}
          <path className="hp-relief" d="M486 96 q34 6 40 34 q-10 26 -34 30 q-30 -4 -28 -36 q6 -24 22 -62 Z" />
          <path className="hp-relief" d="M436 180 q40 -6 54 26 q6 40 -30 54 q-44 8 -56 -28 q0 -34 32 -52 Z" />
          <path className="hp-relief" d="M540 272 q44 2 50 40 q-10 34 -48 34 q-40 -6 -36 -44 q8 -26 34 -30 Z" />
          <path className="hp-relief" d="M452 330 q46 0 52 40 q-6 42 -52 44 q-46 -4 -44 -46 q6 -32 44 -38 Z" />
          <text className="hp-boro" x="470" y="214">MANHATTAN</text>
          <text className="hp-boro" x="520" y="120">THE BRONX</text>
          <text className="hp-boro" x="582" y="302">QUEENS</text>
          <text className="hp-boro" x="470" y="372">BROOKLYN</text>
          <text className="hp-coord" x="596" y="70" textAnchor="end">40.78° N · 73.97° W</text>
          <text className="hp-coord" x="596" y="548" textAnchor="end">13 STEPS — ONE CLEAR PATH</text>
          {/* calibration ticks down the right datum */}
          {[150, 190, 230, 270, 310, 350].map((ty) => (
            <line key={ty} className="hp-cal" x1="604" y1={ty} x2="614" y2={ty} />
          ))}
        </g>

        {/* "YOUR LICENCE — ALL THIRTEEN STAGES" bracket + 01…13 scale on the left */}
        <g className="hp-bracket">
          <path className="hp-bracket-line" d="M78 208 h-10 v196 h10" />
          {/* both caption lines sit at top-left, above the stack, so neither is clipped */}
          <text className="hp-bracket-cap" x="56" y="176" textAnchor="start">YOUR LICENCE</text>
          <text className="hp-bracket-sub" x="56" y="190" textAnchor="start">ALL THIRTEEN STAGES</text>
          <text className="hp-scale" x="52" y="212">13</text>
          <text className="hp-scale" x="52" y="406">01</text>
        </g>

        {/* Layer 4 + 5 — the thirteen archival case planes (back-to-front) */}
        <g className="hp-planes">{planes.reverse()}</g>

        {/* Layer 6 — the precision object: five translucent plates forming an abstract,
            non-operational side-profile silhouette on a glass base with brass anchors. */}
        <g className="hp-plates">
          {/* glass base + brass anchors (the archival chamber footing) */}
          <rect className="hp-base" x="206" y="456" width="312" height="13" rx="3" />
          <rect className="hp-brass" x="232" y="467" width="11" height="15" rx="2" />
          <rect className="hp-brass" x="481" y="467" width="11" height="15" rx="2" />

          {/* ONE continuous side-profile silhouette — slide+frame over a raked grip, with the
              trigger-guard VOID cut out (evenodd). The five plates below share these edges and
              only articulate / separate the acrylic; the object always reads as one piece.
              Translucent (acrylic) — nothing text sits behind it, so nothing ghosts through. */}
          <path className="hp-object-bed" fillRule="evenodd"
            d="M200 292 L516 292 L516 348 L308 348 L266 450 L210 450 L250 348 L200 348 Z
               M352 348 L352 366 Q352 374 376 374 Q400 374 400 366 L400 348 L392 348 L392 364 Q392 368 376 368 Q360 368 360 364 L360 348 Z" />

          {/* plate 5 · grip (smoked), shares its top edge with the frame bottom */}
          <path className="hp-plate hp-plate--grip" style={{ ["--i" as string]: 4 }}
            d="M308 348 L266 450 L210 450 L250 348 Z" />
          <circle className="hp-grip-dot" cx="276" cy="398" r="5" />

          {/* plate 4 · trigger-guard ring, joined to the frame at both ends (never a trigger) */}
          <path className="hp-plate hp-plate--guard" fillRule="evenodd" style={{ ["--i" as string]: 3 }}
            d="M352 348 L352 366 Q352 374 376 374 Q400 374 400 366 L400 348 L392 348 L392 364 Q392 368 376 368 Q360 368 360 364 L360 348 Z" />

          {/* plate 3 · frame / receiver — shares its top edge with the slide, bottom with grip+guard */}
          <rect className="hp-plate hp-plate--frame" style={{ ["--i" as string]: 2 }}
            x="240" y="318" width="276" height="30" rx="5" />

          {/* plate 2 · barrel tip, flush to the slide front */}
          <rect className="hp-plate hp-plate--muzzle" style={{ ["--i" as string]: 1 }}
            x="516" y="305" width="18" height="15" rx="3" />

          {/* plate 1 · slide (top) — shares its bottom edge with the frame; carries the datum */}
          <rect className="hp-plate hp-plate--slide" style={{ ["--i" as string]: 0 }}
            x="200" y="292" width="316" height="28" rx="8" />
          <rect className="hp-slide-cut" x="372" y="297" width="84" height="4.5" rx="2" />
        </g>

        {/* Layer 7 — spectral signal: a scaleX datum along the slide + staggered spectral
            nodes that light each plane. One system threading the whole case. */}
        <g className="hp-signal">
          <line className="hp-datum" x1="210" y1="306" x2="508" y2="306" />
          {CASE_STAGES.map((stage, i) => (
            <circle
              key={stage.key}
              className="hp-node"
              style={{ ["--i" as string]: i }}
              cx={planeX(i) + PLANE_W - 16}
              cy={planeY(i) + PLANE_H / 2}
              r="2.3"
            />
          ))}
        </g>

        {/* Layer 8 — stage-13 completion mark (brass), revealed only at the end */}
        <g className="hp-finish">
          <circle className="hp-finish-ring" cx={planeX(N - 1) + PLANE_W - 16} cy={planeY(N - 1) + PLANE_H / 2} r="9" />
          <path className="hp-finish-check"
            d={`M${planeX(N - 1) + PLANE_W - 20} ${planeY(N - 1) + PLANE_H / 2} l3 3 l5 -6`} />
        </g>
      </svg>

      <HeroPrecisionReplay />
    </div>
  )
}
