"use client"

import { useId, useState } from "react"
import { ChevronDown, Check, X } from "lucide-react"
import type { ExampleId } from "@/lib/requirements/actions"

/**
 * "See an example" — what a good upload looks like.
 *
 * These are OUR OWN drawings, on purpose. A real person's ID or face scraped off
 * the web carries copyright and privacy exposure that has no business on a
 * firearms-licensing site, and a stock photo of someone else's documents is
 * worse. Simple on-brand SVG says everything a photo would: framing, corners,
 * background, what must be legible.
 *
 * Every illustration is aria-hidden and paired with a written description, so a
 * screen-reader user gets the same guidance in words rather than a shrug.
 */

const OK = "var(--color-ok, #4ade80)"
const BAD = "var(--color-danger, #f87171)"
const HAIR = "currentColor"

function Frame({ children, tone, label }: { children: React.ReactNode; tone: "ok" | "bad"; label: string }) {
  return (
    <figure className="min-w-0 flex-1 space-y-1.5">
      <svg viewBox="0 0 120 90" className="w-full rounded-md border border-hairline bg-surface-3" aria-hidden="true">
        {children}
      </svg>
      <figcaption className="flex items-center gap-1.5 text-[11px]" style={{ color: tone === "ok" ? OK : BAD }}>
        {tone === "ok" ? <Check className="size-3" /> : <X className="size-3" />}
        {label}
      </figcaption>
    </figure>
  )
}

/** Head-and-shoulders glyph — a person, not a portrait of anybody. */
function Head({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  return (
    <g fill="none" stroke={HAIR} strokeWidth="1.6" opacity="0.75">
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M ${cx - r * 1.7} ${cy + r * 3.1} a ${r * 1.7} ${r * 2} 0 0 1 ${r * 3.4} 0`} />
    </g>
  )
}

const EXAMPLES: Record<
  ExampleId,
  { title: string; good: React.ReactNode; bad: React.ReactNode; goodLabel: string; badLabel: string; description: string }
> = {
  "id-document": {
    title: "What a usable ID scan looks like",
    goodLabel: "All four corners, text readable",
    badLabel: "Cropped edge, glare across the text",
    description:
      "Lay the card flat on a dark surface and photograph it straight on. All four corners must be inside the frame, the whole card in focus, and no flash glare across the text.",
    good: (
      <>
        <rect x="18" y="24" width="84" height="46" rx="4" fill="none" stroke={OK} strokeWidth="1.6" />
        <Head cx={34} cy={40} r={6} />
        <g fill={HAIR} opacity="0.35">
          <rect x="50" y="34" width="42" height="3.5" rx="1.75" />
          <rect x="50" y="42" width="34" height="3.5" rx="1.75" />
          <rect x="50" y="50" width="38" height="3.5" rx="1.75" />
        </g>
      </>
    ),
    bad: (
      <>
        <rect x="30" y="24" width="96" height="46" rx="4" fill="none" stroke={BAD} strokeWidth="1.6" />
        <Head cx={46} cy={40} r={6} />
        <g fill={HAIR} opacity="0.35">
          <rect x="62" y="34" width="42" height="3.5" rx="1.75" />
          <rect x="62" y="42" width="34" height="3.5" rx="1.75" />
        </g>
        <path d="M 66 20 L 96 74" stroke={BAD} strokeWidth="10" opacity="0.18" />
      </>
    ),
  },
  "applicant-photo": {
    title: "What the NYPD photo spec looks like",
    goodLabel: "Square, plain background, head centred",
    badLabel: "Rectangular, busy background, off-centre",
    description:
      "A square photo — the same width and height, between 600×600 and 1200×1200 pixels — taken in the last 30 days against a plain light background, with your head centred and facing the camera. We check the shape and size for you when you upload.",
    good: (
      <>
        <rect x="33" y="12" width="54" height="54" rx="2" fill="none" stroke={OK} strokeWidth="1.6" />
        <Head cx={60} cy={32} r={9} />
        <text x="60" y="80" textAnchor="middle" fontSize="8" fill={HAIR} opacity="0.5">
          square
        </text>
      </>
    ),
    bad: (
      <>
        <rect x="18" y="18" width="84" height="46" rx="2" fill="none" stroke={BAD} strokeWidth="1.6" />
        <Head cx={44} cy={34} r={8} />
        <g stroke={HAIR} strokeWidth="1.2" opacity="0.3">
          <path d="M 74 24 l 10 12 l 10 -12" />
          <path d="M 72 56 h 26" />
        </g>
        <text x="60" y="80" textAnchor="middle" fontSize="8" fill={HAIR} opacity="0.5">
          not square
        </text>
      </>
    ),
  },
  "proof-of-address": {
    title: "What proof of residence must show",
    goodLabel: "Your name + NYC address, both visible",
    badLabel: "Cell phone bill — not accepted",
    description:
      "A utility bill, lease, bank statement, or government letter dated recently. Your full name and your NYC address must both be visible in the same document — that's the whole point of it. Cell phone bills are not accepted.",
    good: (
      <>
        <rect x="26" y="10" width="68" height="70" rx="3" fill="none" stroke={OK} strokeWidth="1.6" />
        <rect x="33" y="18" width="30" height="4" rx="2" fill={OK} opacity="0.75" />
        <rect x="33" y="26" width="44" height="4" rx="2" fill={OK} opacity="0.75" />
        <g fill={HAIR} opacity="0.3">
          <rect x="33" y="40" width="54" height="3" rx="1.5" />
          <rect x="33" y="48" width="54" height="3" rx="1.5" />
          <rect x="33" y="56" width="40" height="3" rx="1.5" />
        </g>
      </>
    ),
    bad: (
      <>
        <rect x="40" y="10" width="40" height="70" rx="6" fill="none" stroke={BAD} strokeWidth="1.6" />
        <g fill={HAIR} opacity="0.3">
          <rect x="47" y="24" width="26" height="3" rx="1.5" />
          <rect x="47" y="32" width="26" height="3" rx="1.5" />
          <rect x="47" y="40" width="18" height="3" rx="1.5" />
        </g>
        <path d="M 44 14 L 76 76" stroke={BAD} strokeWidth="2" />
      </>
    ),
  },
  certificate: {
    title: "What we need off your certificate",
    goodLabel: "Whole page: your name, the date, the issuer",
    badLabel: "Close-up that cuts off the date or issuer",
    description:
      "Photograph or scan the entire certificate, not a detail of it. Your name, the completion date, and the issuing instructor or agency all have to be readable — the date is what the six-month clock runs from.",
    good: (
      <>
        <rect x="16" y="16" width="88" height="58" rx="3" fill="none" stroke={OK} strokeWidth="1.6" />
        <g fill={HAIR} opacity="0.35">
          <rect x="38" y="26" width="44" height="4" rx="2" />
          <rect x="30" y="38" width="60" height="3" rx="1.5" />
          <rect x="30" y="46" width="60" height="3" rx="1.5" />
        </g>
        <circle cx="88" cy="62" r="7" fill="none" stroke={OK} strokeWidth="1.4" />
      </>
    ),
    bad: (
      <>
        <rect x="4" y="6" width="130" height="90" rx="3" fill="none" stroke={BAD} strokeWidth="1.6" />
        <g fill={HAIR} opacity="0.35">
          <rect x="34" y="40" width="60" height="6" rx="3" />
        </g>
      </>
    ),
  },
  safe: {
    title: "The two safe photos we need",
    goodLabel: "One closed, one open showing the interior",
    badLabel: "Angled shot where the lock isn't visible",
    description:
      "Two photos of the same safe or lock-box: one closed and locked, showing the lock itself, and one open showing the empty interior where the handgun will be stored. Shoot both straight on in good light.",
    good: (
      <>
        <rect x="14" y="20" width="42" height="52" rx="3" fill="none" stroke={OK} strokeWidth="1.6" />
        <circle cx="48" cy="46" r="4" fill="none" stroke={OK} strokeWidth="1.4" />
        <rect x="64" y="20" width="42" height="52" rx="3" fill="none" stroke={OK} strokeWidth="1.6" />
        <path d="M 64 20 l -12 8 v 52 l 12 -8" fill="none" stroke={OK} strokeWidth="1.4" opacity="0.6" />
        <rect x="72" y="32" width="26" height="28" rx="2" fill={HAIR} opacity="0.15" />
      </>
    ),
    bad: (
      <>
        <path d="M 30 26 l 46 -8 v 52 l -46 8 z" fill="none" stroke={BAD} strokeWidth="1.6" />
        <path d="M 76 18 l 18 10 v 52 l -18 -8" fill="none" stroke={BAD} strokeWidth="1.4" opacity="0.5" />
      </>
    ),
  },
}

export function DocumentExample({ id }: { id: ExampleId }) {
  const [open, setOpen] = useState(false)
  const descId = useId()
  const ex = EXAMPLES[id]
  if (!ex) return null

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={descId}
        className="flex items-center gap-1.5 text-xs text-text-mid transition-colors hover:text-foreground"
      >
        <ChevronDown className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
        See an example
      </button>

      {open && (
        <div id={descId} className="mt-2 rounded-md border border-hairline bg-surface-2/40 p-3">
          <div className="text-xs font-medium">{ex.title}</div>
          <div className="mt-2 flex gap-3 text-text-low">
            <Frame tone="ok" label={ex.goodLabel}>
              {ex.good}
            </Frame>
            <Frame tone="bad" label={ex.badLabel}>
              {ex.bad}
            </Frame>
          </div>
          <p className="mt-2 text-xs text-text-mid">{ex.description}</p>
        </div>
      )}
    </div>
  )
}
