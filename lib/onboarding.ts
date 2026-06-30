import "server-only"
import type { createAdminClient } from "@/lib/supabase/admin"

type Admin = ReturnType<typeof createAdminClient>

/**
 * Make a freshly-signed-up client immediately ready to work: link their auth
 * profile to a client record (reusing an unclaimed eligibility-quiz lead with
 * the same email if one exists) and open a case. Idempotent — safe to call more
 * than once. Uses the service-role client because it writes across RLS-guarded
 * rows the new user can't yet touch.
 */
export async function ensureClientCaseForProfile(
  admin: Admin,
  opts: { profileId: string; email: string; fullName: string }
): Promise<{ caseId: string; clientId: string }> {
  const email = opts.email.trim()

  // 1. Already linked to a client?
  const { data: linked } = await admin
    .from("clients")
    .select("id")
    .eq("profile_id", opts.profileId)
    .maybeSingle()
  let clientId = linked?.id as string | undefined

  // 2. Otherwise adopt an unclaimed lead captured from the quiz/contact form.
  if (!clientId) {
    const { data: lead } = await admin
      .from("clients")
      .select("id")
      .ilike("email", email)
      .is("profile_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
    if (lead?.id) {
      await admin
        .from("clients")
        .update({ profile_id: opts.profileId, full_name: opts.fullName })
        .eq("id", lead.id)
      clientId = lead.id
    }
  }

  // 3. No prior record — create a fresh client.
  if (!clientId) {
    const { data: created, error } = await admin
      .from("clients")
      .insert({
        full_name: opts.fullName,
        email,
        track: "resident",
        current_stage: "lead",
        lead_source: "self_signup",
        profile_id: opts.profileId,
      })
      .select("id")
      .single()
    if (error || !created) throw new Error(error?.message ?? "Could not create client")
    clientId = created.id
  }

  // 4. Ensure an active case exists.
  const { data: existing } = await admin
    .from("cases")
    .select("id")
    .eq("client_id", clientId)
    .limit(1)
    .maybeSingle()
  if (existing?.id) return { caseId: existing.id, clientId }

  const { data: kase, error: caseErr } = await admin
    .from("cases")
    .insert({ client_id: clientId, stage: "lead", status: "active" })
    .select("id")
    .single()
  if (caseErr || !kase) throw new Error(caseErr?.message ?? "Could not open case")
  return { caseId: kase.id, clientId }
}
