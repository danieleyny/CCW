import Link from "next/link"
import {
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Star,
  ArrowRight,
  ClipboardCheck,
  ListChecks,
  Users,
  CalendarClock,
  Inbox,
} from "lucide-react"
import { getMyInstructor, getMyTrainingLocations } from "@/lib/instructor"
import { evaluateProfile } from "@/lib/instructors/profile"
import { getTrainerCases, getTrainerRequirements, progressOf } from "@/lib/trainer/queries"
import { computeTrainerNextStep } from "@/lib/trainer/next-steps"
import { createClient } from "@/lib/supabase/server"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { money, formatDateTime } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Instructor dashboard" }

/**
 * B2A — the dashboard leads with the trainer's WORK (review queue + book of
 * business + upcoming sessions), not setup. The profile/verification cards are
 * demoted below; the completeness card stays while incomplete because it gates
 * going live.
 */
export default async function InstructorDashboard() {
  const me = await getMyInstructor()
  if (!me) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-text-mid">
          Your instructor profile isn&apos;t set up yet. Please contact support.
        </CardContent>
      </Card>
    )
  }

  const supabase = await createClient()
  const locations = await getMyTrainingLocations(me.id)
  const completeness = evaluateProfile({ ...me, locations })

  // The book of business (same source + sort as /instructor/cases).
  const cases = await getTrainerCases(supabase)
  const rows = await Promise.all(
    cases.map(async (c) => {
      const reqs = await getTrainerRequirements(supabase, c.caseId)
      return { ...c, progress: progressOf(reqs), next: computeTrainerNextStep(reqs) }
    })
  )
  rows.sort((a, b) => {
    if (a.next.reviewCount !== b.next.reviewCount) return b.next.reviewCount - a.next.reviewCount
    return a.progress.percent - b.progress.percent
  })
  const totalToReview = rows.reduce((n, r) => n + r.next.reviewCount, 0)

  // Upcoming confirmed sessions across this instructor's own bookings.
  const { data: upcoming } = await supabase
    .from("bookings")
    .select("id, type, starts_at, case_id")
    .eq("instructor_id", me.id)
    .eq("status", "confirmed")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(5)

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <SectionEyebrow>Instructor</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">{me.name.split(" ")[0]}</h1>
        </div>
        <Link href="/instructor/feed" className="text-xs text-signal hover:underline">
          View requests <ArrowRight className="inline size-3" />
        </Link>
      </div>

      {/* Onboarding gate — required before going live. */}
      {!me.onboarding_completed_at && (
        <Link
          href="/instructor/onboarding"
          className="flex items-center justify-between gap-2 rounded-md border border-brass/40 bg-brass/10 px-4 py-3 text-sm text-brass-bright transition-colors hover:bg-brass/15"
        >
          <span className="flex items-center gap-2">
            <ClipboardCheck className="size-4" /> Complete your platform onboarding to go live — a few minutes.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* ── LEAD: needs-your-review + book of business ─────────────────────── */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="size-4 text-brass-bright" /> Needs your review
            {totalToReview > 0 && (
              <span className="rounded-full bg-brass px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                {totalToReview}
              </span>
            )}
          </h2>
          <Link href="/instructor/cases" className="text-xs text-signal hover:underline">
            All cases <ArrowRight className="inline size-3" />
          </Link>
        </div>

        {rows.length === 0 ? (
          <p className="flex items-center gap-2 rounded-lg border border-dashed bg-card p-6 text-sm text-muted-foreground">
            <Inbox className="size-4" /> No active cases yet. Accept one from your requests feed.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((c) => (
              <li key={c.caseId}>
                <Link href={`/instructor/cases/${c.caseId}`}>
                  <Card className="transition-colors hover:border-hairline-strong">
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Users className="size-3.5 text-brass" />
                            {c.applicantName}
                          </div>
                          <div className="mt-0.5 text-xs text-text-mid">
                            {stageMeta(c.stage as CaseStageKey).label}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-text-mid">
                          {c.next.reviewCount > 0 && (
                            <span className="rounded-full bg-brass px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                              {c.next.reviewCount} to review
                            </span>
                          )}
                          <span className="font-mono tabular-nums">
                            {c.progress.done}/{c.progress.total}
                          </span>
                          <ArrowRight className="size-4 text-text-low" />
                        </div>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                        <div
                          className="h-full rounded-full bg-brass transition-[width]"
                          style={{ width: `${c.progress.percent}%` }}
                        />
                      </div>
                      <p className="text-xs text-text-low">{c.next.headline}</p>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Upcoming confirmed sessions */}
      <section className="space-y-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CalendarClock className="size-4 text-signal" /> Upcoming sessions
        </h2>
        {(upcoming ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed bg-card p-4 text-sm text-text-mid">
            No confirmed sessions coming up.
          </p>
        ) : (
          <ul className="space-y-2">
            {(upcoming ?? []).map((b) => (
              <li key={b.id}>
                <Link
                  href={`/instructor/cases/${b.case_id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm transition-colors hover:border-hairline-strong"
                >
                  <span className="flex items-center gap-2">
                    <CalendarClock className="size-4 text-signal" />
                    <span className="capitalize">{b.type.replace(/_/g, " ")}</span>
                  </span>
                  <span className="text-text-mid">{formatDateTime(b.starts_at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── DEMOTED: setup / profile / verification ────────────────────────── */}
      {!completeness.complete && (
        <Card className="border-brass/40 bg-brass/5">
          <CardContent className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <ListChecks className="size-4 text-brass-bright" />
                <h2 className="text-sm font-semibold text-brass-bright">
                  Complete your profile to start getting matched
                </h2>
              </div>
              <span className="font-mono text-[11px] tabular-nums text-text-low">
                {completeness.percent}%
              </span>
            </div>
            <p className="mt-1.5 text-sm text-text-mid">
              Applicants only see trainers with a complete profile. Still needed:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-text-mid">
              {completeness.missing.map((c) => (
                <li key={c.key} className="flex items-start gap-2">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-brass" />
                  {c.label}
                </li>
              ))}
            </ul>
            <Link
              href="/instructor/profile"
              className="mt-3 inline-flex min-h-[40px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
            >
              Finish your profile <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {me.verified ? (
        <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <ShieldCheck className="size-4" /> Verified — you appear to clients in your service area.
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <ShieldAlert className="size-4" /> Pending verification — an admin reviews your DCJS
          credential before you appear to clients.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Service radius" value={`${me.service_radius_mi} mi`} />
        <Stat label="18-hr price" value={me.price_18h_cents ? money(me.price_18h_cents) : "—"} />
        <Stat
          label="Rating"
          value={me.rating_count ? `${me.rating_avg ?? "—"} (${me.rating_count})` : "—"}
          icon={<Star className="size-4 text-brass" />}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Training locations</h2>
            <Link href="/instructor/profile" className="text-xs text-signal hover:underline">
              Manage <ArrowRight className="inline size-3" />
            </Link>
          </div>
          {locations.length === 0 ? (
            <p className="text-sm text-text-mid">No locations yet — add a classroom or range.</p>
          ) : (
            <ul className="space-y-2">
              {locations.map((l) => (
                <li key={l.id} className="flex items-center gap-2 text-sm">
                  <MapPin className="size-4 text-signal" />
                  <span className="font-medium">{l.label}</span>
                  {l.is_range && <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">range</span>}
                  {l.address && <span className="text-text-low">· {l.address}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5">{icon}</div>
        <div className="mt-1 font-display text-xl font-semibold">{value}</div>
        <div className="engraved mt-1">{label}</div>
      </CardContent>
    </Card>
  )
}
