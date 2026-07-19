import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { createAdminClient } from "@/lib/supabase/admin"

type DB = SupabaseClient<Database>

export interface OpenRenewalResult {
  /** null if a renewal already existed (idempotent). */
  renewalCaseId: string | null
  alreadyOpen: boolean
}

/**
 * Open ONE renewal case for a client, idempotently — the shared primitive
 * behind the cron engine, the applicant's one-click "start my renewal", and the
 * admin "open renewal now" button. A renewal is its own case with
 * `is_renewal = true`, so the requirements engine's `if_renewal` /
 * `*_not_renewal` triggers give it the right delta automatically: no character
 * references (§5-05(c)), a 2-hour live-fire refresher (RNW-01) instead of the
 * full 16+2 course.
 *
 * Service-role: this writes a case + a staff task with server-derived values.
 */
export async function openRenewalForClient(
  admin: DB,
  input: { clientId: string; fullName?: string | null; expiresOn?: string | null; source: "cron" | "applicant" | "admin" }
): Promise<OpenRenewalResult> {
  // One renewal per client — a second click (or the cron overlapping a manual
  // start) must never spawn a duplicate.
  const { data: existing } = await admin
    .from("cases")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("is_renewal", true)
    .maybeSingle()
  if (existing) return { renewalCaseId: existing.id, alreadyOpen: true }

  const { data: renewal } = await admin
    .from("cases")
    .insert({ client_id: input.clientId, stage: "lead", status: "active", is_renewal: true })
    .select("id")
    .single()

  await admin.from("tasks").insert({
    case_id: renewal?.id ?? null,
    title: `Renewal due: ${input.fullName ?? "client"}`,
    description: input.expiresOn
      ? `License expires ${input.expiresOn}. Open renewal workflow.`
      : "Renewal started. Open renewal workflow.",
    priority: 1,
    status: "open",
  })
  await admin.from("activity_log").insert({
    case_id: renewal?.id ?? null,
    client_id: input.clientId,
    action: "renewal.opened",
    detail: { expires: input.expiresOn ?? null, source: input.source },
  })

  return { renewalCaseId: renewal?.id ?? null, alreadyOpen: false }
}

/**
 * Renewal engine: find licensed cases whose 3-year license expires within 90
 * days and open a renewal case + a staff follow-up task (once). Returns how many
 * renewals were opened. Service-role (cron) context.
 */
export async function runRenewals() {
  const admin = createAdminClient()
  const horizon = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10)

  const { data: expiring } = await admin
    .from("cases")
    .select("id, client_id, license_expires_on, clients(full_name)")
    .eq("stage", "licensed")
    .not("license_expires_on", "is", null)
    .lte("license_expires_on", horizon)

  let opened = 0
  for (const c of expiring ?? []) {
    const client = c.clients as unknown as { full_name: string } | null
    const res = await openRenewalForClient(admin, {
      clientId: c.client_id,
      fullName: client?.full_name,
      expiresOn: c.license_expires_on,
      source: "cron",
    })
    if (!res.alreadyOpen) opened++
  }

  return { renewalsOpened: opened }
}
