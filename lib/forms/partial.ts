import "server-only"

import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib"
import type { ReadinessItem } from "@/lib/forms/application-readiness"

/**
 * Stamp a filled-but-incomplete PD 643-041 so it can NEVER be mistaken for a
 * finished, file-ready form: a red "DRAFT — INCOMPLETE · NOT FOR FILING" band across
 * every page, and a prepended cover sheet naming every field the applicant still has
 * to supply (by NYPD question number, linked back to the screen that collects it).
 * A complete draft never passes through here — it downloads clean.
 */
export async function stampIncompleteDraft(bytes: Uint8Array, missing: ReadinessItem[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes)
  const helv = await pdf.embedFont(StandardFonts.Helvetica)
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const red = rgb(0.7, 0.12, 0.12)
  const ink = rgb(0.1, 0.1, 0.12)
  const mid = rgb(0.32, 0.32, 0.36)

  // 1) Diagonal watermark on every existing page.
  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()
    page.drawText("DRAFT — INCOMPLETE", {
      x: width * 0.12,
      y: height * 0.42,
      size: 40,
      font: helvBold,
      color: red,
      rotate: degrees(32),
      opacity: 0.18,
    })
    // A legible red bar at the very top, always readable regardless of the rotation.
    page.drawRectangle({ x: 0, y: height - 16, width, height: 16, color: red, opacity: 0.9 })
    page.drawText("DRAFT — INCOMPLETE · NOT FOR FILING · finish the missing items before you sign or file", {
      x: 12,
      y: height - 12,
      size: 7,
      font: helvBold,
      color: rgb(1, 1, 1),
    })
  }

  // 2) Cover sheet, prepended, listing what's outstanding.
  const [first] = pdf.getPages()
  const size = first ? first.getSize() : { width: 612, height: 792 }
  const cover = pdf.insertPage(0, [size.width, size.height])
  const M = 54
  let y = size.height - M

  cover.drawRectangle({ x: 0, y: size.height - 6, width: size.width, height: 6, color: red })
  cover.drawText("This draft is INCOMPLETE — not ready to file", { x: M, y, size: 17, font: helvBold, color: red })
  y -= 26
  const intro =
    "We filled the official NYPD Handgun License Application (PD 643-041) with everything on file. The items below are still blank. Finish them on your portal, then prepare a fresh, clean copy to sign and file. Do not submit this watermarked draft."
  for (const line of wrap(intro, 92)) {
    cover.drawText(line, { x: M, y, size: 10, font: helv, color: mid })
    y -= 15
  }
  y -= 10
  cover.drawText(`Still needed — ${missing.length} item${missing.length === 1 ? "" : "s"}:`, { x: M, y, size: 12, font: helvBold, color: ink })
  y -= 20

  for (const item of missing) {
    if (y < M + 24) {
      // Overflow onto another cover page rather than truncating the list.
      const next = pdf.insertPage(1, [size.width, size.height])
      y = size.height - M
      next.drawText("Still needed (continued):", { x: M, y, size: 12, font: helvBold, color: ink })
      y -= 20
      drawItem(next, M, y, item, helv, red, ink)
    } else {
      drawItem(cover, M, y, item, helv, red, ink)
    }
    y -= 16
  }

  return pdf.save()
}

function drawItem(
  page: ReturnType<PDFDocument["getPages"]>[number],
  x: number,
  y: number,
  item: ReadinessItem,
  font: Awaited<ReturnType<PDFDocument["embedFont"]>>,
  red: ReturnType<typeof rgb>,
  ink: ReturnType<typeof rgb>
) {
  page.drawText("•", { x, y, size: 10, font, color: red })
  page.drawText(item.label, { x: x + 14, y, size: 10, font, color: ink })
}

function wrap(text: string, max: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let line = ""
  for (const w of words) {
    if ((line + " " + w).trim().length > max) {
      if (line) lines.push(line)
      line = w
    } else {
      line = (line + " " + w).trim()
    }
  }
  if (line) lines.push(line)
  return lines
}
