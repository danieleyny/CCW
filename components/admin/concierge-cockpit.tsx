import { Check, Loader2, ConciergeBell, FileSignature, CalendarClock, ShieldAlert } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { type CaseStageKey, isNypdControlled } from "@/config/stages"
import { loadConciergeOnboarding } from "@/lib/concierge/onboarding"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { deriveMilestones } from "@/config/concierge-milestones"
import { formatDateTime } from "@/lib/format"

/**
 * CONCIERGE Phase 5 — the staff cockpit. Shown on the admin case file ONLY for
 * service_mode='concierge' cases: a clear, read-only summary of the done-for-you
 * engagement (agreements, intro call, and the SAME milestone view the applicant
 * watches), so the assigned concierge agent operates from one glance. The
 * applicant sees the agent's PROGRESS, never their identity — the firewall holds.
 * All the levers to advance a case already live in the tabs below this panel.
 */
export async function ConciergeCockpit({
  caseId,
  clientName,
  stage,
}: {
  caseId: string
  clientName: string
  stage: CaseStageKey
}) {
  const supabase = await createClient()
  const [onboarding, gate, { data: reqs }] = await Promise.all([
    loadConciergeOnboarding(supabase, caseId),
    evaluatePreFilingGate(supabase, caseId),
    supabase.from("case_requirements").select("req_code, status").eq("case_id", caseId),
  ])

  const rows = reqs ?? []
  const applicable = rows.filter((r) => r.status !== "na")
  const refRows = rows.filter((r) => r.req_code.startsWith("REF-"))
  const milestones = deriveMilestones({
    stage,
    requirementsTotal: applicable.length,
    requirementsSatisfied: applicable.filter((r) => r.status === "satisfied").length,
    referencesSatisfied: refRows.length > 0 && refRows.every((r) => r.status === "satisfied"),
    guardOk: gate.ok,
  })

  const firstName = clientName.split(" ")[0]

  return (
    <div className="rounded-lg border border-brass/40 bg-brass/[0.04] p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ConciergeBell className="size-5 text-brass" />
          <span className="font-display text-sm font-semibold">Full Concierge — done-for-you</span>
        </div>
        <span className="rounded-full border border-brass/40 px-2 py-0.5 text-[11px] text-brass">
          You operate this case
        </span>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Operating on behalf of {firstName}. They watch your progress on their concierge dashboard — never
        your identity. Every advance you make in the tabs below shows up there.
      </p>

      {/* Onboarding status */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <StatusChip
          icon={FileSignature}
          label="Engagement agreements"
          ok={onboarding.agreementsSigned}
          okText="Signed"
          pendingText={`${onboarding.missingKinds.length} unsigned`}
        />
        <StatusChip
          icon={CalendarClock}
          label="Intro call"
          ok={!!onboarding.introCall?.scheduledAt}
          okText={onboarding.introCall?.scheduledAt ? formatDateTime(onboarding.introCall.scheduledAt) : "Booked"}
          pendingText={onboarding.introCall?.status === "requested" ? "Requested" : "Not booked"}
        />
      </div>

      {/* Milestone read-out — the same narrative the applicant sees */}
      <ol className="mt-4 space-y-2">
        {milestones.map((m) => (
          <li key={m.key} className="flex items-center gap-2.5 text-sm">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                m.status === "done"
                  ? "border-ok/50 bg-ok/15 text-ok"
                  : m.status === "in_progress"
                    ? "border-brass/50 bg-brass/15 text-brass"
                    : "border-hairline bg-surface-2 text-text-low"
              }`}
            >
              {m.status === "done" ? (
                <Check className="size-3" />
              ) : m.status === "in_progress" ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <span className="size-1 rounded-full bg-current" />
              )}
            </span>
            <span className={m.status === "upcoming" ? "text-text-low" : "text-foreground"}>{m.label}</span>
          </li>
        ))}
      </ol>

      {isNypdControlled(stage) && (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-text-mid">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-text-low" />
          This case is with the NYPD — the milestones above are complete; the clock is theirs now.
        </p>
      )}
    </div>
  )
}

function StatusChip({
  icon: Icon,
  label,
  ok,
  okText,
  pendingText,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  ok: boolean
  okText: string
  pendingText: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-hairline bg-card px-3 py-2">
      <Icon className="size-4 shrink-0 text-text-low" />
      <div className="min-w-0">
        <div className="text-[11px] uppercase tracking-wide text-text-low">{label}</div>
        <div className={`text-sm font-medium ${ok ? "text-ok" : "text-warn"}`}>{ok ? okText : pendingText}</div>
      </div>
    </div>
  )
}
