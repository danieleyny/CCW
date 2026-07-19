import { ShieldAlert, Clock, Database } from "lucide-react"
import Link from "next/link"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { DataRequestRow } from "@/components/admin/data-request-row"

export const metadata = { title: "Privacy requests" }

/**
 * PART A / Phase 3 — the staff queue for access / correction / deletion
 * requests, plus the standing state of the retention policies.
 */
export default async function AdminPrivacyPage() {
  await requireStaff()
  const supabase = await createClient()

  const [{ data: requests }, { data: policies }, { data: erasures }] = await Promise.all([
    supabase
      .from("data_requests")
      .select("id, case_id, kind, status, requester_email, detail, requested_at, resolution_note")
      .order("requested_at", { ascending: false }),
    supabase
      .from("retention_policies")
      .select("key, label, description, retain_days, enabled, action, notes")
      .order("key"),
    supabase
      .from("data_erasure_log")
      .select("id, case_id, surfaces, created_at")
      .order("created_at", { ascending: false })
      .limit(10),
  ])

  const open = (requests ?? []).filter((r) => r.status === "open" || r.status === "acknowledged")
  const closed = (requests ?? []).filter((r) => r.status === "fulfilled" || r.status === "refused")
  const livePolicies = (policies ?? []).filter((p) => p.enabled && p.retain_days)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Privacy requests"
        description="Access, correction and deletion requests from applicants — and the retention policy that governs everything else."
      />

      <section>
        <h2 className="engraved mb-2 flex items-center gap-2 text-warn">
          <ShieldAlert className="size-4" /> Open ({open.length})
        </h2>
        {open.length === 0 ? (
          <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
            Nothing outstanding.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((r) => (
              <DataRequestRow key={r.id} request={r} />
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-lg border bg-card p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-signal" /> Retention policy
        </h2>
        {livePolicies.length === 0 ? (
          <p className="mt-1 text-sm text-text-mid">
            <b>Nothing is deleted on a timer.</b> Every retention policy is disabled with no window
            set — deliberately, until counsel confirms the retention period. Firearms-licensing
            records may carry a statutory <i>minimum</i> as well as a maximum, so the number is a
            legal determination, not a default.
          </p>
        ) : (
          <p className="mt-1 text-sm text-warn">
            {livePolicies.length} policy/policies are ACTIVE and deleting data on a schedule.
          </p>
        )}
        <ul className="mt-3 space-y-1.5 text-xs">
          {(policies ?? []).map((p) => (
            <li key={p.key} className="flex items-start justify-between gap-3">
              <div>
                <span className="font-medium text-text-hi">{p.label}</span>
                <span className="text-text-low"> — {p.description}</span>
              </div>
              <span
                className={
                  p.enabled && p.retain_days
                    ? "shrink-0 rounded bg-warn/15 px-1.5 py-0.5 uppercase text-warn"
                    : "shrink-0 rounded bg-surface-2 px-1.5 py-0.5 uppercase text-text-low"
                }
              >
                {p.enabled && p.retain_days ? `${p.retain_days}d · ${p.action}` : "off"}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-text-low">
          Windows are set in the <code>retention_policies</code> table (admin-write). See{" "}
          <code>docs/DATA_INVENTORY.md</code> for what we hold and what an erasure does.
        </p>
      </section>

      {erasures && erasures.length > 0 && (
        <section>
          <h2 className="engraved mb-2 flex items-center gap-2 text-text-mid">
            <Database className="size-4" /> Recent erasures
          </h2>
          <ul className="divide-y rounded-lg border bg-card text-xs">
            {erasures.map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 p-3">
                <span className="font-mono text-text-low">{e.case_id ?? "—"}</span>
                <span className="text-text-mid">
                  {Object.entries((e.surfaces ?? {}) as Record<string, number>)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(" · ") || "no counts recorded"}
                </span>
                <span className="shrink-0 text-text-low">
                  {new Date(e.created_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {closed.length > 0 && (
        <details className="rounded-lg border bg-card/50 px-4 py-3">
          <summary className="cursor-pointer text-xs text-muted-foreground">
            Closed requests ({closed.length})
          </summary>
          <ul className="mt-3 space-y-1.5 text-xs">
            {closed.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3">
                <span>
                  {r.kind} · {r.requester_email}
                </span>
                <span className="text-text-low">{r.status}</span>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-text-low">
        Erasure is admin-only, irreversible, and recorded in <code>data_erasure_log</code> before it
        runs. Proof-of-signing records are retained and minimized rather than deleted —{" "}
        <Link href="/portal/privacy" className="text-signal underline">
          the applicant is told this
        </Link>
        .
      </p>
    </div>
  )
}
