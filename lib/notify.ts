import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { sendEmail } from "@/lib/email"
import { renderEmail } from "@/lib/email/template"

type DB = SupabaseClient<Database>

const portalUrl = () => `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/portal`

/**
 * Notify the applicant (in-app + email) and the engaged instructor (in-app only,
 * no PII). Used by the public reference/cohabitant flows after a status change.
 */
export async function notifyCaseParties(admin: DB, caseId: string, opts: { title: string; body: string }) {
  const { data: kase } = await admin.from("cases").select("client_id").eq("id", caseId).single()
  if (kase?.client_id) {
    const { data: client } = await admin.from("clients").select("profile_id, email").eq("id", kase.client_id).single()
    if (client?.profile_id) {
      await admin.from("notifications").insert({
        recipient: client.profile_id, case_id: caseId, kind: "info", title: opts.title, body: opts.body, link: "/portal/people",
      })
    }
    if (client?.email) {
      const { html, text } = renderEmail({
        preheader: opts.body,
        heading: opts.title,
        paragraphs: [opts.body],
        cta: { label: "View your case →", url: portalUrl() },
        recipientReason: "You're receiving this because it concerns your NYC carry-license application.",
      })
      await sendEmail({ to: client.email, subject: opts.title, html, text })
    }
  }
  const { data: eng } = await admin
    .from("engagements")
    .select("instructor_id")
    .eq("case_id", caseId)
    .eq("status", "active")
    .maybeSingle()
  if (eng) {
    const { data: instr } = await admin.from("instructors").select("profile_id").eq("id", eng.instructor_id).single()
    if (instr?.profile_id) {
      await admin.from("notifications").insert({
        recipient: instr.profile_id, case_id: caseId, kind: "info", title: opts.title, body: opts.body, link: "/instructor/cases",
      })
    }
  }
}
