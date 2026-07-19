import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

const INK = rgb(0.05, 0.06, 0.08)
const MUTED = rgb(0.42, 0.45, 0.5)
const BRASS = rgb(0.71, 0.54, 0.21)
const HAIR = rgb(0.85, 0.86, 0.88)

/** NYPD-friendly assembly order; unknown types fall to the end. */
export const DOC_ORDER: string[] = [
  "id",
  "proof_residence",
  "training_cert",
  "affirmation_understanding",
  "safeguard_ack",
  "reference_letter",
  "cohabitant_affidavit",
  "social_media_list",
  "safe_photo_closed",
  "safe_photo_open",
  "certificate_of_disposition",
  "order_of_protection_copy",
  "dd214",
  "cert_good_conduct",
  "name_change_proof",
  "other_license",
]
const LABELS: Record<string, string> = {
  id: "Government Photo ID",
  proof_residence: "Proof of Residence",
  training_cert: "Training Certificate (18-hour)",
  affirmation_understanding: "Affirmation of Understanding",
  safeguard_ack: "Safeguard Acknowledgment",
  reference_letter: "Character Reference",
  cohabitant_affidavit: "Cohabitant Affidavit",
  social_media_list: "Social-Media Disclosure",
  safe_photo_closed: "Safe Photo — Door Closed",
  safe_photo_open: "Safe Photo — Door Open",
  certificate_of_disposition: "Certificate of Disposition",
  order_of_protection_copy: "Order of Protection (copy)",
  dd214: "Military Discharge (DD-214)",
  cert_good_conduct: "Certificate of Good Conduct",
  name_change_proof: "Proof of Name Change",
  other_license: "Other Firearms License",
}
const labelFor = (t: string) => LABELS[t] ?? t.replace(/_/g, " ")

interface DocRow {
  type: string
  file_path: string | null
  file_name: string | null
  status: string
  notarized: boolean
}

export interface PacketItem {
  section: number
  label: string
  fileName: string
  pages: number
}

function wrap(text: string, f: PDFFont, size: number, maxWidth: number): string[] {
  const out: string[] = []
  for (const w of (text || "").split(/\s+/).filter(Boolean)) {
    const last = out[out.length - 1]
    const test = last ? `${last} ${w}` : w
    if (last && f.widthOfTextAtSize(test, size) > maxWidth) out.push(w)
    else out[out.length - (last ? 1 : 0)] = test
  }
  return out.length ? out : [""]
}

/**
 * Assemble one filing-ready PDF for a case: cover + investigator index, then
 * every non-rejected uploaded document merged in NYPD order (PDFs inlined,
 * images placed full-page, unsupported types noted). Runs via the service-role
 * client so it can read Storage.
 */
export async function assemblePacket(admin: DB, caseId: string): Promise<{ pdf: Uint8Array; items: PacketItem[] }> {
  const { data: kase } = await admin.from("cases").select("nypd_app_ref, clients(full_name)").eq("id", caseId).single()
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "Applicant"
  const appRef = (kase as unknown as { nypd_app_ref: string | null } | null)?.nypd_app_ref ?? null

  const { data: docsRaw } = await admin
    .from("documents")
    .select("type, file_path, file_name, status, notarized")
    .eq("case_id", caseId)
    .not("file_path", "is", null)
    .neq("status", "rejected")
  const docs = (docsRaw ?? []) as DocRow[]
  docs.sort((a, b) => {
    const ia = DOC_ORDER.indexOf(a.type)
    const ib = DOC_ORDER.indexOf(b.type)
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
  })

  // Load each document's bytes + page count up front.
  type Loaded = { row: DocRow; kind: "pdf" | "jpg" | "png" | "other"; bytes: Uint8Array | null; pages: number }
  const loaded: Loaded[] = []
  for (const d of docs) {
    const { data: blob } = await admin.storage.from("documents").download(d.file_path!)
    if (!blob) {
      loaded.push({ row: d, kind: "other", bytes: null, pages: 1 })
      continue
    }
    const bytes = new Uint8Array(await blob.arrayBuffer())
    const ext = (d.file_name?.split(".").pop() ?? "").toLowerCase()
    if (ext === "pdf") {
      let pages = 1
      try {
        pages = (await PDFDocument.load(bytes, { ignoreEncryption: true })).getPageCount()
      } catch {
        pages = 1
      }
      loaded.push({ row: d, kind: "pdf", bytes, pages })
    } else if (ext === "jpg" || ext === "jpeg") {
      loaded.push({ row: d, kind: "jpg", bytes, pages: 1 })
    } else if (ext === "png") {
      loaded.push({ row: d, kind: "png", bytes, pages: 1 })
    } else {
      loaded.push({ row: d, kind: "other", bytes, pages: 1 })
    }
  }

  const items: PacketItem[] = loaded.map((l, i) => ({
    section: i + 1,
    label: labelFor(l.row.type) + (l.row.notarized ? " (notarized)" : ""),
    fileName: l.row.file_name ?? "—",
    pages: l.pages,
  }))

  // ── Build master with cover + index ───────────────────────────────────────
  const master = await PDFDocument.create()
  const font = await master.embedFont(StandardFonts.Helvetica)
  const bold = await master.embedFont(StandardFonts.HelveticaBold)
  const M = 56
  const W = 612 - M * 2

  const cover = master.addPage([612, 792])
  let y = 792 - M
  cover.drawText("Gun License NYC", { x: M, y: y - 11, size: 11, font: bold, color: BRASS })
  y -= 30
  cover.drawText("Application Packet", { x: M, y: y - 22, size: 22, font: bold, color: INK })
  y -= 34
  cover.drawText(`Applicant: ${applicant}`, { x: M, y: y - 12, size: 12, font, color: INK })
  y -= 20
  cover.drawText(`NYPD reference: ${appRef ?? "—"}`, { x: M, y: y - 11, size: 11, font, color: MUTED })
  y -= 18
  cover.drawText(`Assembled: ${new Date().toISOString().slice(0, 10)}   ·   ${items.length} document(s)`, { x: M, y: y - 11, size: 11, font, color: MUTED })
  y -= 26
  cover.drawLine({ start: { x: M, y }, end: { x: M + W, y }, thickness: 0.8, color: HAIR })
  y -= 24

  cover.drawText("Index", { x: M, y: y - 13, size: 13, font: bold, color: INK })
  y -= 22
  let page: PDFPage = cover
  const ensure = (need: number) => {
    if (y - need < M) {
      page = master.addPage([612, 792])
      y = 792 - M
    }
  }
  for (const it of items) {
    ensure(16)
    const line = `${String(it.section).padStart(2, "0")}.  ${it.label}`
    page.drawText(line, { x: M, y: y - 11, size: 10.5, font, color: INK })
    page.drawText(`${it.pages} pg`, { x: M + W - 36, y: y - 11, size: 9, font, color: MUTED })
    y -= 15
    for (const l of wrap(it.fileName, font, 8.5, W - 24)) {
      ensure(12)
      page.drawText(l, { x: M + 18, y: y - 8.5, size: 8.5, font, color: MUTED })
      y -= 12
    }
    y -= 4
  }
  if (items.length === 0) {
    page.drawText("No uploaded documents yet.", { x: M, y: y - 11, size: 10.5, font, color: MUTED })
  }

  // ── Append each document ──────────────────────────────────────────────────
  for (const l of loaded) {
    if (l.kind === "pdf" && l.bytes) {
      try {
        const src = await PDFDocument.load(l.bytes, { ignoreEncryption: true })
        const copied = await master.copyPages(src, src.getPageIndices())
        copied.forEach((p) => master.addPage(p))
        continue
      } catch {
        /* fall through to placeholder */
      }
    }
    if ((l.kind === "jpg" || l.kind === "png") && l.bytes) {
      try {
        const img = l.kind === "jpg" ? await master.embedJpg(l.bytes) : await master.embedPng(l.bytes)
        const p = master.addPage([612, 792])
        p.drawText(labelFor(l.row.type), { x: M, y: 792 - M, size: 11, font: bold, color: BRASS })
        const maxW = W
        const maxH = 792 - M * 2 - 24
        const scale = Math.min(maxW / img.width, maxH / img.height, 1)
        const w = img.width * scale
        const h = img.height * scale
        p.drawImage(img, { x: M + (maxW - w) / 2, y: 792 - M - 24 - h, width: w, height: h })
        continue
      } catch {
        /* fall through */
      }
    }
    // unsupported / failed → placeholder page so the index stays accurate
    const p = master.addPage([612, 792])
    p.drawText(labelFor(l.row.type), { x: M, y: 792 - M, size: 12, font: bold, color: INK })
    p.drawText(`Original file: ${l.row.file_name ?? "—"}`, { x: M, y: 792 - M - 22, size: 10, font, color: MUTED })
    p.drawText("(Submit this file directly — its format can't be inlined here.)", { x: M, y: 792 - M - 40, size: 10, font, color: MUTED })
  }

  return { pdf: await master.save(), items }
}

/** NYPD-order index of a document type (unknown → end). */
export function docOrderIndex(type: string): number {
  const i = DOC_ORDER.indexOf(type)
  return i === -1 ? 999 : i
}

export const documentLabel = labelFor

/**
 * Concatenate several PDFs into one, page for page. Used by the filing pack to
 * prepend its guide pages onto the assembled document packet without
 * reimplementing the pdf-lib copy dance.
 */
export async function mergePdfs(parts: Uint8Array[]): Promise<Uint8Array> {
  const master = await PDFDocument.create()
  for (const bytes of parts) {
    const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const copied = await master.copyPages(src, src.getPageIndices())
    copied.forEach((p) => master.addPage(p))
  }
  return master.save()
}
