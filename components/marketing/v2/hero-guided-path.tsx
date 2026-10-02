import Image from "next/image"
import type { CSSProperties } from "react"

import { HeroMotionViewport } from "./hero-motion-viewport"

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

const DOCUMENT_PACKETS = [0, 1] as const

const CASE_INPUTS = ["Identity", "Training", "References", "Disclosures"] as const

const PHASES = [
  { number: "01", title: "Qualify", detail: "Track + fit", position: "one", tone: "cyan" },
  { number: "02", title: "Train", detail: "18-hour course", position: "two", tone: "blue" },
  { number: "03", title: "Assemble", detail: "Docs + people", position: "three", tone: "violet" },
  { number: "04", title: "Review", detail: "Every requirement", position: "four", tone: "magenta" },
  { number: "05", title: "Application submitted", detail: "By the applicant", position: "five", tone: "orange" },
] as const

/**
 * NYC Guided Path — a premium architectural model of a complicated case
 * becoming an organized, five-phase journey. The complete artwork is always
 * visible; a small client boundary only pauses the replaying motion offscreen.
 */
export function HeroGuidedPath() {
  return (
    <HeroMotionViewport>
      <p className="sr-only">
        Identity records, training, references, and disclosures move through five phases:
        qualify, train, assemble, review, and application submission by the applicant. The
        application then awaits an independent NYPD decision and, if approved, a license is
        issued.
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

          <div className="gp-input-deck">
            <span className="gp-input-kicker">Your case inputs</span>
            <div className="gp-input-list">
              {CASE_INPUTS.map((input, index) => (
                <span
                  className="gp-input-card"
                  key={input}
                  style={{ "--i": index } as CSSProperties}
                >
                  <i aria-hidden="true" />
                  {input}
                </span>
              ))}
            </div>
          </div>

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
              <linearGradient id="gpLicenseCard" x1="-60" y1="-38" x2="62" y2="42" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--electric)" />
                <stop offset="0.46" stopColor="var(--violet)" />
                <stop offset="0.76" stopColor="var(--magenta)" />
                <stop offset="1" stopColor="var(--tangerine)" />
              </linearGradient>
              <linearGradient id="gpLicenseOrbit" x1="-100" y1="-90" x2="105" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0" stopColor="var(--cyan)" />
                <stop offset="0.52" stopColor="var(--violet)" />
                <stop offset="1" stopColor="var(--tangerine)" />
              </linearGradient>
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

            {DOCUMENT_PACKETS.map((packet) => (
              <g
                className="gp-document-packet"
                key={packet}
                style={{ "--i": packet } as CSSProperties}
              >
                <rect className="gp-packet-sheet gp-packet-sheet--back" x="-20" y="-25" width="40" height="50" rx="5" />
                <rect className="gp-packet-sheet" x="-24" y="-30" width="40" height="50" rx="5" />
                <path className="gp-packet-line" d="M-15-17H7M-15-8H4M-15 1H10M-15 10H1" />
                <circle className="gp-packet-check" cx="7" cy="10" r="6" />
                <path className="gp-packet-tick" d="m4 10 2 2 4-5" />
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
                  <path className="gp-milestone-check" d="m-4 0 3 3 6-7" />
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
              <g className="gp-license-celebration">
                <circle className="gp-license-orbit gp-license-orbit--outer" r="106" />
                <circle className="gp-license-orbit gp-license-orbit--inner" r="82" />
                <path
                  className="gp-license-rays"
                  d="M0-93V-122M66-66l21-21M93 0h29M66 66l21 21M0 93v29M-66 66l-21 21M-93 0h-29M-66-66l-21-21"
                />
                <g className="gp-license-card">
                  <rect className="gp-license-card-shell" x="-64" y="-40" width="128" height="80" rx="15" />
                  <rect className="gp-license-card-inner" x="-56" y="-32" width="112" height="64" rx="10" />
                  <circle className="gp-license-seal" cx="-32" cy="0" r="17" />
                  <path className="gp-license-tick" d="m-40 0 6 6 12-15" />
                  <path className="gp-license-line" d="M-7-11H38M-7 1H29M-7 13H43" />
                </g>
              </g>
            </g>
          </svg>

          <div className="gp-phase-labels">
            {PHASES.map((phase, index) => (
              <span
                className={`gp-phase-label gp-phase-label--${phase.position} gp-phase-label--${phase.tone}`}
                key={phase.number}
                style={{ "--i": index } as CSSProperties}
              >
                <b>{phase.number}</b>
                <span>
                  <strong>{phase.title}</strong>
                  <small>{phase.detail}</small>
                </span>
              </span>
            ))}
          </div>

          <div className="gp-outcome-cycle" aria-hidden="true">
            <span className="gp-outcome gp-outcome--file">
              <i>✓</i>
              <b>ONE ORGANIZED FILE</b>
            </span>
            <span className="gp-outcome gp-outcome--decision">
              <i>→</i>
              <span>
                <b>NYPD DECISION</b>
                <small>INDEPENDENT REVIEW</small>
              </span>
            </span>
            <span className="gp-outcome gp-outcome--licensed">
              <i>✓</i>
              <span>
                <small>IF APPROVED BY NYPD</small>
                <b>LICENSED</b>
              </span>
            </span>
          </div>
        </div>
      </div>

      <span className="gp-stage-index" aria-hidden="true">GUIDED CASE PATH / NYC</span>
    </HeroMotionViewport>
  )
}
