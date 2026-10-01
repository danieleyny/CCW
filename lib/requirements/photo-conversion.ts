import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

/**
 * A photograph we couldn't auto-convert (a PDF) is OUR work to finish, not a rejection.
 * It counts as uploaded but must NOT satisfy its requirement or let the case report ready
 * until a person converts it — otherwise the case reports ready to file with a photo the
 * portal rejects (the SPC-01 failure shape). These helpers raise/close the staff task and
 * tell readiness which requirements are still awaiting conversion.
 */

type DB = SupabaseClient<Database>
const TITLE_PREFIX = "Convert applicant photo"

async function applicantName(admin: DB, caseId: string): Promise<string> {
  const { data } = await admin.from("cases").select("clients:client_id(full_name)").eq("id", caseId).maybeSingle()
  return (data?.clients as unknown as { full_name?: string } | null)?.full_name ?? "the applicant"
}

/** Raise a staff task to convert a photo we couldn't auto-convert. Idempotent — one open
 *  photo-conversion task per case. */
export async function raisePhotoConversionTask(admin: DB, caseId: string): Promise<void> {
  const { data: open } = await admin
    .from("tasks")
    .select("id")
    .eq("case_id", caseId)
    .ilike("title", `${TITLE_PREFIX}%`)
    .neq("status", "done")
    .limit(1)
  if ((open ?? []).length > 0) return
  const name = await applicantName(admin, caseId)
  await admin.from("tasks").insert({
    case_id: caseId,
    title: `${TITLE_PREFIX} — ${name} (Photograph)`,
    description:
      "The applicant uploaded a photograph we can't auto-convert (a PDF). Open the original from the Application tab, convert it to a portal image (JPG/PNG, passport crop), and upload the converted file to the photo slot. The requirement stays open until then.",
    priority: 1,
    status: "open",
  })
}

/** Close any open photo-conversion task once a converted photo has been supplied. */
export async function closePhotoConversionTask(admin: DB, caseId: string): Promise<void> {
  await admin
    .from("tasks")
    .update({ status: "done" })
    .eq("case_id", caseId)
    .ilike("title", `${TITLE_PREFIX}%`)
    .neq("status", "done")
}

/**
 * The req_codes whose CURRENT bound document is still awaiting manual conversion. Readiness
 * uses this to keep both gates closed (and hold the ready-to-enter email) while a photo is
 * pending. Keyed on the requirement's bound document, so a later converted upload clears it.
 */
export async function pendingConversionReqCodes(admin: DB, caseId: string): Promise<string[]> {
  const { data: crs } = await admin
    .from("case_requirements")
    .select("req_code, document_id")
    .eq("case_id", caseId)
    .not("document_id", "is", null)
  const ids = (crs ?? []).map((r) => r.document_id).filter((x): x is string => !!x)
  if (ids.length === 0) return []
  const { data: docs } = await admin.from("documents").select("id, conversion_pending").in("id", ids)
  const pending = new Set((docs ?? []).filter((d) => d.conversion_pending).map((d) => d.id))
  return (crs ?? []).filter((r) => r.document_id && pending.has(r.document_id)).map((r) => r.req_code)
}
