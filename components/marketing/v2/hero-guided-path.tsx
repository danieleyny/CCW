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

const GRID_NODES = [
  { x: 159, y: 734, tone: "cyan" },
  { x: 317, y: 537, tone: "blue" },
  { x: 564, y: 291, tone: "violet" },
  { x: 837, y: 216, tone: "magenta" },
  { x: 1129, y: 312, tone: "orange" },
  { x: 1293, y: 535, tone: "orange" },
  { x: 1161, y: 747, tone: "magenta" },
  { x: 849, y: 901, tone: "violet" },
] as const

const FLOW_PARTICLES = [0, 1, 2] as const

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

      <div className="gp-scroll-plane" aria-hidden="true">
        <div className="gp-art-stage">
          <span className="gp-art-aura" />
          <span className="gp-prism gp-prism--cyan" />
          <span className="gp-prism gp-prism--coral" />

          <svg className="gp-world-grid" viewBox="0 0 1448 1086" focusable="false">
            <defs>
              <linearGradient id="gpWorldLine" gradientUnits="userSpaceOnUse" x1="120" y1="880" x2="1320" y2="220">
                <stop offset="0" stopColor="var(--cyan)" />
                <stop offset="0.5" stopColor="var(--violet)" />
                <stop offset="1" stopColor="var(--tangerine)" />
              </linearGradient>
            </defs>
            <path className="gp-grid-arc gp-grid-arc--one" d="M82 808 C290 426 636 180 1058 188 C1226 192 1338 318 1372 498" />
            <path className="gp-grid-arc gp-grid-arc--two" d="M142 914 C388 1028 797 1017 1115 842 C1280 751 1351 600 1323 426" />
            <path className="gp-grid-arc gp-grid-arc--three" d="M222 294 C507 179 918 209 1219 399 C1320 463 1361 558 1356 655" />
            {GRID_NODES.map((node, index) => (
              <g key={`${node.x}-${node.y}`} transform={`translate(${node.x} ${node.y})`}>
                <g
                  className={`gp-grid-node gp-grid-node--${node.tone}`}
                  style={{ "--i": index } as CSSProperties}
                >
                  <circle className="gp-grid-node-halo" r="19" />
                  <circle className="gp-grid-node-core" r="5" />
                </g>
              </g>
            ))}
          </svg>

          <Image
            className="gp-artwork"
            src={GUIDED_PATH_IMAGE}
            alt=""
            fill
            preload
            sizes="(max-width: 540px) 112vw, (max-width: 1024px) 88vw, 52vw"
          />

          <span className="gp-scan" />

          <svg className="gp-route-overlay" viewBox="0 0 1448 1086" focusable="false">
            <defs>
              <linearGradient id="gpRouteOverlay" gradientUnits="userSpaceOnUse" x1="180" y1="850" x2="1160" y2="270">
                <stop offset="0" stopColor="var(--cyan)" />
                <stop offset="0.28" stopColor="var(--electric)" />
                <stop offset="0.54" stopColor="var(--violet)" />
                <stop offset="0.78" stopColor="var(--magenta)" />
                <stop offset="1" stopColor="var(--tangerine)" />
              </linearGradient>
              <radialGradient id="gpFlowCore">
                <stop offset="0" stopColor="#fff" />
                <stop offset="0.38" stopColor="var(--cyan)" />
                <stop offset="1" stopColor="var(--violet)" stopOpacity="0" />
              </radialGradient>
            </defs>

            <path
              className="gp-route-bed"
              d="M202 825 C318 775 384 708 477 661 C562 618 642 568 713 536 C767 511 800 456 850 427 C930 380 990 410 1057 373 C1102 348 1120 302 1154 276"
            />
            <path
              className="gp-route-echo"
              d="M202 825 C318 775 384 708 477 661 C562 618 642 568 713 536 C767 511 800 456 850 427 C930 380 990 410 1057 373 C1102 348 1120 302 1154 276"
            />

            {FLOW_PARTICLES.map((particle) => (
              <g
                className="gp-flow-particle"
                key={particle}
                style={{ "--i": particle } as CSSProperties}
              >
                <circle className="gp-flow-halo" r="34" />
                <circle className="gp-flow-core" r="10" />
              </g>
            ))}

            {MILESTONES.map((milestone, index) => (
              <g key={`${milestone.x}-${milestone.y}`} transform={`translate(${milestone.x} ${milestone.y})`}>
                <g
                  className={`gp-milestone gp-lock--${milestone.tone}`}
                  style={{ "--i": index } as CSSProperties}
                >
                  <circle className="gp-milestone-halo" r="29" />
                  <circle className="gp-milestone-core" r="8" />
                </g>
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
                <circle r="54" />
                <circle className="gp-file-lock-inner" r="31" />
              </g>
              <g className="gp-file-check">
                <circle className="gp-file-check-disc" r="22" />
                <path d="m-10 0 7 7 15-17" />
              </g>
            </g>
          </svg>

          <span className="gp-resolved" aria-hidden="true">
            <span>05</span>
            <b>CASE READY</b>
          </span>
        </div>
      </div>

      <span className="gp-stage-index" aria-hidden="true">GUIDED CASE PATH / NYC</span>
    </div>
  )
}
