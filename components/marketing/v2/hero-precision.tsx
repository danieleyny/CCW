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
        An exploded-view graphite and glass sculpture aligns inside a field of connected
        spectral points, representing a complicated process becoming one coherent system.
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
          <path className="hp-assembly-axis" d="M82 229 C232 221 435 226 661 229" />
          <path className="hp-assembly-axis hp-assembly-axis--lower" d="M203 286 C337 296 488 300 620 332" />
          <circle cx="185" cy="227" r="5" />
          <circle cx="545" cy="229" r="5" />
          <circle cx="520" cy="334" r="4" />
          <path className="hp-assembly-tick" d="M184 210 V244 M545 210 V247 M522 317 V350" />
        </g>

        <ellipse className="hp-gun-ground" cx="397" cy="521" rx="230" ry="31" />

        <g className="hp-assembly-plane hp-assembly-plane--muzzle">
          <g className="hp-assembly-part">
            <path
              className="hp-gun-dark"
              d="M88 188 H158 C174 188 184 199 184 215 V238 C184 253 173 261 158 261 H88 Z"
            />
            <path className="hp-gun-facet" d="M101 192 H160 C171 192 178 201 178 213 V221 H101 Z" />
            <ellipse className="hp-gun-muzzle-ring" cx="88" cy="224" rx="25" ry="38" />
            <ellipse className="hp-gun-muzzle-bore" cx="88" cy="224" rx="14" ry="25" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M88 186 C72 187 63 203 63 224 C63 247 73 261 88 262" />
            <path className="hp-gun-detail" d="M111 246 H160 C170 246 176 240 178 231" />
            <path className="hp-gun-sheen" d="M107 198 H158 C167 198 173 204 174 211" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--slide">
          <g className="hp-assembly-part">
            <path
              className="hp-gun-dark"
              d="M190 181 L218 156 L475 158 L535 188 L539 230 L514 247 L220 238 L188 215 Z"
            />
            <path className="hp-gun-facet" d="M221 156 L476 158 L518 179 L207 178 Z" />
            <path className="hp-gun-panel" d="M221 186 L495 188 L514 201 L506 229 L224 221 L201 207 Z" />
            <path className="hp-gun-port" d="M278 181 H374 L396 192 L383 207 H291 L271 196 Z" />
            <path className="hp-gun-port-inner" d="M290 187 H369 L382 194 L376 201 H296 L285 195 Z" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M188 181 L217 156 L233 157" />
            <path className="hp-gun-rim" d="M232 157 L475 159 L526 185" />
            <path className="hp-gun-sheen" d="M240 166 C332 164 417 168 491 176" />
            <path className="hp-gun-detail" d="M231 230 L509 238" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--rear">
          <g className="hp-assembly-part">
            <path className="hp-gun-dark" d="M561 183 L631 192 L663 215 L671 247 L589 252 L556 223 Z" />
            <path className="hp-gun-facet" d="M570 185 L628 193 L652 209 L577 204 Z" />
            <path className="hp-gun-panel" d="M580 207 L648 214 L659 225 L662 241 L597 243 Z" />
            <path className="hp-gun-rim" d="M561 183 L631 192 L663 215 L671 247" />
            {[0, 1, 2, 3].map((index) => (
              <path key={index} className="hp-gun-groove" d={`M${585 + index * 12} 210 L${596 + index * 12} 240`} />
            ))}
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--rail">
          <g className="hp-assembly-part">
            <path className="hp-gun-chrome" d="M205 250 L519 252 L552 268 L536 287 L220 281 L194 267 Z" />
            <path className="hp-gun-glass" d="M218 256 L511 258 L536 269 L526 278 L224 273 L207 266 Z" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M205 250 L194 267 L220 281" />
            <path className="hp-gun-rim" d="M219 252 L519 253 L549 267" />
            <circle className="hp-gun-pin" cx="242" cy="266" r="5" />
            <circle className="hp-gun-pin" cx="505" cy="270" r="4" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--frame">
          <g className="hp-assembly-part">
            <path
              className="hp-gun-glass hp-gun-frame"
              fillRule="evenodd"
              d="M216 286 L528 289 L545 309 L526 333 L486 344 L476 389 L478 492 L449 522 L414 504 L396 401 L373 366 H313 C262 366 227 337 216 286 Z M306 316 C313 302 331 300 350 301 L412 303 C433 304 447 318 447 336 C447 354 433 362 414 362 H333 C313 362 299 350 297 335 C296 328 300 321 306 316 Z"
            />
            <path className="hp-gun-frame-facet" d="M229 294 L518 297 L529 308 L517 320 L254 316 Z" />
            <path className="hp-gun-frame-line" d="M261 324 C284 348 302 351 330 352" />
            <path className="hp-gun-frame-line" d="M461 344 L446 477 L431 493" />
            <circle className="hp-gun-pin" cx="482" cy="316" r="6" />
            <circle className="hp-gun-pin hp-gun-pin--small" cx="456" cy="323" r="3" />
            <path className="hp-gun-trigger" d="M383 318 C382 337 373 349 359 356" />
            <path className="hp-gun-rim hp-gun-rim--cyan" d="M216 286 C227 337 262 366 313 366" />
            <path className="hp-gun-rim" d="M216 286 L528 289 L545 309" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--core">
          <g className="hp-assembly-part">
            <path className="hp-gun-grip" d="M486 350 L528 340 L566 490 L510 537 L455 508 L448 399 Z" />
            <path className="hp-gun-grip-facet" d="M496 360 L520 353 L550 483 L511 520 L480 504 Z" />
            <path className="hp-gun-grip-line" d="M501 374 L533 486" />
            <path className="hp-gun-grip-line" d="M487 390 L519 506" />
            <path className="hp-gun-rim" d="M486 350 L528 340 L566 490" />
          </g>
        </g>

        <g className="hp-assembly-plane hp-assembly-plane--grip">
          <g className="hp-assembly-part">
            <path className="hp-gun-grip" d="M586 354 L621 359 L650 390 L670 493 L622 535 L582 516 L569 397 Z" />
            <path className="hp-gun-grip-facet" d="M597 368 L617 370 L638 396 L656 486 L623 519 L602 505 L588 400 Z" />
            <path className="hp-gun-grip-line" d="M606 384 L638 494" />
            <path className="hp-gun-grip-line" d="M592 398 L621 510" />
            <path className="hp-gun-rim" d="M586 354 L621 359 L650 390 L670 493" />
          </g>
        </g>

        <g className="hp-assembly-finish">
          <path d="M91 276 C241 305 447 295 659 267" />
          <circle cx="91" cy="276" r="2.5" />
          <circle cx="659" cy="267" r="2.5" />
        </g>
      </svg>
    </div>
  )
}
