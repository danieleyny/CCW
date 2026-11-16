"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, ChevronDown, FilePenLine, Home, ShieldCheck, UserRound } from "lucide-react"
import type { DataAsk } from "@/lib/concierge/data-asks"

const ICONS = {
  details: UserRound,
  residence: Home,
  employment: BriefcaseBusiness,
  safeguard: ShieldCheck,
  lon: FilePenLine,
  confidentiality: FilePenLine,
} as const

export function DataAsksSection({ asks }: { asks: DataAsk[] }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="concierge-data-asks" aria-labelledby="information-heading">
      <header className="concierge-section-heading">
        <div>
          <p className="portal-t-eyebrow text-brass-deep">Your information</p>
          <h2 id="information-heading" className="portal-title-font">Details we&apos;ll reuse for you</h2>
          <p>Complete it once. We carry the same verified details into every document we prepare.</p>
        </div>
        <Link href="/portal/details">Open your details <ArrowRight className="size-4" aria-hidden /></Link>
      </header>

      <div className="concierge-data-list" data-expanded={expanded}>
        {asks.map((ask, index) => {
          const Icon = ICONS[ask.key as keyof typeof ICONS] ?? FilePenLine
          const done = ask.total > 0 && ask.captured >= ask.total
          const progress = ask.total > 0 ? Math.min(100, Math.round((ask.captured / ask.total) * 100)) : 0
          return (
            <Link key={ask.key} href={ask.href} className="concierge-data-row" data-mobile-hidden={index > 2}>
              <span className="concierge-data-icon" aria-hidden><Icon className="size-[18px]" /></span>
              <span className="concierge-data-main">
                <strong>{ask.label}</strong>
                <span className="concierge-data-progress" aria-label={`${ask.captured} of ${ask.total} captured`}>
                  <span style={{ width: `${progress}%` }} />
                </span>
              </span>
              <span className="concierge-data-count">{done ? "Complete" : `${ask.captured}/${ask.total}`}</span>
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          )
        })}
      </div>

      {asks.length > 3 ? (
        <button
          type="button"
          className="concierge-data-more"
          onClick={() => setExpanded((value) => !value)}
          aria-expanded={expanded}
        >
          {expanded ? "Show fewer sections" : `${asks.length - 3} more sections`}
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
        </button>
      ) : null}
    </section>
  )
}
