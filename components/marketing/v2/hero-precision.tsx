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

/**
 * Concept A — Constellation Assembly.
 *
 * One abstract, deliberately non-operational firearm-shaped sculpture resolves from six
 * broad exterior panels inside a single connected dot-and-line field. It contains no
 * ammunition, working internals, instructions, geographic layer, stage cards, dashboard
 * furniture, or secondary visual metaphor.
 *
 * The illustration is server-rendered SVG. Motion is CSS-only, finite, and limited to
 * transform + opacity. The resting composition is the base state, so no-JS, unsupported
 * browsers, and reduced-motion users receive the complete illustration immediately.
 */
export function HeroPrecision() {
  return (
    <div className="hero-precision">
      <p className="sr-only">
        An abstract graphite sculpture assembles from six broad panels while a field of
        connected spectral points resolves around it, representing a complicated process
        becoming one coherent system.
      </p>

      <svg className="hp-svg" viewBox="0 0 720 610" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="hpMetal" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#263140" />
            <stop offset="0.42" stopColor="#0a1019" />
            <stop offset="0.72" stopColor="#1b2430" />
            <stop offset="1" stopColor="#05090f" />
          </linearGradient>
          <linearGradient id="hpGlass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0.86" />
            <stop offset="0.42" stopColor="#dfe8f6" stopOpacity="0.42" />
            <stop offset="1" stopColor="#66758b" stopOpacity="0.22" />
          </linearGradient>
          <linearGradient id="hpSpectral" gradientUnits="userSpaceOnUse" x1="150" y1="392" x2="640" y2="210">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.25" stopColor="var(--electric)" />
            <stop offset="0.5" stopColor="var(--violet)" />
            <stop offset="0.72" stopColor="var(--magenta)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
          <radialGradient id="hpAura">
            <stop offset="0" stopColor="var(--electric)" stopOpacity="0.12" />
            <stop offset="0.48" stopColor="var(--violet)" stopOpacity="0.055" />
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
        </g>

        <g className="hp-particle-stream">
          <path d="M88 386 C210 430 300 420 406 350 C506 285 574 234 664 218" />
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <circle
              key={index}
              className="hp-stream-dot"
              style={{ ["--i" as string]: index }}
              cx={126 + index * 58}
              cy={397 - Math.sin(index * 0.7) * 46 - index * 13}
              r={index % 3 === 0 ? 3 : 1.8}
            />
          ))}
        </g>

        <g className="hp-silhouette">
          <path d="M194 222 Q194 207 211 204 L568 204 Q592 204 598 226 L606 264 L568 286 L539 341 L427 341 L388 504 L302 504 L329 342 L252 342 Q224 342 216 315 L202 270 Q194 246 194 222 Z" />
        </g>

        <g className="hp-assembly">
          <g className="hp-scroll-piece hp-scroll-piece--slide">
            <g className="hp-piece hp-piece--slide">
              <path d="M198 218 Q198 205 216 202 L564 202 Q585 202 593 219 L602 252 L577 271 L216 271 Q198 268 198 251 Z" />
              <path className="hp-piece-glint" d="M224 216 H553 Q570 216 576 229" />
              <path className="hp-piece-seam" d="M244 259 H568" />
            </g>
          </g>

          <g className="hp-scroll-piece hp-scroll-piece--front">
            <g className="hp-piece hp-piece--front">
              <path d="M577 271 L621 276 Q635 279 635 294 L635 316 Q633 330 618 333 L557 333 L539 341 L539 286 Z" />
              <path className="hp-piece-glass" d="M603 283 L625 286 L625 321 L598 323 Z" />
            </g>
          </g>

          <g className="hp-scroll-piece hp-scroll-piece--frame">
            <g className="hp-piece hp-piece--frame">
              <path d="M223 274 L577 274 L551 325 Q545 341 525 341 L426 341 L401 372 L342 372 L329 342 L254 342 Q228 342 220 318 L210 289 Q207 278 223 274 Z" />
              <path className="hp-piece-glass" d="M248 288 H548 L531 321 H269 Q250 321 246 306 Z" />
              <path className="hp-piece-seam" d="M276 333 H515" />
            </g>
          </g>

          <g className="hp-scroll-piece hp-scroll-piece--guard">
            <g className="hp-piece hp-piece--guard">
              <path fillRule="evenodd" d="M401 341 H473 L461 378 Q451 405 416 405 H378 Q350 405 344 379 L342 368 H367 L370 378 Q373 387 386 387 H414 Q435 387 440 369 L445 356 H396 Z" />
              <path className="hp-piece-glint" d="M365 370 Q370 395 393 395 H417" />
            </g>
          </g>

          <g className="hp-scroll-piece hp-scroll-piece--grip">
            <g className="hp-piece hp-piece--grip">
              <path d="M353 368 L430 368 L389 506 Q386 517 374 517 H302 Q290 516 294 503 L329 375 Q331 368 353 368 Z" />
              <path className="hp-grip-inset" d="M350 390 H402 L371 492 H321 Z" />
              <path className="hp-piece-seam" d="M332 468 L380 391" />
            </g>
          </g>

          <g className="hp-scroll-piece hp-scroll-piece--rear">
            <g className="hp-piece hp-piece--rear">
              <path d="M173 231 Q173 217 187 212 L205 207 V270 L183 265 Q173 262 173 249 Z" />
              <path className="hp-piece-glass" d="M181 225 L197 219 V258 L181 254 Z" />
            </g>
          </g>
        </g>

        <g className="hp-spectral-lock">
          <path d="M181 286 C296 250 396 278 492 246 C554 225 604 212 660 218" />
          <circle cx="214" cy="278" r="3.4" />
          <circle cx="346" cy="268" r="3.4" />
          <circle cx="492" cy="246" r="3.4" />
          <circle cx="602" cy="224" r="3.4" />
        </g>

        <g className="hp-lock-mark">
          <circle cx="389" cy="302" r="19" />
          <path d="M380 302 L387 309 L399 294" />
        </g>
      </svg>
    </div>
  )
}
