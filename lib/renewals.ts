import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"

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
    // Skip if a renewal case already exists for this client.
    const { count } = await admin
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("client_id", c.client_id)
      .eq("is_renewal", true)
    if ((count ?? 0) > 0) continue

    const { data: renewal } = await admin
      .from("cases")
      .insert({ client_id: c.client_id, stage: "lead", status: "active", is_renewal: true })
      .select("id")
      .single()

    const client = c.clients as unknown as { full_name: string } | null
    await admin.from("tasks").insert({
      case_id: renewal?.id ?? null,
      title: `Renewal due: ${client?.full_name ?? "client"}`,
      description: `License expires ${c.license_expires_on}. Open renewal workflow.`,
      priority: 1,
      status: "open",
    })
    await admin.from("activity_log").insert({
      case_id: renewal?.id ?? null,
      client_id: c.client_id,
      action: "renewal.opened",
      detail: { expires: c.license_expires_on },
    })
    opened++
  }

  return { renewalsOpened: opened }
}
