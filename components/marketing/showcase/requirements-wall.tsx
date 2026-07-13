"use client"

import { useEffect, useRef, useState } from "react"
import { FileText } from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * B2 — the emotional centerpiece. The 24 documents a NYC carry application
 * actually requires, grouped by phase and carrying their citations. On scroll
 * into view each card settles into place (a staggered, restrained "snap"); under
 * `prefers-reduced-motion` they simply render in their ordered state. This is
 * the "look how much we track — and it's all handled" moment, live from the
 * same structure the app runs on.
 */
const GROUPS: { phase: string; items: { label: string; cite: string }[] }[] = [
  {
    phase: "Identity & residence",
    items: [
      { label: "Government photo ID", cite: "38 RCNY §5-03" },
      { label: "Proof of NYC residence", cite: "38 RCNY §5-03" },
      { label: "Passport-style application photo", cite: "38 RCNY §5-05(b)" },
      { label: "3-year social media history", cite: "38 RCNY §5-03" },
    ],
  },
  {
    phase: "Household & references",
    items: [
      { label: "Four notarized character references", cite: "38 RCNY §5-03(a)(1)" },
      { label: "Cohabitant affidavit — every adult", cite: "38 RCNY §5-02" },
      { label: "Spousal / partner notice", cite: "38 RCNY §5-02" },
    ],
  },
  {
    phase: "Training",
    items: [
      { label: "16-hour classroom certificate", cite: "Penal Law §400.00(19)" },
      { label: "2-hour live-fire certificate", cite: "Penal Law §400.00(19)" },
      { label: "Written exam, 80%+ passing", cite: "Penal Law §400.00(19)" },
    ],
  },
  {
    phase: "Candor & disclosures",
    items: [
      { label: "Certificate of Disposition — each arrest", cite: "CPL Article 160" },
      { label: "Order-of-protection copies", cite: "38 RCNY §5-03" },
      { label: "Domestic incident reports", cite: "38 RCNY §5-03" },
      { label: "Written explanation — each item", cite: "38 RCNY §5-03" },
    ],
  },
  {
    phase: "Safe & property",
    items: [
      { label: "Gun safe photo — door open", cite: "38 RCNY §5-03" },
      { label: "Gun safe photo — door closed", cite: "38 RCNY §5-03" },
      { label: "Safe-storage acknowledgment", cite: "Penal Law §265.45" },
    ],
  },
  {
    phase: "Fees & affirmations",
    items: [
      { label: "NYPD application fee receipt", cite: "38 RCNY §5-03" },
      { label: "DCJS fingerprint fee", cite: "Executive Law §837" },
      { label: "Affirmation of understanding", cite: "38 RCNY §5-04" },
      { label: "Name-change documentation", cite: "38 RCNY §5-03" },
    ],
  },
  {
    phase: "Special tracks",
    items: [
      { label: "DD-214 (veterans)", cite: "38 RCNY §5-03" },
      { label: "Certificate of good conduct", cite: "Correction Law §703-b" },
      { label: "Out-of-state background form", cite: "38 RCNY §5-03" },
    ],
  },
]

export function RequirementsWall() {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  let idx = 0
  return (
    <section
      ref={ref}
      data-inview={inView}
      className="req-wall border-y border-hairline bg-surface-2/40 py-20"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionEyebrow>Twenty-four documents, in order</SectionEyebrow>
        <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Every piece the License Division asks for — tracked to its citation, in the order they want it.
        </h2>
        <p className="mt-3 max-w-2xl text-text-mid">
          Nothing here is a surprise, and nothing gets lost. Miss one and the application bounces; this is
          the list, grouped the way the case actually moves.
        </p>

        <div className="mt-10 grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.phase}>
              <div className="engraved mb-3 text-brass-bright">{g.phase}</div>
              <ul className="space-y-2">
                {g.items.map((it) => {
                  const delay = (idx++ % 12) * 45
                  return (
                    <li
                      key={it.label}
                      className="req-card flex items-start gap-2.5 rounded-lg border border-hairline bg-surface-1 p-3"
                      style={{ transitionDelay: `${delay}ms` }}
                    >
                      <FileText className="mt-0.5 size-4 shrink-0 text-brass" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium leading-snug">{it.label}</div>
                        <div className="mt-0.5 font-mono text-[11px] text-text-low">{it.cite}</div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
