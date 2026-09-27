import { loadMyWorkerRequests } from "@/lib/sponsor/queries"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { WorkerRequestForm } from "@/components/sponsor/worker-request-form"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Worker requests", robots: { index: false, follow: false } }

const STATUS_TONE: Record<string, string> = {
  pending: "border-brass/40 bg-brass/10 text-brass",
  approved: "border-ok/30 bg-ok/10 text-ok",
  declined: "border-hairline bg-surface-2 text-text-mid",
}
const SCOPE_LABEL: Record<string, string> = {
  packet_only: "Company packet only",
  assist: "Assist",
  full: "Full file",
}

/** The rep requests workers here and sees the status of their own requests (RLS-scoped). */
export default async function SponsorRequestsPage() {
  const requests = await loadMyWorkerRequests()

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Sponsor portal</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Add a worker</h1>
      </div>

      <WorkerRequestForm />

      <section className="space-y-3">
        <h2 className="engraved text-text-low">Your requests</h2>
        {requests.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
            No requests yet. Submit one above and our team will set the worker up.
          </p>
        ) : (
          <ul className="space-y-2">
            {requests.map((r) => (
              <li key={r.id} className="rounded-lg border border-hairline bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{r.applicant_name}</div>
                    <div className="mt-0.5 text-xs text-text-low">
                      {r.applicant_email}
                      {r.assignment_role ? ` · ${r.assignment_role}` : ""} · {SCOPE_LABEL[r.requested_scope] ?? r.requested_scope}
                    </div>
                  </div>
                  <span className={cn("shrink-0 rounded-sm border px-2 py-0.5 text-[11px] font-medium capitalize", STATUS_TONE[r.status])}>
                    {r.status === "pending" ? "Requested" : r.status}
                  </span>
                </div>
                {r.status === "declined" && r.decline_reason && (
                  <p className="mt-2 rounded-md bg-surface-2/60 px-2 py-1.5 text-xs text-text-mid">{r.decline_reason}</p>
                )}
                <p className="mt-1.5 text-[11px] text-text-low">
                  Requested {formatDate(r.created_at)}
                  {r.resolved_at ? ` · resolved ${formatDate(r.resolved_at)}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
