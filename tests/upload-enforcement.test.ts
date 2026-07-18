/**
 * The client-side upload check is bypassable — `recordDocument` is a server
 * action anyone signed in can call with any path and any filename. This drives
 * the server-side guard against REAL storage: upload something that shouldn't be
 * accepted, then assert the guard both refuses it and cleans it up.
 *
 * Skips when Supabase isn't reachable.
 */
import { describe, expect, it } from "vitest"
import { enforceUploadedFile, storedObjectSize, UploadRejected } from "@/lib/files/enforce"
import { MAX_FILE_BYTES } from "@/lib/files/validator"
import { adminClient, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
const FOLDER = "clients/__test-enforcement"

async function put(name: string, bytes: number) {
  const path = `${FOLDER}/${crypto.randomUUID()}/${name}`
  const { error } = await admin.storage
    .from("documents")
    .upload(path, Buffer.alloc(bytes, 1), { contentType: "application/octet-stream", upsert: true })
  if (error) throw error
  return path
}

describe.skipIf(!reachable)("server-side upload enforcement (FMT-01)", () => {
  it("rejects an oversized file the client claimed was fine, and deletes it", async () => {
    const path = await put("big.pdf", MAX_FILE_BYTES + 1024)
    await expect(enforceUploadedFile(admin, { path, fileName: "big.pdf" })).rejects.toThrow(UploadRejected)
    expect(await storedObjectSize(admin, path), "rejected object must not linger").toBeNull()
  })

  it("rejects a disallowed type even when the name looks harmless to the UI", async () => {
    const path = await put("payload.exe", 2048)
    await expect(enforceUploadedFile(admin, { path, fileName: "payload.exe" })).rejects.toThrow(UploadRejected)
    expect(await storedObjectSize(admin, path)).toBeNull()
  })

  it("rejects a recorded path with nothing actually behind it", async () => {
    await expect(
      enforceUploadedFile(admin, { path: `${FOLDER}/ghost/none.pdf`, fileName: "none.pdf" })
    ).rejects.toThrow(UploadRejected)
  })

  it("accepts a good file and normalizes a dirty filename instead of rejecting it", async () => {
    const path = await put("clean.pdf", 4096)
    const name = await enforceUploadedFile(admin, { path, fileName: "Résumé & scan #1.PDF" })
    expect(name).toBe("Resume-scan-1.pdf")
    expect(await storedObjectSize(admin, path), "a good file must survive").toBe(4096)
    await admin.storage.from("documents").remove([path])
  })
})
