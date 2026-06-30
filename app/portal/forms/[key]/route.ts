import { type NextRequest } from "next/server"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import {
  affirmationOfUnderstanding,
  safeStorageAttestation,
  socialMediaDisclosure,
  arrestNarratives,
  certOfDispositionRequests,
} from "@/lib/forms/documents"
import { generateCohabitantAffidavitPdf } from "@/lib/cohabitants/document"
import type { WizardAnswers } from "@/lib/intake/answers"

/** Generate a pre-filled applicant document on demand from their intake answers. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  await requireRole(["client"])
  const { key } = await params
  const myCase = await getMyCase()
  if (!myCase) return new Response("No case", { status: 404 })

  const applicant = myCase.client.full_name
  const supabase = await createClient()
  const { data: session } = await supabase
    .from("intake_sessions")
    .select("answers")
    .eq("case_id", myCase.id)
    .maybeSingle()
  const answers = (session?.answers ?? {}) as WizardAnswers
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })

  let pdf: Uint8Array
  let filename: string
  switch (key) {
    case "affirmation":
      pdf = await affirmationOfUnderstanding(applicant, dateStr)
      filename = "affirmation-of-understanding.pdf"
      break
    case "safe-storage":
      pdf = await safeStorageAttestation(applicant, dateStr)
      filename = "safe-storage-attestation.pdf"
      break
    case "social-media":
      pdf = await socialMediaDisclosure(applicant, answers.socialHandles ?? "", dateStr)
      filename = "social-media-disclosure.pdf"
      break
    case "arrest-narratives":
      pdf = await arrestNarratives(applicant, answers.arrests ?? [], dateStr)
      filename = "disclosure-explanations.pdf"
      break
    case "court-letters":
      pdf = await certOfDispositionRequests(applicant, answers.arrests ?? [], dateStr)
      filename = "cert-of-disposition-requests.pdf"
      break
    case "sole-occupancy":
      pdf = await generateCohabitantAffidavitPdf({ applicantName: applicant, cohabitantName: applicant, liveAlone: true, dateStr })
      filename = "sole-occupancy-statement.pdf"
      break
    default:
      return new Response("Unknown document", { status: 404 })
  }

  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}
