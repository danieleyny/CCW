"use server"

import { revalidatePath } from "next/cache"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { loadSponsorCase } from "@/lib/sponsor/queries"
import { logActivity } from "@/lib/activity"
import { fillTemplate } from "@/lib/forms/fill"
import { resolveFacts } from "@/lib/facts/resolve"

/**
 * Sponsor write paths. A sponsor has NO direct table grants — every mutation runs
 * here, authorized by the sponsor_* view / RPC (the caller's own client) and then
 * executed with the admin client. Three hard limits are structural, not UI:
 *   • no signature path exists here (the DB trigger guard_signature_signer blocks
 *     any non-'applicant' signer regardless);
 *   • the sponsor may write only their OWN packet (party='sponsor') — never author
 *     the applicant's answers or documents;
 *   • no stage / "mark ready" control is exposed.
 */

const sanitize = (name: string) =>
  name.replace(/[^\w.\- ]+/g, "_").replace(/\s+/g, "_").slice(-120) || "upload"

/** Open a full-scope applicant document: the RPC checks access AND logs the read. */
export async function openSponsorDocument(documentId: string): Promise<{ url?: string; error?: string }> {
  await requireRole(["sponsor"])
  const db = await createClient()
  const { data: allowed, error } = await db.rpc("sponsor_open_document", { p_document_id: documentId })
  if (error || !allowed) return { error: "You don't have access to that document." }

  // The view/RPC deliberately omit file_path; mint the short-lived URL server-side.
  const admin = createAdminClient()
  const { data: doc } = await admin.from("documents").select("file_path").eq("id", documentId).maybeSingle()
  if (!doc?.file_path) return { error: "File unavailable." }
  const { data: signed } = await admin.storage.from("documents").createSignedUrl(doc.file_path, 300)
  if (!signed?.signedUrl) return { error: "Couldn't open the document." }
  return { url: signed.signedUrl }
}

/** Upload one company-packet (party='sponsor') document. */
export async function uploadSponsorDocument(formData: FormData): Promise<{ ok?: true; error?: string }> {
  const { userId } = await requireRole(["sponsor"])
  const caseId = String(formData.get("caseId") ?? "")
  const reqCode = String(formData.get("reqCode") ?? "")
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a file to upload." }
  if (file.size > 25 * 1024 * 1024) return { error: "That file is larger than 25 MB." }

  // Authorize via the view (active + consented + non-revoked binding for this rep).
  const scope = await loadSponsorCase(caseId)
  if (!scope) return { error: "You don't have access to this case." }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("case_requirements")
    .select("id, requirement:requirements!inner(party, document_type)")
    .eq("case_id", caseId)
    .eq("req_code", reqCode)
    .maybeSingle()
  const requirement = req?.requirement as unknown as { party: string; document_type: string | null } | null
  if (!req) return { error: "That requirement isn't on this case." }
  if (!requirement?.document_type) return { error: "This item is completed as a form, not an upload." }
  // The company packet (party='sponsor') is always the rep's to upload. Uploading
  // the APPLICANT's own paperwork is parity that only full scope grants
  // ("Pamela uploaded your utility bill"). Never a signature or a submit.
  if (requirement.party === "applicant" && scope.scope !== "full") {
    return { error: "Your access is limited to your company packet." }
  }

  const { data: kase } = await admin.from("cases").select("client_id").eq("id", caseId).maybeSingle()
  if (!kase?.client_id) return { error: "Case not found." }

  const documentId = crypto.randomUUID()
  const path = `clients/${kase.client_id}/${documentId}/${sanitize(file.name)}`
  const bytes = new Uint8Array(await file.arrayBuffer())
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, bytes, { contentType: file.type || "application/octet-stream", upsert: false })
  if (upErr) return { error: "Upload failed — please try again." }

  const { count } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .eq("type", requirement.document_type as never)
  const { error: insErr } = await admin.from("documents").insert({
    id: documentId,
    case_id: caseId,
    client_id: kase.client_id,
    type: requirement.document_type as never,
    status: "pending",
    file_path: path,
    file_name: sanitize(file.name),
    req_code: reqCode,
    version: (count ?? 0) + 1,
  })
  if (insErr) {
    await admin.storage.from("documents").remove([path])
    return { error: "Couldn't record the upload." }
  }
  await admin.from("case_requirements").update({ document_id: documentId }).eq("id", req.id)

  // Audit: the sponsor uploaded to the applicant's case.
  await admin.from("document_access_log").insert({
    document_id: documentId,
    case_id: caseId,
    viewer_profile_id: userId,
    viewer_role: "sponsor",
    req_code: reqCode,
    action: "upload",
  })
  await logActivity({
    action: "sponsor.document_uploaded",
    caseId,
    entity: "document",
    entityId: documentId,
    detail: { req_code: reqCode },
  })

  revalidatePath(`/sponsor/${caseId}`)
  return { ok: true }
}

/**
 * SPN-01 — produce the OFFICIAL company pistol-licence form pre-filled with the
 * applicant identity (from the case) and the company licence/custodian (from the
 * sponsors record). The company completes the officer/business/position fields and
 * the four notarised signatures on the real form, then uploads it. This is a
 * download helper, not the satisfying document.
 */
export async function prepareSponsorForm(caseId: string): Promise<{ url?: string; error?: string }> {
  await requireRole(["sponsor"])
  const scope = await loadSponsorCase(caseId)
  if (!scope) return { error: "You don't have access to this case." }

  const admin = createAdminClient()
  const { data: kase } = await admin.from("cases").select("client_id").eq("id", caseId).maybeSingle()
  if (!kase?.client_id) return { error: "Case not found." }

  // Everything we hold, from the ONE fact layer (applicant identity + company
  // licence/custodian + employer). The SSN is NEVER resolved for a sponsor fill.
  const f = await resolveFacts(admin, caseId)
  const filled = await fillTemplate("nypd_company_application", {
    applicantName: f["applicant.fullName"],
    applicantAddress: f["applicant.fullAddress"],
    dob: f["applicant.dob"],
    companyName: f["sponsor.legalName"],
    wgpLicenseType: "Watch, Guard or Patrol Agency",
    wgpLicenseNumber: f["sponsor.agencyLicenseNumber"],
    wgpExpire: f["sponsor.agencyLicenseExpiry"],
    custodian: f["sponsor.custodianName"],
    custodianLicenseNo: f["sponsor.custodianLicenseNumber"],
    businessAddress: f["employer.address.street"],
    businessPhone: f["employer.phone"],
    businessType: f["employer.type"],
  })

  const path = `clients/${kase.client_id}/sponsor-prefill/company-form-${Date.now()}.pdf`
  const { error: upErr } = await admin.storage
    .from("documents")
    .upload(path, Buffer.from(filled.bytes), { contentType: "application/pdf", upsert: true })
  if (upErr) return { error: "Couldn't prepare the form." }
  const { data: signed } = await admin.storage.from("documents").createSignedUrl(path, 300)
  await logActivity({ action: "sponsor.company_form_prefilled", caseId, entity: "case", entityId: caseId })
  return { url: signed?.signedUrl }
}

/** SPN-05 — the gun custodian is structured company data, not a file. */
export async function saveCustodian(formData: FormData): Promise<{ ok?: true; error?: string }> {
  await requireRole(["sponsor"])
  const caseId = String(formData.get("caseId") ?? "")
  const scope = await loadSponsorCase(caseId)
  if (!scope) return { error: "You don't have access to this case." }

  const name = String(formData.get("custodian_name") ?? "").trim()
  const licenseNumber = String(formData.get("custodian_license_number") ?? "").trim()
  if (name.length < 2 || licenseNumber.length < 2) {
    return { error: "Enter the custodian's name and NYPD licence number." }
  }

  const admin = createAdminClient()
  await admin
    .from("sponsors")
    .update({
      custodian_name: name,
      custodian_email: String(formData.get("custodian_email") ?? "").trim() || null,
      custodian_phone: String(formData.get("custodian_phone") ?? "").trim() || null,
      custodian_license_number: licenseNumber,
    })
    .eq("id", scope.sponsor_id)

  // SPN-05 is satisfied by structured data, not an uploaded document. Marking it
  // satisfied here is the one place a sponsor packet row completes without a file;
  // it never touches the applicant's rows or the CP-5 sign-off.
  await admin
    .from("case_requirements")
    .update({ status: "satisfied", notes: "Gun custodian recorded by the sponsoring company." })
    .eq("case_id", caseId)
    .eq("req_code", "SPN-05")

  await logActivity({ action: "sponsor.custodian_saved", caseId, entity: "case", entityId: caseId })
  revalidatePath(`/sponsor/${caseId}`)
  return { ok: true }
}
