import Image from "next/image"

type FieldNode = {
  x: number
  y: number
  size: number
  tone: "cyan" | "blue" | "violet" | "magenta" | "coral"
  quiet?: boolean
}

const FIELD_NODES: FieldNode[] = [
  { x: 72, y: 160, size: 2.4, tone: "blue", quiet: true },
  { x: 114, y: 106, size: 3.2, tone: "cyan" },
  { x: 172, y: 144, size: 2.2, tone: "blue" },
  { x: 218, y: 86, size: 4.1, tone: "violet" },
  { x: 282, y: 132, size: 2.7, tone: "cyan" },
  { x: 352, y: 72, size: 2.3, tone: "violet", quiet: true },
  { x: 422, y: 116, size: 3.8, tone: "magenta" },
  { x: 500, y: 76, size: 2.2, tone: "coral", quiet: true },
  { x: 580, y: 126, size: 3.3, tone: "coral" },
  { x: 650, y: 184, size: 2.5, tone: "magenta", quiet: true },
  { x: 92, y: 250, size: 2.2, tone: "cyan" },
  { x: 150, y: 218, size: 3.8, tone: "blue" },
  { x: 206, y: 278, size: 2.6, tone: "violet" },
  { x: 276, y: 224, size: 2.1, tone: "cyan", quiet: true },
  { x: 348, y: 258, size: 3.1, tone: "violet" },
  { x: 430, y: 210, size: 2.4, tone: "magenta" },
  { x: 514, y: 250, size: 4.2, tone: "coral" },
  { x: 606, y: 238, size: 2.4, tone: "magenta" },
  { x: 662, y: 306, size: 3.4, tone: "coral", quiet: true },
  { x: 78, y: 354, size: 2.1, tone: "blue", quiet: true },
  { x: 132, y: 330, size: 3.1, tone: "cyan" },
  { x: 188, y: 386, size: 2.5, tone: "blue" },
  { x: 252, y: 344, size: 4, tone: "violet" },
  { x: 320, y: 404, size: 2.3, tone: "cyan" },
  { x: 398, y: 356, size: 2.7, tone: "magenta" },
  { x: 470, y: 414, size: 3.8, tone: "violet" },
  { x: 548, y: 352, size: 2.5, tone: "coral" },
  { x: 624, y: 402, size: 3.2, tone: "magenta", quiet: true },
  { x: 104, y: 478, size: 2.5, tone: "cyan", quiet: true },
  { x: 170, y: 500, size: 3.7, tone: "blue" },
  { x: 240, y: 468, size: 2.2, tone: "violet" },
  { x: 306, y: 530, size: 3.2, tone: "cyan", quiet: true },
  { x: 384, y: 486, size: 2.4, tone: "violet" },
  { x: 458, y: 538, size: 3.9, tone: "magenta" },
  { x: 544, y: 484, size: 2.2, tone: "coral" },
  { x: 626, y: 512, size: 3, tone: "coral", quiet: true },
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
const SPECTRAL_DUST = Array.from({ length: 96 }, (_, index) => {
  const angle = index * 2.399963
  const radius = 34 + ((index * 47) % 292)

  return {
    x: 360 + Math.cos(angle) * radius * 1.08,
    y: 306 + Math.sin(angle) * radius * 0.74,
    size: index % 13 === 0 ? 2.2 : index % 5 === 0 ? 1.35 : 0.8,
    tone: DUST_TONES[index % DUST_TONES.length],
  }
})

/**
 * Concept A — Constellation Assembly.
 *
 * A premium exploded-view product rendering sits inside a server-rendered SVG
 * constellation. The image is intentionally inert and non-instructional; the
 * connected field supplies the metaphor of many requirements becoming one
 * coherent system. Motion is CSS-only, finite, and transform/opacity-only.
 */
export function HeroPrecision() {
  return (
    <div className="hero-precision">
      <p className="sr-only">
        An exploded-view graphite and glass sculpture aligns inside a field of connected
        spectral points, representing a complicated process becoming one coherent system.
      </p>

      <div className="hp-product-stage" aria-hidden="true">
        <Image
          className="hp-product"
          src="/images/marketing/hero-constellation-assembly-v2.png"
          alt=""
          width={1536}
          height={1024}
          sizes="(max-width: 540px) 112vw, (max-width: 1024px) 82vw, 52vw"
          preload
        />
      </div>

      <svg className="hp-svg" viewBox="0 0 720 610" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hpSpectral" gradientUnits="userSpaceOnUse" x1="92" y1="414" x2="670" y2="188">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.25" stopColor="var(--electric)" />
            <stop offset="0.5" stopColor="var(--violet)" />
            <stop offset="0.72" stopColor="var(--magenta)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
          <radialGradient id="hpAura">
            <stop offset="0" stopColor="var(--electric)" stopOpacity="0.11" />
            <stop offset="0.48" stopColor="var(--violet)" stopOpacity="0.05" />
            <stop offset="1" stopColor="var(--ivory)" stopOpacity="0" />
          </radialGradient>
        </defs>

        <ellipse className="hp-aura" cx="390" cy="306" rx="326" ry="260" fill="url(#hpAura)" />

        <g className="hp-field">
          <path className="hp-orbit hp-orbit--a" d="M78 372 C184 108 518 54 665 256" />
          <path className="hp-orbit hp-orbit--b" d="M104 470 C282 578 576 500 662 286" />
          <path className="hp-orbit hp-orbit--c" d="M154 128 C338 24 606 132 648 374" />

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
              <g
                key={`${node.x}-${node.y}`}
                className={`hp-node hp-node--${node.tone}${node.quiet ? " hp-node--quiet" : ""}`}
                style={{ ["--i" as string]: index % 14 }}
                transform={`translate(${node.x} ${node.y})`}
              >
                <circle className="hp-node-halo" r={node.size * 2.8} />
                <circle className="hp-node-core" r={node.size} />
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
          <path d="M76 420 C190 454 282 432 388 362 C496 291 582 226 678 204" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((index) => (
            <circle
              key={index}
              className="hp-stream-dot"
              style={{ ["--i" as string]: index }}
              cx={108 + index * 53}
              cy={421 - Math.sin(index * 0.7) * 42 - index * 16}
              r={index % 3 === 0 ? 3 : 1.8}
            />
          ))}
        </g>
      </svg>
    </div>
  )
}
