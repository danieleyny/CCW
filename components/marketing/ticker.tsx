const ITEMS = [
  "1,200+ Clients guided",
  "~6 Month avg timeline",
  "98% On-time filing",
  "DCJS-certified instructors",
  "13-stage guided process",
  "All five boroughs + Special Carry",
]

function Row() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {ITEMS.map((t, i) => (
        <span key={i} className="flex items-center">
          <span className="engraved whitespace-nowrap px-6 text-text-mid">{t}</span>
          <span className="text-brass/40">/</span>
        </span>
      ))}
    </div>
  )
}

/** Seamless auto-scrolling trust-signal marquee; pauses on hover, static under reduced-motion. */
export function Ticker() {
  return (
    <div className="group relative overflow-hidden border-b border-hairline bg-surface-1/30 py-3">
      <div className="flex w-max animate-marquee group-hover:[animation-play-state:paused]">
        <Row />
        <Row />
      </div>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent" />
    </div>
  )
}
