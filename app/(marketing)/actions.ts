"use server"

import { z } from "zod"
import { headers } from "next/headers"
import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { renderEmail } from "@/lib/email/template"
import { brand } from "@/config/brand"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { notifyFormspree } from "@/lib/formspree"
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

  // Someone who ALREADY HAS AN ACCOUNT (a claimed client) submitting this public
  // form must NOT spawn a duplicate client + lead case — that's how an applicant
  // ends up with two cases, and a trainer/consultant can get assigned to the empty
  // one by mistake. Attach the inquiry to their existing case, and never overwrite
  // a real account's record from an unauthenticated form.
  const { data: claimed } = await admin
    .from("clients")
    .select("id")
    .ilike("email", v.email)
    .not("profile_id", "is", null)
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
  if (claimed?.id) {
    // Existing account — attach the inquiry to it, never update it from here.
    client = claimed
  } else if (existing?.id) {
    const { data, error } = await admin.from("clients").update(clientFields).eq("id", existing.id).select("id").single()
    if (error || !data) return { error: error?.message ?? "Could not save your details" }
    client = data
  } else {
    const { data, error } = await admin.from("clients").insert(clientFields).select("id").single()
    if (error || !data) return { error: error.message }
    client = data
  }

  // Reuse the client's existing case (oldest, the real one). A claimed account
  // always has one, so no new case is ever created for them; only a brand-new
  // unclaimed lead gets a fresh lead case.
  const { data: existingCase } = await admin
    .from("cases")
    .select("id")
    .eq("client_id", client.id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  const kase =
    existingCase ??
    (claimed
      ? null
      : (await admin.from("cases").insert({ client_id: client.id, stage: "lead", status: "active" }).select("id").single())
          .data)

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

  // Email the submission to the business inbox. Formspree works today (no key);
  // sendEmail stays as a second channel that lights up when RESEND_API_KEY is set.
  await notifyFormspree(v.source, {
    name: v.name,
    email: v.email,
    phone: v.phone,
    borough: v.borough,
    track: v.track,
    message: v.message,
    consult_time: v.consultAt,
  })
  const { html, text } = renderEmail({
    eyebrow: "New lead",
    heading: v.name,
    paragraphs: [
      `${v.email}${v.phone ? ` · ${v.phone}` : ""}`,
      `Source: ${v.source}`,
      ...(v.message ? [v.message] : []),
    ],
    recipientReason: "Internal lead notification from the Gun License NYC site.",
  })
  await sendEmail({
    to: brand.contact.email,
    subject: `New lead: ${v.name} (${v.source})`,
    html,
    text,
  })

  return { ok: true }
}
