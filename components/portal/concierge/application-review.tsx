"use client"

import Link from "next/link"
import { useState } from "react"
import {
  ArrowRight,
  Check,
  ConciergeBell,
  Landmark,
  User,
  Users,
  type LucideIcon,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import type { ReviewGroupData, ReviewRow, ReviewTone } from "@/lib/concierge/application-review"

type BoardRow = ReviewRow & { groupLabel: string }

const COLUMNS: Array<{
  tone: ReviewTone
  title: string
  helper: string
  icon: LucideIcon
}> = [
  { tone: "todo", title: "Needs you", helper: "Your next moves", icon: User },
  { tone: "waiting", title: "We’re on it", helper: "Your concierge is handling it", icon: ConciergeBell },
  { tone: "progress", title: "With your people", helper: "Outside responses in progress", icon: Users },
  { tone: "ok", title: "Done", helper: "Complete and organized", icon: Check },
]

function whoIcon(who: string) {
  if (who === "You") return User
  if (who === "Your concierge") return ConciergeBell
  if (who === "NYPD") return Landmark
  return Users
}

function summaryDate(value: string | null, asOf: string) {
  if (!value) return "No updates yet"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return formatDate(value)

  const now = new Date(asOf)
  if (date.toDateString() === now.toDateString()) {
    return `Today, ${new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(date)}`
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date)
}

function ReviewColumn({
  tone,
  title,
  helper,
  icon: Icon,
  rows,
  active,
}: {
  tone: ReviewTone
  title: string
  helper: string
  icon: LucideIcon
  rows: BoardRow[]
  active: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleRows = expanded ? rows : rows.slice(0, 6)

  return (
    <section
      className="application-review-column"
      data-tone={tone}
      data-active={active ? "true" : "false"}
      aria-labelledby={`application-column-${tone}`}
    >
      <header className="application-review-column-header">
        <span className="application-review-column-icon" aria-hidden><Icon /></span>
        <span className="min-w-0">
          <span className="application-review-column-title-line">
            <h2 id={`application-column-${tone}`}>{title}</h2>
            <b>{rows.length}</b>
          </span>
          <small>{helper}</small>
        </span>
      </header>

      {rows.length ? (
        <div className="application-review-row-list">
          {visibleRows.map((row) => {
            const WhoIcon = whoIcon(row.whoHasIt)
            return (
              <article key={`${row.groupLabel}-${row.reqCode}`} className="application-review-row" data-tone={tone}>
                <p className="application-review-row-group">{row.groupLabel}</p>
                <h3>{row.title}</h3>
                <p className="application-review-row-status">{row.status}</p>
                <div className="application-review-row-meta">
                  <span><WhoIcon aria-hidden /> {row.whoHasIt}</span>
                  {row.lastActivity ? <time dateTime={row.lastActivity}>{formatDate(row.lastActivity)}</time> : null}
                </div>
                {row.actionHref ? (
                  <Link href={row.actionHref} className="application-review-row-action">
                    {tone === "progress" ? "View" : "Go"} <ArrowRight aria-hidden />
                  </Link>
                ) : null}
              </article>
            )
          })}
          {rows.length > 6 ? (
            <button type="button" className="application-review-more" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Show fewer" : `${rows.length - 6} more`}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="application-review-empty">
          {tone === "todo" ? "Nothing needs you right now." : null}
          {tone === "waiting" ? "Nothing is waiting on your concierge." : null}
          {tone === "progress" ? "No outside responses are pending." : null}
          {tone === "ok" ? "Completed pieces will collect here." : null}
        </div>
      )}
    </section>
  )
}

export function ApplicationReview({ groups, asOf }: { groups: ReviewGroupData[]; asOf: string }) {
  const rows: BoardRow[] = groups.flatMap((group) =>
    group.rows.map((row) => ({ ...row, groupLabel: group.label }))
  )
  const rowsByTone = Object.fromEntries(
    COLUMNS.map(({ tone }) => [tone, rows.filter((row) => row.tone === tone)])
  ) as Record<ReviewTone, BoardRow[]>
  const firstAvailable = COLUMNS.find(({ tone }) => rowsByTone[tone].length)?.tone ?? "todo"
  const [activeTone, setActiveTone] = useState<ReviewTone>(rowsByTone.todo.length ? "todo" : firstAvailable)
  const newest = rows.reduce<string | null>((latest, row) => {
    if (!row.lastActivity) return latest
    if (!latest) return row.lastActivity
    return new Date(row.lastActivity) > new Date(latest) ? row.lastActivity : latest
  }, null)

  return (
    <div className="application-review">
      <header className="application-review-heading">
        <p>Full Concierge · read-only</p>
        <h1>Your application</h1>
        <span>
          Everything we&apos;re assembling for you, and exactly where each piece stands. We update this as
          we work — check back anytime.
        </span>
      </header>

      <section className="application-review-summary" aria-label="Application summary">
        <div className="application-review-total"><b>{rows.length}</b><span>Total pieces</span></div>
        <div className="application-review-status-wrap">
          <div className="application-review-status-bar" aria-hidden>
            {COLUMNS.slice().reverse().map(({ tone }) => (
              rowsByTone[tone].length ? (
                <span key={tone} data-tone={tone} style={{ flexGrow: rowsByTone[tone].length }} />
              ) : null
            ))}
          </div>
          <div className="application-review-legend">
            {COLUMNS.slice().reverse().map(({ tone, title }) => (
              <span key={tone} data-tone={tone}><i aria-hidden /> {title} <b>{rowsByTone[tone].length}</b></span>
            ))}
          </div>
        </div>
        <div className="application-review-updated"><span>Last update</span><b>{summaryDate(newest, asOf)}</b></div>
      </section>

      <nav className="application-review-switcher" aria-label="Application status columns">
        {COLUMNS.map(({ tone, title }) => (
          <button
            key={tone}
            type="button"
            data-tone={tone}
            aria-pressed={activeTone === tone}
            onClick={() => setActiveTone(tone)}
          >
            <span>{title}</span><b>{rowsByTone[tone].length}</b>
          </button>
        ))}
      </nav>

      <div className="application-review-board">
        {COLUMNS.map((column) => (
          <ReviewColumn
            key={column.tone}
            {...column}
            rows={rowsByTone[column.tone]}
            active={activeTone === column.tone}
          />
        ))}
      </div>
    </div>
  )
}
