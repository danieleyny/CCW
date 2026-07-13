"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { brand } from "@/config/brand"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { materializeCaseRequirements } from "@/lib/requirements/materialize"

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
  // V3-P0.5 — honeypot: real users never see or fill "company". Pretend success
  // so bots don't learn they were filtered.
  if (String(formData.get("company") ?? "").trim() !== "") return { ok: true }

  // V3-P0.5 — per-IP brake on this unauthenticated, row-creating action.
  const ip = clientIpFrom(await headers())
  if (!rateLimit(`lead:${ip}`, 5)) {
    return { error: "Too many submissions — please wait a minute and try again." }
  }

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

  // Reuse an unclaimed lead with the same email so re-submitting the quiz (or
  // coming back later) doesn't pile up duplicate records.
  const { data: existing } = await admin
    .from("clients")
    .select("id")
    .ilike("email", v.email)
    .is("profile_id", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  const clientFields = {
    full_name: v.name,
    email: v.email,
    phone: v.phone || null,
    borough: v.borough || null,
    track: v.track,
    current_stage: "lead" as const,
    lead_source: v.source,
    eligibility: eligibility as never,
  }

  let client: { id: string }
  if (existing?.id) {
    const { data, error } = await admin.from("clients").update(clientFields).eq("id", existing.id).select("id").single()
    if (error || !data) return { error: error?.message ?? "Could not save your details" }
    client = data
  } else {
    const { data, error } = await admin.from("clients").insert(clientFields).select("id").single()
    if (error || !data) return { error: error.message }
    client = data
  }

  // Reuse the lead's existing case if it already has one.
  const { data: existingCase } = await admin
    .from("cases")
    .select("id")
    .eq("client_id", client.id)
    .limit(1)
    .maybeSingle()
  const kase =
    existingCase ??
    (await admin.from("cases").insert({ client_id: client.id, stage: "lead", status: "active" }).select("id").single()).data

  // V3-P2.1 — baseline checklist from the versioned registry, day one.
  if (!existingCase && kase) {
    await materializeCaseRequirements(admin, kase.id, v.track === "non_resident" ? "special_carry" : "nyc", {
      isCarry: true,
    })
  }

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
