import { type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateCohabitantAffidavitPdf } from "@/lib/cohabitants/document"
import { getSignaturePng } from "@/lib/signatures"
import { tokenActive } from "@/lib/references/process"

/** Regenerate the cohabitant's affidavit PDF on demand. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, name, relationship, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()
  if (!cohab || !tokenActive({ expires_at: cohab.token_expires_at, revoked_at: cohab.token_revoked_at }))
    return new Response("Not found", { status: 404 })

  const { data: kase } = await admin.from("cases").select("clients(full_name)").eq("id", cohab.case_id).single()
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"
  const sig = await getSignaturePng(admin, cohab.case_id, `cohabitant:${cohab.id}`)

  const pdf = await generateCohabitantAffidavitPdf({
    applicantName: applicant,
    cohabitantName: cohab.name ?? "Cohabitant",
    relationship: cohab.relationship,
    dateStr: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    signaturePng: sig,
  })

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="cohabitant-affidavit.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
