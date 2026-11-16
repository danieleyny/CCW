"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowRight, BriefcaseBusiness, ChevronDown, FilePenLine, Home, ShieldCheck, UserRound } from "lucide-react"
import type { DataAsk } from "@/lib/concierge/data-asks"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"

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
  const { locale, messages } = usePortalI18n()
  const t = messages.concierge
  const labels: Record<string, string> = {
    details: messages.shell.yourDetails,
    residence: "Dónde ha vivido (5 años)",
    employment: "Dónde ha trabajado (5 años)",
    safeguard: "Cómo mantendrá segura su arma",
    lon: "Sus declaraciones escritas",
    confidentiality: "Confidencialidad (opcional)",
  }

  return (
    <section className="concierge-data-asks" aria-labelledby="information-heading">
      <header className="concierge-section-heading">
        <div>
          <p className="portal-t-eyebrow text-brass-deep">{t.information}</p>
          <h2 id="information-heading" className="portal-title-font">{t.detailsReuse}</h2>
          <p>{t.completeOnce}</p>
        </div>
        <Link href="/portal/details">{t.openDetails} <ArrowRight className="size-4" aria-hidden /></Link>
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
                <strong>{locale === "es" ? labels[ask.key] ?? ask.label : ask.label}</strong>
                <span className="concierge-data-progress" aria-label={`${ask.captured} ${t.of} ${ask.total} ${t.captured}`}>
                  <span style={{ width: `${progress}%` }} />
                </span>
              </span>
              <span className="concierge-data-count">{done ? t.complete : `${ask.captured}/${ask.total}`}</span>
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
          {expanded ? t.showFewer : interpolate(t.moreSections, { count: asks.length - 3 })}
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
        </button>
      ) : null}
    </section>
  )
}
