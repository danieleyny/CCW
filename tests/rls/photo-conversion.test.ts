/**
 * The photo-conversion staff loop (DB): a PDF photo raises exactly one task and marks the
 * requirement pending-conversion; once a converted photo is bound, the pending clears and
 * the task closes.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { adminClient, supabaseReachable } from "../helpers/supabase"
import { raisePhotoConversionTask, closePhotoConversionTask, pendingConversionReqCodes } from "@/lib/requirements/photo-conversion"

const reachable = await supabaseReachable()
const admin = adminClient()

describe.skipIf(!reachable)("photo-conversion pending state + task", () => {
  let caseId = ""
  let clientId = ""
  let phoReqId = ""
  const docIds: string[] = []

  beforeAll(async () => {
    const { data: cl } = await admin.from("clients").insert({ full_name: "Conv Test", email: `conv-${crypto.randomUUID()}@test.local`, track: "resident" }).select("id").single()
    clientId = cl!.id
    const { data: kase } = await admin.from("cases").insert({ client_id: clientId, stage: "document_collection" }).select("id").single()
    caseId = kase!.id
    const { data: req } = await admin.from("requirements").select("id").eq("req_code", "PHO-01").is("effective_to", null).limit(1).single()
    phoReqId = req!.id
    await admin.from("case_requirements").insert({ case_id: caseId, requirement_id: phoReqId, req_code: "PHO-01", status: "pending" })
  })
  afterAll(async () => {
    await admin.from("cases").delete().eq("id", caseId)
    await admin.from("clients").delete().eq("id", clientId)
  })

  async function addPhoto(pending: boolean): Promise<string> {
    const { data: doc } = await admin
      .from("documents")
      .insert({ case_id: caseId, client_id: clientId, type: "applicant_photo", status: "pending", file_name: pending ? "photo.pdf" : "photo.jpg", conversion_pending: pending, req_code: "PHO-01" })
      .select("id")
      .single()
    docIds.push(doc!.id)
    await admin.from("case_requirements").update({ document_id: doc!.id }).eq("case_id", caseId).eq("req_code", "PHO-01")
    return doc!.id
  }

  it("a PDF photo makes PHO-01 pending-conversion, and raises exactly one task (idempotent)", async () => {
    await addPhoto(true)
    expect(await pendingConversionReqCodes(admin, caseId)).toEqual(["PHO-01"])

    await raisePhotoConversionTask(admin, caseId)
    await raisePhotoConversionTask(admin, caseId) // idempotent
    const { data: tasks } = await admin.from("tasks").select("id, status, title").eq("case_id", caseId).ilike("title", "Convert applicant photo%")
    expect(tasks!.length).toBe(1)
    expect(tasks![0].status).not.toBe("done")
  })

  it("binding a converted photo clears the pending state and closes the task", async () => {
    await addPhoto(false) // staff-converted image, rebound to PHO-01
    expect(await pendingConversionReqCodes(admin, caseId)).toEqual([]) // current bound doc is not pending

    await closePhotoConversionTask(admin, caseId)
    const { data: tasks } = await admin.from("tasks").select("status").eq("case_id", caseId).ilike("title", "Convert applicant photo%")
    expect(tasks!.every((t) => t.status === "done")).toBe(true)
  })
})
