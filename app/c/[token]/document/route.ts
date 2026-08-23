import { type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateCohabitantAffidavitPdf } from "@/lib/cohabitants/document"
import { fillTemplate } from "@/lib/forms/fill"
import { tokenActive } from "@/lib/references/process"
import { rateLimit } from "@/lib/rate-limit"

/** Regenerate the cohabitant's affidavit PDF on demand. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  // SEC-15 — throttle CPU-heavy PDF regeneration per token.
  if (!rateLimit(`cpdf:${token}`, 12)) return new Response("Too many requests", { status: 429 })
  const admin = createAdminClient()

  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, name, relationship, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!cohab || !tokenActive({ expires_at: cohab.token_expires_at, revoked_at: cohab.token_revoked_at }))
    return new Response("Not found", { status: 404 })

  const { data: kase } = await admin
    .from("cases")
    .select("license_track, clients(full_name)")
    .eq("id", cohab.case_id)
    .single()
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"
  const armed = kase?.license_track === "carry_guard" || kase?.license_track === "special_carry_guard"

  // Deliberately UNSIGNED: a jurat requires the cohabitant to sign in front of the
  // notary. On the armed-guard (Carry Guard) track we fill the OFFICIAL NYPD
  // Affidavit of Co-Habitant (household section) rather than a home-made substitute
  // — the cohabitant completes their DOB/address/phones and notarises it in person.
  const pdf = armed
    ? (await fillTemplate("nypd_cohabitant_affidavit_household", {
        name: cohab.name ?? "",
        relationship: cohab.relationship ?? "",
        applicantName: applicant,
      })).bytes
    : await generateCohabitantAffidavitPdf({
        applicantName: applicant,
        cohabitantName: cohab.name ?? "Cohabitant",
        relationship: cohab.relationship,
        dateStr: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      })

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="cohabitant-affidavit.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
