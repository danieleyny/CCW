import { useId } from "react"

/**
 * The visual system for every interior hero. It treats an application as a case
 * moving through a visible control board: intake points, a verified route, and a
 * resolved file. The artwork is abstract and never implies approval.
 */
export function GuideHeroPath() {
  const routeId = useId().replace(/:/g, "")

  return (
    <div className="guide-hero-art" aria-hidden="true">
      <svg viewBox="0 0 860 430" focusable="false">
        <defs>
          <linearGradient id={routeId} x1="92" x2="739" y1="348" y2="92" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cyan)" />
            <stop offset="0.52" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
        </defs>
        <g className="guide-hero-grid">
          <path d="M-20 336 412 64M54 414 485 142M202 432 629 162M384 430 806 170" />
          <path d="M60 422H820M42 350H836M95 278H850M184 206H858M295 134H860" />
          <path d="M92 32v356M208 12v410M324 0v430M440 0v430M556 0v430M672 0v430" />
        </g>
        <g className="guide-hero-field">
          <path d="M42 364 272 220 500 220 742 68 814 112 572 276 340 276 112 405Z" />
          <path d="M112 405 340 276 572 276 814 112" />
        </g>
        <path className="guide-hero-route-shadow" d="M96 346C188 346 194 286 286 286s100-76 194-76 99-82 188-82 70-32 106-57" />
        <path className="guide-hero-route" stroke={`url(#${routeId})`} d="M96 346C188 346 194 286 286 286s100-76 194-76 99-82 188-82 70-32 106-57" />
        <g className="guide-hero-stop guide-hero-stop--one"><circle cx="96" cy="346" r="28" /><circle cx="96" cy="346" r="16" /><circle cx="96" cy="346" r="5" /><text x="96" y="386">01</text></g>
        <g className="guide-hero-stop guide-hero-stop--two"><circle cx="286" cy="286" r="28" /><circle cx="286" cy="286" r="16" /><circle cx="286" cy="286" r="5" /><text x="286" y="326">02</text></g>
        <g className="guide-hero-stop guide-hero-stop--three"><circle cx="480" cy="210" r="28" /><circle cx="480" cy="210" r="16" /><circle cx="480" cy="210" r="5" /><text x="480" y="250">03</text></g>
        <g className="guide-hero-stop guide-hero-stop--four"><circle cx="668" cy="128" r="28" /><circle cx="668" cy="128" r="16" /><circle cx="668" cy="128" r="5" /><text x="668" y="168">04</text></g>
        <g className="guide-hero-file">
          <rect x="711" y="38" width="108" height="137" rx="10" /><rect x="698" y="49" width="108" height="137" rx="10" /><rect x="685" y="60" width="108" height="137" rx="10" />
          <path d="M708 91h55M708 110h39M708 129h48" /><path className="guide-hero-file-rule" d="M708 151h21" /><circle cx="751" cy="169" r="18" /><path d="m742 169 7 7 13-15" /><text x="738" y="215">CASE FILE</text>
        </g>
      </svg>
      <span className="guide-hero-art-label">case control / NYC</span>
    </div>
  )
}
