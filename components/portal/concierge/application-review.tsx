import Link from "next/link"
import { ArrowRight, User, ConciergeBell, Users, Landmark } from "lucide-react"
import { formatDate } from "@/lib/format"
import type { ReviewGroupData, ReviewTone } from "@/lib/concierge/application-review"

/**
 * CONCIERGE UX Phase 3 — read-only "Your application". No upload controls, nothing
 * actionable in place: the whole application, grouped, with who-has-it and a
 * last-activity stamp. A genuinely-theirs item links back into the vault or
 * disclosures. This is the emotional core of the concierge product — they're
 * paying to watch it happen.
 */

const TONE: Record<ReviewTone, string> = {
  ok: "text-ok",
  progress: "text-brass-bright",
  todo: "text-warn",
  waiting: "text-text-mid",
}

function whoIcon(who: string) {
  if (who === "You") return User
  if (who === "Your concierge") return ConciergeBell
  if (who === "NYPD") return Landmark
  return Users
}

export function ApplicationReview({ groups }: { groups: ReviewGroupData[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Your application</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Everything we&apos;re assembling for you, and exactly where each piece stands. We update this as
          we work — check back anytime.
        </p>
      </div>

      {groups.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className="engraved text-text-low">{g.label}</h2>
          <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
            {g.rows.map((r) => {
              const WhoIcon = whoIcon(r.whoHasIt)
              return (
                <li key={r.reqCode} className="flex items-start justify-between gap-3 p-3.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{r.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                      <span className={`font-medium ${TONE[r.tone]}`}>{r.status}</span>
                      <span className="inline-flex items-center gap-1 text-text-low">
                        <WhoIcon className="size-3" /> {r.whoHasIt}
                      </span>
                      {r.lastActivity && (
                        <span className="text-text-low">· updated {formatDate(r.lastActivity)}</span>
                      )}
                    </div>
                  </div>
                  {r.actionHref && (
                    <Link
                      href={r.actionHref}
                      className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium text-signal hover:underline"
                    >
                      Go <ArrowRight className="size-3" />
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
