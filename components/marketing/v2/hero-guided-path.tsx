import Image from "next/image"
import type { CSSProperties } from "react"

const GUIDED_PATH_IMAGE = "/images/marketing/hero-nyc-guided-path-v2.png"

const MILESTONES = [
  { x: 202, y: 825, tone: "cyan" },
  { x: 477, y: 661, tone: "blue" },
  { x: 713, y: 536, tone: "violet" },
  { x: 850, y: 427, tone: "violet" },
  { x: 1057, y: 373, tone: "magenta" },
] as const

/**
 * NYC Guided Path — a premium architectural model of a complicated case
 * becoming an organized, five-phase journey. The complete artwork is always
 * visible; finite CSS/SVG overlays add hierarchy without requiring JavaScript.
 */
export function HeroGuidedPath() {
  return (
    <div className="hero-guided-path">
      <p className="sr-only">
        An abstract New York City model with a luminous five-stop path leading through
        organized document stacks to a completed case file.
      </p>

      <div className="gp-art-stage" aria-hidden="true">
        <span className="gp-art-aura" />
        <Image
          className="gp-artwork"
          src={GUIDED_PATH_IMAGE}
          alt=""
          fill
          preload
          sizes="(max-width: 540px) 112vw, (max-width: 1024px) 88vw, 52vw"
        />

        <svg className="gp-route-overlay" viewBox="0 0 1448 1086" focusable="false">
          <defs>
            <linearGradient id="gpRouteOverlay" gradientUnits="userSpaceOnUse" x1="180" y1="850" x2="1160" y2="270">
              <stop offset="0" stopColor="var(--cyan)" />
              <stop offset="0.28" stopColor="var(--electric)" />
              <stop offset="0.54" stopColor="var(--violet)" />
              <stop offset="0.78" stopColor="var(--magenta)" />
              <stop offset="1" stopColor="var(--tangerine)" />
            </linearGradient>
          </defs>

          <path
            className="gp-route-echo"
            d="M202 825 C318 775 384 708 477 661 C562 618 642 568 713 536 C767 511 800 456 850 427 C930 380 990 410 1057 373 C1102 348 1120 302 1154 276"
          />

          {MILESTONES.map((milestone, index) => (
            <g key={`${milestone.x}-${milestone.y}`} transform={`translate(${milestone.x} ${milestone.y})`}>
              <g
                className={`gp-lock gp-lock--${milestone.tone}`}
                style={{ "--i": index } as CSSProperties}
              >
                <circle className="gp-lock-ring gp-lock-ring--outer" r="38" />
                <circle className="gp-lock-ring gp-lock-ring--inner" r="22" />
              </g>
            </g>
          ))}

          <g transform="translate(1154 276)">
            <g className="gp-file-lock">
              <circle r="50" />
              <circle className="gp-file-lock-inner" r="29" />
            </g>
          </g>
        </svg>
      </div>

      <span className="gp-stage-index" aria-hidden="true">GUIDED CASE PATH / NYC</span>
    </div>
  )
}
