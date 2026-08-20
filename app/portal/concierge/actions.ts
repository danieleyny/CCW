"use server"

import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { isReasonableSignature } from "@/lib/signatures"
import { logActivity } from "@/lib/activity"
import { REQUIRED_AGREEMENT_KINDS, currentAgreementVersion } from "@/config/agreements"

export type ConciergeResult = { error?: string; ok?: boolean }

/**
 * The consent affirmed when adopting a signature for the concierge engagement.
 * The applicant reads all five agreements above the pad; this records that the
 * captured signature is theirs and is being applied to that set. The applicant
 * files their own NYPD application — this signature never authorizes us to file.
 */
const AGREEMENTS_CONSENT =
  "I have read the engagement agreements above and I sign them electronically. I adopt this signature as my own; it has the same legal effect as a handwritten one. I understand I file my own NYPD application and that Gun License NYC prepares and organizes it but does not file for me or represent me."

const signSchema = z.object({
  signerName: z.string().trim().min(2, "Enter your full legal name.").max(120),
  base64Png: z.string().min(1),
})

function clientIp(h: Headers): string | null {
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null
}

/**
 * CONCIERGE Phase 2 — sign the engagement agreement set. One signing act adopts
 * the reusable applicant signature AND records a row per agreement kind (kind +
 * version), so the set gates the dashboard and each agreement carries its own
 * signed record for the audit trail. Idempotent: re-submitting the same versions
 * doesn't duplicate rows. All writes are RLS-enforced as the client (their own
 * case), no service role.
 */
export async function signAgreements(
  _prev: ConciergeResult,
  formData: FormData
): Promise<ConciergeResult> {
  await requireRole(["client"])
  const parsed = signSchema.safeParse({
    signerName: formData.get("signerName"),
    base64Png: formData.get("base64Png"),
  })
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please complete the form." }
  }
  const { signerName, base64Png } = parsed.data
  if (!isReasonableSignature(base64Png)) {
    return { error: "Please draw or type your signature first." }
  }

  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }
  if (myCase.service_mode !== "concierge") {
    return { error: "This engagement is for the concierge path." }
  }

  const supabase = await createClient()
  const h = await headers()
  const ip = clientIp(h)

  // Adopt the reusable signature (SEC-20 restricts client writes to
  // signer_key='applicant', which is exactly what we write).
  const { error: sigErr } = await supabase.from("signatures").upsert(
    {
      case_id: myCase.id,
      signer_key: "applicant",
      png_base64: base64Png,
      consent_text: AGREEMENTS_CONSENT,
      ip,
      user_agent: h.get("user-agent"),
    },
    { onConflict: "case_id,signer_key" }
  )
  if (sigErr) return { error: "Couldn't save your signature. Try again." }

  // One row per (case, kind, version). ignoreDuplicates makes a re-submit a no-op.
  const rows = REQUIRED_AGREEMENT_KINDS.map((kind) => ({
    case_id: myCase.id,
    kind,
    version: currentAgreementVersion(kind),
    signer_name: signerName,
    signed_ip: ip,
  }))
  const { error: agErr } = await supabase
    .from("case_agreements")
    .upsert(rows, { onConflict: "case_id,kind,version", ignoreDuplicates: true })
  if (agErr) return { error: "Couldn't record your agreements. Try again." }

  // QA Phase 9 — record which agreements the applicant actually opened, so the
  // "I have read the agreements above" consent has evidence behind it.
  const openedKinds = String(formData.get("openedKinds") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
  await logActivity({
    action: "concierge.agreements_signed",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
    detail: { kinds: REQUIRED_AGREEMENT_KINDS, opened: openedKinds, signer_name: signerName },
  })

  revalidatePath("/portal/concierge")
  return { ok: true }
}

/**
 * CONCIERGE Phase 2 — request the intro call (the Calendly-off fallback, shipped
 * as the default). Records the intent on intro_calls and opens a staff task. When
 * CALENDLY_CONCIERGE_URL is set the UI embeds Calendly instead and the webhook
 * fills scheduled_at/join_url; this path is the always-works floor.
 */
export async function requestIntroCall(): Promise<ConciergeResult> {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return { error: "Your case isn't set up yet." }
  if (myCase.service_mode !== "concierge") {
    return { error: "This is for the concierge path." }
  }

  const supabase = await createClient()

  // intro_calls is client-visible/writable for their own case (case_visible RLS).
  // One row per case; a re-request keeps it 'requested'.
  const { error: icErr } = await supabase.from("intro_calls").upsert(
    { case_id: myCase.id, provider: "calendly", status: "requested" },
    { onConflict: "case_id", ignoreDuplicates: true }
  )
  if (icErr) return { error: "Couldn't send your request. Try again." }

  // Service-role justified: tasks RLS is staff-write-only; this is a
  // client-initiated request that must land in the staff queue, values
  // server-derived after requireRole + case ownership.
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from("tasks")
    .select("id")
    .eq("case_id", myCase.id)
    .eq("title", "Schedule concierge intro call")
    .eq("status", "open")
    .maybeSingle()
  if (!existing) {
    await admin.from("tasks").insert({
      case_id: myCase.id,
      title: "Schedule concierge intro call",
      description: `${myCase.client.full_name} requested their concierge intro call. Reach out to book a time.`,
      priority: 1,
      status: "open",
    })
  }

  await logActivity({
    action: "concierge.intro_call_requested",
    caseId: myCase.id,
    clientId: myCase.client_id,
    entity: "case",
    entityId: myCase.id,
  })

  revalidatePath("/portal/concierge")
  return { ok: true }
}
