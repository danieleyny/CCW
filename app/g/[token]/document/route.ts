import { type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { fillTemplate } from "@/lib/forms/fill"
import { safeguardTokenActive, safeguardFillValues } from "@/lib/safeguard/invite"

/**
 * The safeguard person's acknowledgement, pre-filled from what the applicant entered.
 * Deliberately UNSIGNED — this NYPD form is signed in front of a WITNESS, so the
 * signature line stays blank until then. Served by token (service role); the invite
 * must be active.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("safeguard_invites")
    .select("case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!invite || !safeguardTokenActive(invite)) return new Response("This link is invalid or has expired.", { status: 404 })

  const values = await safeguardFillValues(admin, invite.case_id)
  const filled = await fillTemplate("nypd_safeguard_acknowledgement", values)
  // This IS the working form: the safeguard prints it and signs in front of a
  // WITNESS. NO watermark/banner — a "NOT FOR FILING" page would be refused, and
  // the state machine (not ink) keeps the item outstanding until the completed copy
  // is uploaded. The "to be witnessed" cue lives in the filename, which never prints.
  const bytes = filled.bytes

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="safeguard-acknowledgement-to-be-witnessed.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
