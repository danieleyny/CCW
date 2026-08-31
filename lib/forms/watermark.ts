import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib"

/**
 * Stamp "DRAFT — UNSIGNED" onto every page of a filled AcroForm PDF, so a wet-ink form
 * we hand over to be signed on paper can never be mistaken for a finished document
 * (verify #10). A faint diagonal across the page plus a clear top-corner banner. The
 * signed copy the applicant uploads is never watermarked — only our generated draft.
 */
export async function watermarkDraftPdf(
  bytes: Uint8Array,
  banner = "DRAFT — UNSIGNED · NOT FOR FILING"
): Promise<Uint8Array> {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const font = await pdf.embedFont(StandardFonts.HelveticaBold)
  const red = rgb(0.7, 0.11, 0.11)

  for (const page of pdf.getPages()) {
    const { width, height } = page.getSize()

    // Faint diagonal watermark, roughly centred.
    const big = "DRAFT — UNSIGNED"
    const size = Math.max(20, Math.min(width, height) * 0.07)
    const w = font.widthOfTextAtSize(big, size)
    page.drawText(big, {
      x: width / 2 - (w / 2) * 0.82,
      y: height / 2 - size,
      size,
      font,
      color: red,
      opacity: 0.12,
      rotate: degrees(35),
    })

    // Clear top banner — unambiguous even if the diagonal reads as decoration.
    const bSize = 8.5
    const bw = font.widthOfTextAtSize(banner, bSize)
    page.drawText(banner, {
      x: Math.max(12, (width - bw) / 2),
      y: height - 16,
      size: bSize,
      font,
      color: red,
      opacity: 0.55,
    })
  }
  return await pdf.save()
}
