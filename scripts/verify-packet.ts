/**
 * Packet assembler acceptance — one filing-ready PDF (cover + index + merged
 * documents in NYPD order). Uses the seeded case that has uploaded documents.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-packet.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { PDFDocument } from "pdf-lib"
import { assemblePacket } from "../lib/packet/assemble"

loadEnv({ path: ".env.local" })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}

async function main() {
  console.log("\n— Packet assembler verification —\n")

  // A seeded case with uploaded documents (Jordan Rivera).
  const { data: jc } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
  const { data: jcase } = await admin.from("cases").select("id").eq("client_id", jc!.id).limit(1).single()
  const caseId = jcase!.id

  const { count: docCount } = await admin
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("case_id", caseId)
    .not("file_path", "is", null)
    .neq("status", "rejected")

  const { pdf, items } = await assemblePacket(tadmin, caseId)
  const buf = Buffer.from(pdf)
  check(buf.subarray(0, 5).toString("latin1") === "%PDF-", `assembles a valid PDF (${pdf.length} bytes)`)
  check(items.length === (docCount ?? 0), `index lists every non-rejected uploaded document (${items.length})`)
  check(items.length >= 1, "the seeded case contributes at least one document")

  const doc = await PDFDocument.load(pdf)
  // cover/index page(s) + one+ page per document
  check(doc.getPageCount() >= items.length + 1, `merged PDF has cover/index + each document (${doc.getPageCount()} pages)`)

  // documents appear in NYPD order (id before safe photos)
  const idIdx = items.findIndex((i) => i.label.startsWith("Government Photo ID"))
  const safeIdx = items.findIndex((i) => i.label.startsWith("Safe Photo"))
  check(idIdx === -1 || safeIdx === -1 || idIdx < safeIdx, "documents are ordered (ID before safe photos)")

  // Graceful with an empty case
  const ec = await admin.from("clients").insert({ full_name: "ZZ Empty", track: "resident", current_stage: "lead" }).select("id").single()
  const ecase = await admin.from("cases").insert({ client_id: ec.data!.id, stage: "lead", status: "active" }).select("id").single()
  const empty = await assemblePacket(tadmin, ecase.data!.id)
  check(Buffer.from(empty.pdf).subarray(0, 5).toString("latin1") === "%PDF-" && empty.items.length === 0, "produces a valid cover/index even with no documents")
  await admin.from("clients").delete().eq("id", ec.data!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Packet assembler\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
