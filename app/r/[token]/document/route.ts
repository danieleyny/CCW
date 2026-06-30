import { type NextRequest } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { generateReferenceLetterPdf } from "@/lib/references/document"
import type { ReferenceAnswers } from "@/lib/references/questions"

/** Regenerate the reference's letter PDF on demand from their stored answers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: req } = await admin
    .from("reference_requests")
    .select("answers, reference_id, case_id")
    .eq("token", token)
    .maybeSingle()
  if (!req) return new Response("Not found", { status: 404 })

  const [{ data: ref }, { data: kase }] = await Promise.all([
    admin.from("character_references").select("name, relationship, contact_email, contact_phone").eq("id", req.reference_id).single(),
    admin.from("cases").select("clients(full_name)").eq("id", req.case_id).single(),
  ])
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"

  const pdf = await generateReferenceLetterPdf({
    applicantName: applicant,
    referenceName: ref?.name ?? "Reference",
    relationship: ref?.relationship,
    contactEmail: ref?.contact_email,
    contactPhone: ref?.contact_phone,
    answers: (req.answers ?? {}) as ReferenceAnswers,
    dateStr: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
  })

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="character-reference.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
