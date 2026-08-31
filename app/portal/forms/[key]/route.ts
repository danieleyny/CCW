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
  safeguardDesignation,
} from "@/lib/forms/documents"
import { generateCohabitantAffidavitPdf } from "@/lib/cohabitants/document"
import { getSignaturePng } from "@/lib/signatures"
import { fillTemplate, rawTemplate } from "@/lib/forms/fill"
import { resolveFacts } from "@/lib/facts/resolve"
import { formatSocialAccounts, type WizardAnswers } from "@/lib/intake/answers"

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
  const sig = await getSignaturePng(supabase, myCase.id, "applicant")

  let pdf: Uint8Array
  let filename: string
  switch (key) {
    case "affirmation":
      pdf = await affirmationOfUnderstanding(applicant, dateStr, sig)
      filename = "affirmation-of-understanding.pdf"
      break
    case "safe-storage":
      pdf = await safeStorageAttestation(applicant, dateStr, sig)
      filename = "safe-storage-attestation.pdf"
      break
    case "social-media":
      pdf = await socialMediaDisclosure(applicant, formatSocialAccounts(answers), dateStr, sig)
      filename = "social-media-disclosure.pdf"
      break
    case "arrest-narratives":
      pdf = await arrestNarratives(applicant, answers.arrests ?? [], dateStr, sig)
      filename = "disclosure-explanations.pdf"
      break
    case "court-letters":
      pdf = await certOfDispositionRequests(applicant, answers.arrests ?? [], dateStr, sig)
      filename = "cert-of-disposition-requests.pdf"
      break
    case "sole-occupancy":
      pdf = await generateCohabitantAffidavitPdf({ applicantName: applicant, cohabitantName: applicant, liveAlone: true, dateStr, signaturePng: sig })
      filename = "sole-occupancy-statement.pdf"
      break
    case "safeguard-designation":
      // The DESIGNATED person signs this before a notary — no applicant signature
      // is applied, so it renders with a blank rule above the jurat.
      pdf = await safeguardDesignation(
        applicant,
        {
          name: answers.safeguardName,
          relation: answers.safeguardRelation,
          address: answers.safeguardAddress,
          phone: answers.safeguardPhone,
        },
        dateStr
      )
      filename = "safeguard-person-designation.pdf"
      break
    // REL-01 — the two Release forms the applicant downloads, signs, and brings to the
    // interview. NYPD serves both; we hand them over from our held assets.
    case "release-employment": {
      // The employment record request/authorization — fillable. We fill name/address/DOB;
      // the SSN and NYPD's investigator block (Rank/Name, Tax Shield, forwarding) are
      // left blank for the applicant / the License Division.
      const f = await resolveFacts(supabase, myCase.id)
      const doc = await fillTemplate("nypd_employment_record_request", {
        fullName: f["applicant.fullName"] || applicant,
        address: f["applicant.fullAddress"],
        dob: f["applicant.dob"],
      })
      pdf = doc.bytes
      filename = "employment-record-release.pdf"
      break
    }
    case "release-medical": {
      // The HIPAA medical release (OCA Form 960) — encrypted, no fillable fields and a
      // full-SSN field we intentionally never prefill. Hand over the blank official PDF.
      const doc = rawTemplate("nypd_hipaa_release")
      if (!doc) return new Response("Unknown document", { status: 404 })
      pdf = doc.bytes
      filename = "hipaa-medical-release.pdf"
      break
    }
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
