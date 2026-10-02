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
 * A purpose-built exploded-view vector sculpture sits inside a server-rendered
 * SVG constellation. Every component is transparent SVG geometry rather than a
 * masked raster, giving the load and scroll sequences complete control over the
 * assembly. Motion is CSS-only, finite, and transform/opacity-only.
 */
export function HeroPrecision() {
  return (
    <div className="hero-precision">
      <p className="sr-only">
        A graphite-and-glass pistol assembles from five aligned vector components inside a
        field of connected spectral points, representing a complicated process becoming one
        coherent system.
      </p>

      <svg className="hp-svg" viewBox="36 105 650 470" aria-hidden="true" focusable="false">
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
          <linearGradient id="hpGunInk" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#344154" />
            <stop offset="0.18" stopColor="#101925" />
            <stop offset="0.55" stopColor="#050a12" />
            <stop offset="0.82" stopColor="#1d2838" />
            <stop offset="1" stopColor="#090f18" />
          </linearGradient>
          <linearGradient id="hpGunFacet" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#718096" />
            <stop offset="0.12" stopColor="#1f2a39" />
            <stop offset="0.58" stopColor="#080d15" />
            <stop offset="0.88" stopColor="#263346" />
            <stop offset="1" stopColor="#0a0f18" />
          </linearGradient>
          <linearGradient id="hpGunChrome" x1="0" y1="0" x2="0.86" y2="1">
            <stop offset="0" stopColor="#f9fdff" />
            <stop offset="0.18" stopColor="#b9d0df" stopOpacity="0.97" />
            <stop offset="0.42" stopColor="#ffffff" stopOpacity="0.94" />
            <stop offset="0.7" stopColor="#8898ad" stopOpacity="0.97" />
            <stop offset="1" stopColor="#f8e6ef" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="hpGunGlass" x1="0.08" y1="0" x2="0.9" y2="1">
            <stop offset="0" stopColor="#dffaff" stopOpacity="0.98" />
            <stop offset="0.24" stopColor="#f9fdff" stopOpacity="0.96" />
            <stop offset="0.55" stopColor="#dbe4f1" stopOpacity="0.94" />
            <stop offset="0.78" stopColor="#f4e7ff" stopOpacity="0.96" />
            <stop offset="1" stopColor="#ffd9e5" stopOpacity="0.98" />
          </linearGradient>
          <linearGradient id="hpGunGrip" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#405065" />
            <stop offset="0.16" stopColor="#111a27" />
            <stop offset="0.52" stopColor="#050911" />
            <stop offset="0.84" stopColor="#2a2034" />
            <stop offset="1" stopColor="#0c121c" />
          </linearGradient>
          <linearGradient id="hpGunEdge" gradientUnits="userSpaceOnUse" x1="112" y1="380" x2="654" y2="202">
            <stop offset="0" stopColor="var(--cyan)" />
            <stop offset="0.38" stopColor="var(--electric)" />
            <stop offset="0.67" stopColor="var(--violet)" />
            <stop offset="0.84" stopColor="var(--magenta)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
          <linearGradient id="hpGunSheen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--cyan)" stopOpacity="0" />
            <stop offset="0.32" stopColor="var(--cyan)" stopOpacity="0.7" />
            <stop offset="0.62" stopColor="var(--violet)" stopOpacity="0.76" />
            <stop offset="1" stopColor="var(--tangerine)" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="hpGunMuzzle" cx="50%" cy="46%" r="62%">
            <stop offset="0" stopColor="#02050a" />
            <stop offset="0.58" stopColor="#090f18" />
            <stop offset="0.76" stopColor="#7d8ca1" />
            <stop offset="0.9" stopColor="#131c29" />
            <stop offset="1" stopColor="#080c13" />
          </radialGradient>
          <mask id="hpSlideCutouts" maskUnits="userSpaceOnUse" x="84" y="146" width="540" height="154">
            <rect x="84" y="146" width="540" height="154" fill="white" />
            <ellipse cx="121" cy="224" rx="18" ry="29" fill="black" />
            <path d="M332 192 L444 194 L468 211 L453 232 L338 228 L316 211 Z" fill="black" />
          </mask>
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
                transform={`translate(${node.x} ${node.y})`}
              >
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

        <g className="hp-assembly-guides">
          <path className="hp-assembly-axis" d="M91 224 C238 218 416 219 612 224" />
          <path className="hp-assembly-axis hp-assembly-axis--lower" d="M142 293 C294 304 451 304 579 291" />
          <circle cx="121" cy="224" r="5" />
          <circle cx="576" cy="224" r="5" />
          <circle cx="501" cy="330" r="4" />
          <path className="hp-assembly-tick" d="M121 204 V246 M576 203 V246 M501 313 V348" />
        </g>

        <ellipse className="hp-gun-ground" cx="357" cy="540" rx="260" ry="28" />

        <g className="hp-assembly-plane hp-assembly-plane--magazine">
          <g className="hp-assembly-part">
            <path className="hp-pistol-magazine" d="M443 349 L501 341 L539 514 L510 541 L449 528 L414 422 Z" />
            <path className="hp-pistol-magazine-facet" d="M457 365 L492 359 L523 505 L505 522 L461 514 L432 427 Z" />
            <path className="hp-pistol-magazine-line" d="M470 378 L504 500 M454 394 L487 511" />
            <path className="hp-pistol-magazine-base" d="M445 525 L515 536 L509 551 L452 545 Z" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--recoil">
          <g className="hp-assembly-part">
            <path className="hp-pistol-guide-rod" d="M151 254 H468 C477 254 482 260 482 267 C482 274 477 279 468 279 H151 Z" />
            <ellipse className="hp-pistol-guide-cap" cx="151" cy="266.5" rx="9" ry="13" />
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].map((index) => (
              <path
                key={index}
                className="hp-pistol-spring"
                d={`M${181 + index * 19} 257 L${189 + index * 19} 276`}
              />
            ))}
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--barrel">
          <g className="hp-assembly-part">
            <path className="hp-pistol-barrel" d="M120 199 H457 L487 214 L482 241 L456 252 H120 Z" />
            <path className="hp-pistol-barrel-facet" d="M139 203 H451 L473 214 L462 224 H139 Z" />
            <path className="hp-pistol-barrel-hood" d="M326 190 L447 192 L468 209 L452 230 L337 227 L316 210 Z" />
            <ellipse className="hp-gun-muzzle-ring" cx="121" cy="224" rx="25" ry="37" />
            <ellipse className="hp-gun-muzzle-bore" cx="121" cy="224" rx="15" ry="27" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M121 186 C105 187 96 203 96 224 C96 247 106 261 121 262" />
            <path className="hp-gun-sheen" d="M146 206 H447 C458 206 467 211 473 217" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--frame">
          <g className="hp-assembly-part">
            <path
              className="hp-pistol-frame"
              fillRule="evenodd"
              d="M150 282 L560 282 L579 300 L566 320 L523 334 L509 360 L552 510 L516 547 L428 535 L400 432 L365 404 H290 C230 404 184 373 165 329 Z M291 319 C304 309 322 306 342 307 L421 309 C451 310 468 329 467 350 C466 376 446 393 417 394 H330 C298 394 276 376 274 350 C273 337 279 326 291 319 Z"
            />
            <path className="hp-pistol-frame-facet" d="M164 289 L550 289 L563 301 L548 314 L192 316 Z" />
            <path className="hp-pistol-dust-cover" d="M184 317 H269 C280 317 286 326 286 336 V347 H214 C198 347 188 335 184 317 Z" />
            <path className="hp-pistol-grip-panel" d="M450 361 L500 344 L536 503 L508 529 L452 519 L417 427 Z" />
            <path className="hp-pistol-grip-inset" d="M463 377 L491 365 L521 496 L502 513 L464 505 L435 429 Z" />
            <path className="hp-pistol-grip-line" d="M473 388 L506 491 M458 402 L490 505" />
            <path className="hp-pistol-frame-line" d="M199 328 C220 369 251 385 296 388" />
            <path className="hp-pistol-frame-line" d="M518 342 L536 500 L512 524" />
            <path className="hp-pistol-trigger" d="M399 323 C399 348 388 367 370 380" />
            <circle className="hp-gun-pin" cx="506" cy="309" r="6" />
            <circle className="hp-gun-pin hp-gun-pin--small" cx="478" cy="313" r="3" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M150 282 L165 329 C184 373 230 404 290 404" />
            <path className="hp-gun-rim" d="M150 282 L560 282 L579 300" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--slide">
          <g className="hp-assembly-part">
            <path
              className="hp-pistol-slide"
              mask="url(#hpSlideCutouts)"
              d="M116 174 L520 174 L568 188 L598 214 L592 251 L560 278 L143 278 L114 258 L104 226 L109 195 Z"
            />
            <path
              className="hp-pistol-slide-facet"
              mask="url(#hpSlideCutouts)"
              d="M126 174 H519 L559 187 L144 191 L112 207 L116 190 Z"
            />
            <path
              className="hp-pistol-slide-panel"
              mask="url(#hpSlideCutouts)"
              d="M151 195 L517 194 L568 211 L562 251 L542 263 L148 258 L127 239 L129 211 Z"
            />
            <path className="hp-pistol-port-rim" d="M332 192 L444 194 L468 211 L453 232 L338 228 L316 211 Z" />
            <ellipse className="hp-pistol-muzzle-rim" cx="121" cy="224" rx="20" ry="32" />
            {[0, 1, 2, 3, 4].map((index) => (
              <path key={index} className="hp-pistol-serration" d={`M${518 + index * 10} 202 L${528 + index * 10} 249`} />
            ))}
            <path className="hp-pistol-front-sight" d="M158 174 L163 160 H181 L187 174 Z" />
            <path className="hp-pistol-rear-sight" d="M524 174 L533 158 H564 L571 180 Z" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M109 195 L116 174 L163 174" />
            <path className="hp-gun-rim" d="M187 174 H520 L568 188 L598 214" />
            <path className="hp-gun-sheen" d="M196 183 C320 180 433 182 532 191" />
            <path className="hp-pistol-slide-line" d="M150 264 L545 269" />
          </g>
        </g>

        <g className="hp-assembly-finish">
          <path d="M91 306 C236 334 420 324 612 286" />
          <circle cx="91" cy="306" r="2.5" />
          <circle cx="612" cy="286" r="2.5" />
        </g>
      </svg>
    </div>
  )
}
