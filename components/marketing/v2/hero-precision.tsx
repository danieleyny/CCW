import Image from "next/image"

type FieldNode = {
  x: number
  y: number
  size: number
  tone: "cyan" | "blue" | "violet" | "magenta" | "coral"
  quiet?: boolean
}

const FIELD_NODES: FieldNode[] = [
  { x: 66, y: 132, size: 2.2, tone: "blue", quiet: true },
  { x: 126, y: 82, size: 3.1, tone: "cyan" },
  { x: 190, y: 130, size: 2.2, tone: "blue" },
  { x: 246, y: 68, size: 4, tone: "violet" },
  { x: 316, y: 114, size: 2.6, tone: "cyan" },
  { x: 382, y: 54, size: 2.2, tone: "violet", quiet: true },
  { x: 458, y: 100, size: 3.7, tone: "magenta" },
  { x: 538, y: 60, size: 2.1, tone: "coral", quiet: true },
  { x: 612, y: 112, size: 3.2, tone: "coral" },
  { x: 682, y: 172, size: 2.4, tone: "magenta", quiet: true },
  { x: 84, y: 238, size: 2.1, tone: "cyan" },
  { x: 150, y: 204, size: 3.7, tone: "blue" },
  { x: 212, y: 270, size: 2.5, tone: "violet" },
  { x: 286, y: 216, size: 2, tone: "cyan", quiet: true },
  { x: 360, y: 252, size: 3, tone: "violet" },
  { x: 438, y: 198, size: 2.3, tone: "magenta" },
  { x: 526, y: 246, size: 4.1, tone: "coral" },
  { x: 618, y: 230, size: 2.3, tone: "magenta" },
  { x: 678, y: 304, size: 3.3, tone: "coral", quiet: true },
  { x: 72, y: 356, size: 2, tone: "blue", quiet: true },
  { x: 132, y: 326, size: 3, tone: "cyan" },
  { x: 194, y: 390, size: 2.4, tone: "blue" },
  { x: 264, y: 342, size: 3.9, tone: "violet" },
  { x: 336, y: 408, size: 2.2, tone: "cyan" },
  { x: 414, y: 352, size: 2.6, tone: "magenta" },
  { x: 490, y: 416, size: 3.7, tone: "violet" },
  { x: 568, y: 350, size: 2.4, tone: "coral" },
  { x: 650, y: 404, size: 3.1, tone: "magenta", quiet: true },
  { x: 102, y: 486, size: 2.4, tone: "cyan", quiet: true },
  { x: 178, y: 514, size: 3.6, tone: "blue" },
  { x: 250, y: 474, size: 2.1, tone: "violet" },
  { x: 326, y: 536, size: 3.1, tone: "cyan", quiet: true },
  { x: 406, y: 490, size: 2.3, tone: "violet" },
  { x: 486, y: 542, size: 3.8, tone: "magenta" },
  { x: 570, y: 486, size: 2.1, tone: "coral" },
  { x: 654, y: 520, size: 2.9, tone: "coral", quiet: true },
]

const FIELD_LINKS = [
  [0, 1], [1, 2], [1, 10], [2, 3], [2, 11], [3, 4], [3, 12], [4, 5], [4, 13],
  [5, 6], [6, 7], [6, 15], [7, 8], [8, 9], [8, 16], [9, 17], [10, 11], [10, 19],
  [11, 12], [11, 20], [12, 13], [12, 21], [13, 14], [13, 22], [14, 15], [14, 23],
  [15, 16], [15, 24], [16, 17], [16, 25], [17, 18], [17, 26], [18, 27], [19, 20],
  [20, 21], [20, 28], [21, 22], [21, 29], [22, 23], [22, 30], [23, 24], [23, 31],
  [24, 25], [24, 32], [25, 26], [25, 33], [26, 27], [26, 34], [27, 35], [28, 29],
  [29, 30], [30, 31], [31, 32], [32, 33], [33, 34], [34, 35], [3, 11], [6, 14],
  [11, 21], [14, 22], [16, 24], [22, 32], [25, 34],
] as const

const DUST_TONES = ["cyan", "blue", "violet", "magenta", "coral"] as const
const SPECTRAL_DUST = Array.from({ length: 84 }, (_, index) => {
  const angle = index * 2.399963
  const radius = 36 + ((index * 47) % 294)

  return {
    x: 370 + Math.cos(angle) * radius * 1.08,
    y: 306 + Math.sin(angle) * radius * 0.72,
    size: index % 13 === 0 ? 2.1 : index % 5 === 0 ? 1.3 : 0.75,
    tone: DUST_TONES[index % DUST_TONES.length],
  }
})

const ASSEMBLY_PARTS = ["slide", "muzzle", "frame", "grip", "magazine"] as const
const PRODUCT_IMAGE = "/images/marketing/hero-pistol-hyperreal-v1.png"

/**
 * Concept A — Precision Assembly.
 *
 * A photoreal product render resolves from five controlled image fragments
 * inside a server-rendered spectral field. The complete render is always
 * visible beneath the entrance, so the hero never depends on JavaScript.
 * Motion is finite, CSS-only, and restricted to transform and opacity.
 */
export function HeroPrecision() {
  return (
    <div className="hero-precision">
      <p className="sr-only">
        A photoreal graphite-and-silver pistol resolves from five aligned components inside
        a field of connected spectral points, representing a complicated process becoming
        one coherent system.
      </p>

      <svg className="hp-field-svg" viewBox="0 0 720 570" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hpSpectral" gradientUnits="userSpaceOnUse" x1="72" y1="446" x2="690" y2="174">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.25" stopColor="var(--electric)" />
            <stop offset="0.5" stopColor="var(--violet)" />
            <stop offset="0.72" stopColor="var(--magenta)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
          <radialGradient id="hpAura">
            <stop offset="0" stopColor="var(--electric)" stopOpacity="0.1" />
            <stop offset="0.5" stopColor="var(--violet)" stopOpacity="0.045" />
            <stop offset="1" stopColor="var(--ivory)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="hp-aura" cx="382" cy="302" rx="330" ry="264" fill="url(#hpAura)" />

        <g className="hp-field">
          <path className="hp-orbit hp-orbit--a" d="M66 382 C178 92 526 42 690 256" />
          <path className="hp-orbit hp-orbit--b" d="M92 478 C284 584 596 502 686 278" />
          <path className="hp-orbit hp-orbit--c" d="M148 112 C350 14 622 126 674 382" />

          <g className="hp-links">
            {FIELD_LINKS.map(([from, to], index) => {
              const a = FIELD_NODES[from]
              const b = FIELD_NODES[to]
              return (
                <line
                  key={`${from}-${to}`}
                  className={`hp-link hp-link--${index % 5}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  style={{ ["--i" as string]: index % 12 }}
                />
              )
            })}
          </g>

          <g className="hp-nodes">
            {FIELD_NODES.map((node, index) => (
              <g key={`${node.x}-${node.y}`} transform={`translate(${node.x} ${node.y})`}>
                <g
                  className={`hp-node hp-node--${node.tone}${node.quiet ? " hp-node--quiet" : ""}`}
                  style={{ ["--i" as string]: index % 14 }}
                >
                  <circle className="hp-node-halo" r={node.size * 2.8} />
                  <circle className="hp-node-core" r={node.size} />
                </g>
              </g>
            ))}
          </g>

          <g className="hp-dust">
            {SPECTRAL_DUST.map((particle, index) => (
              <circle
                key={index}
                className={`hp-dust-dot hp-dust-dot--${particle.tone}`}
                style={{ ["--i" as string]: index % 16 }}
                cx={particle.x}
                cy={particle.y}
                r={particle.size}
              />
            ))}
          </g>
        </g>

        <g className="hp-particle-stream">
          <path d="M68 424 C192 462 294 432 404 358 C514 284 602 220 700 198" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((index) => (
            <circle
              key={index}
              className="hp-stream-dot"
              style={{ ["--i" as string]: index }}
              cx={104 + index * 59}
              cy={423 - Math.sin(index * 0.7) * 42 - index * 17}
              r={index % 3 === 0 ? 3 : 1.7}
            />
          ))}
        </g>
      </svg>

      <div className="hp-product-stage" aria-hidden="true">
        <div className="hp-product-halo" />
        <div className="hp-render-stack">
          <Image
            className="hp-product-image hp-product-image--base"
            src={PRODUCT_IMAGE}
            alt=""
            fill
            preload
            sizes="(max-width: 1024px) 92vw, 50vw"
          />

          {ASSEMBLY_PARTS.map((part) => (
            <span key={part} className={`hp-render-fragment hp-render-fragment--${part}`}>
              <Image
                className="hp-product-image"
                src={PRODUCT_IMAGE}
                alt=""
                fill
                loading="eager"
                sizes="(max-width: 1024px) 92vw, 50vw"
              />
            </span>
          ))}

          <span className="hp-scan-beam" />
          <span className="hp-lock-ring hp-lock-ring--muzzle" />
          <span className="hp-lock-ring hp-lock-ring--receiver" />
        </div>
        <span className="hp-stage-index">PRECISION ASSEMBLY / 05</span>
      </div>
    </div>
  )
}
