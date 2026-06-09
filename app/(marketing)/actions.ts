"use server"

import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { brand } from "@/config/brand"

export type LeadState = { ok?: boolean; error?: string }

const leadSchema = z.object({
  name: z.string().min(2, "Please enter your name"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  borough: z.string().optional(),
  track: z.enum(["resident", "business", "non_resident"]).default("resident"),
  message: z.string().optional(),
  source: z.string().default("contact"),
  eligibility: z.string().optional(), // JSON string from the quiz
  consultAt: z.string().optional(), // ISO datetime for the book flow
})

/**
 * Public lead capture (eligibility quiz, contact, book-a-consult). Runs with the
 * service-role client because anonymous visitors cannot insert under RLS. Creates
 * a client + case at the Lead stage, a follow-up task, optional consult
 * appointment, an audit entry, and a stubbed staff notification.
 */
export async function captureLead(
  _prev: LeadState,
  formData: FormData
): Promise<LeadState> {
  const parsed = leadSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    borough: formData.get("borough") ?? "",
    track: (formData.get("track") as string) || "resident",
    message: formData.get("message") ?? "",
    source: (formData.get("source") as string) || "contact",
    eligibility: formData.get("eligibility") ?? undefined,
    consultAt: formData.get("consultAt") ?? undefined,
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" }
  }
  const v = parsed.data
  const admin = createAdminClient()

  let eligibility: Record<string, unknown> = {}
  if (v.eligibility) {
    try {
      eligibility = JSON.parse(v.eligibility)
    } catch {
      // ignore malformed
    }
  }

  const { data: client, error: clientErr } = await admin
    .from("clients")
    .insert({
      full_name: v.name,
      email: v.email,
      phone: v.phone || null,
      borough: v.borough || null,
      track: v.track,
      current_stage: "lead",
      lead_source: v.source,
      eligibility: eligibility as never,
    })
    .select("id")
    .single()
  if (clientErr) return { error: clientErr.message }

  const { data: kase } = await admin
    .from("cases")
    .insert({ client_id: client.id, stage: "lead", status: "active" })
    .select("id")
    .single()

  await admin.from("tasks").insert({
    case_id: kase?.id ?? null,
    title: `New lead: ${v.name}`,
    description: v.message || `Source: ${v.source}`,
    priority: 1,
    status: "open",
  })

  if (v.consultAt) {
    await admin.from("appointments").insert({
      case_id: kase?.id ?? null,
      client_id: client.id,
      type: "consult",
      scheduled_at: v.consultAt,
      location: "Phone",
      notes: v.message || null,
    })
  }

  await admin.from("activity_log").insert({
    case_id: kase?.id ?? null,
    client_id: client.id,
    action: "lead.captured",
    entity: "client",
    entity_id: client.id,
    detail: { source: v.source },
  })

  // Stubbed staff notification (no-ops until RESEND_API_KEY is set).
  await sendEmail({
    to: brand.contact.email,
    subject: `New lead: ${v.name} (${v.source})`,
    html: `<p><strong>${v.name}</strong> — ${v.email} ${v.phone ? `· ${v.phone}` : ""}</p><p>Source: ${v.source}</p><p>${v.message ?? ""}</p>`,
  })

  return { ok: true }
}
