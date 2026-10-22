import { useId } from "react"

/** A reusable visual for interior-page headings: a case path resolving into a file. */
export function GuideHeroPath() {
  const routeId = useId().replace(/:/g, "")

  return (
    <div className="guide-hero-art" aria-hidden="true">
      <svg viewBox="0 0 680 300" focusable="false">
        <defs>
          <linearGradient id={routeId} x1="84" x2="596" y1="238" y2="54" gradientUnits="userSpaceOnUse">
            <stop stopColor="var(--cyan)" />
            <stop offset="0.52" stopColor="var(--violet)" />
            <stop offset="1" stopColor="var(--tangerine)" />
          </linearGradient>
        </defs>
        <path className="guide-hero-route-shadow" d="M72 238C166 238 178 190 266 190s101-62 187-62 93-74 155-74" />
        <path className="guide-hero-route" stroke={`url(#${routeId})`} d="M72 238C166 238 178 190 266 190s101-62 187-62 93-74 155-74" />
        <g className="guide-hero-node guide-hero-node--one"><circle cx="72" cy="238" r="15" /><circle cx="72" cy="238" r="5" /></g>
        <g className="guide-hero-node guide-hero-node--two"><circle cx="266" cy="190" r="15" /><circle cx="266" cy="190" r="5" /></g>
        <g className="guide-hero-node guide-hero-node--three"><circle cx="453" cy="128" r="15" /><circle cx="453" cy="128" r="5" /></g>
        <g className="guide-hero-file">
          <rect x="558" y="36" width="82" height="104" rx="7" /><rect x="546" y="47" width="82" height="104" rx="7" /><rect x="534" y="58" width="82" height="104" rx="7" />
          <path d="M552 86h45M552 102h31M552 118h39" /><circle cx="582" cy="143" r="14" /><path d="m575 143 5 5 10-11" />
        </g>
      </svg>
      <span className="guide-hero-art-label">case path / NYC</span>
    </div>
  )
}
