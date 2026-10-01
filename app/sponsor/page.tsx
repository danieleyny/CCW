import Link from "next/link"
import { ArrowRight, FolderOpen, UserPlus, AlertTriangle } from "lucide-react"
import { loadSponsorBoard, type BoardOwner } from "@/lib/sponsor/board"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Your workers", robots: { index: false, follow: false } }

/** Owner chip tone: brass = you can act on it; everything else is muted/informational. */
const OWNER_TONE: Record<BoardOwner, string> = {
  employer: "border-brass/40 bg-brass/10 text-brass",
  worker: "border-signal/40 bg-signal/10 text-signal",
  us: "border-hairline bg-surface-2 text-text-mid",
  nypd: "border-hairline bg-surface-2 text-text-mid",
  done: "border-ok/30 bg-ok/10 text-ok",
}

/**
 * The employer board. One row per worker: what they're waiting on and who owns it. The
 * applicant's own file is never shown — only the company's packet items surface, and the
 * stage explains the rest. NYPD-controlled stages are labelled as such, never as
 * something we can hurry.
 */
export default async function SponsorHome() {
  const board = await loadSponsorBoard()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionEyebrow>Sponsor portal</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your workers</h1>
        </div>
        <Link
          href="/sponsor/requests"
          className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
        >
          <UserPlus className="size-4" /> Add a worker
        </Link>
      </div>

      {board.total === 0 ? (
        <div className="rounded-lg border border-hairline bg-card p-6 text-sm text-text-mid">
          <FolderOpen className="mb-2 size-5 text-text-low" />
          You don&apos;t have any active workers right now. A worker appears here once they&apos;ve
          consented to your access. To add one, use <span className="text-foreground">Add a worker</span>.
        </div>
      ) : (
        <>
          {/* Company summary — blocked-on-you is the number you can act on, so it leads. */}
          <div className="grid grid-cols-3 gap-3">
            <Summary figure={board.total} label="Workers" />
            <Summary figure={board.blockedOnEmployer} label="Waiting on you" tone={board.blockedOnEmployer > 0 ? "brass" : "muted"} />
            <Summary figure={board.waitingOnNypd} label="Waiting on NYPD" tone="muted" />
          </div>

          <ul className="space-y-2">
            {board.rows.map((r) => (
              <li key={r.caseId}>
                <Link
                  href={`/sponsor/${r.caseId}`}
                  className="block rounded-lg border border-hairline bg-card p-4 transition-colors hover:border-brass/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">{r.applicantName}</div>
                      <div className="mt-0.5 text-xs text-text-low">
                        {r.trackLabel} · {r.stageLabel}
                      </div>
                    </div>
                    <span className={cn("shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-medium", OWNER_TONE[r.owner])}>
                      {r.ownerLabel}
                    </span>
                  </div>

                  <p className="mt-2 text-sm text-text-mid">{r.blockingItem}</p>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-text-low">
                    {r.lastMovement && <span>Last movement {formatDate(r.lastMovement)}</span>}
                    {r.countyExpiry && (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1",
                          (r.countyExpired || r.countyExpiringSoon) && "font-medium text-warn"
                        )}
                      >
                        {(r.countyExpired || r.countyExpiringSoon) && <AlertTriangle className="size-3" />}
                        County licence {r.countyExpired ? "EXPIRED" : "expires"} {formatDate(r.countyExpiry)}
                      </span>
                    )}
                    <ArrowRight className="ml-auto size-4 text-text-low" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <p className="text-xs text-text-low">
            A worker&apos;s own documents and disclosures stay private to them — you see your company
            packet and where each worker stands.
          </p>
        </>
      )}
    </div>
  )
}

function Summary({ figure, label, tone = "muted" }: { figure: number; label: string; tone?: "brass" | "muted" }) {
  return (
    <div className={cn("rounded-lg border p-4", tone === "brass" ? "border-brass/40 bg-brass/[0.06]" : "border-hairline bg-card")}>
      <div className={cn("font-display text-2xl font-semibold tabular-nums", tone === "brass" ? "text-brass" : "text-text-hi")}>
        {figure}
      </div>
      <div className="engraved mt-1 text-text-low">{label}</div>
    </div>
  )
}
