import { inflateSync } from "zlib"
import { PDFDocument, PDFRawStream, PDFName } from "pdf-lib"

/**
 * Crude text extraction for assertions: pdf-lib Flate-compresses its content
 * streams and writes show-text operands as hex, so the visible words aren't
 * greppable in the raw bytes. Walk the real object graph (scanning for the
 * `stream` keyword derails on embedded image data), inflate what we can, and
 * decode the hex — enough to assert "this document says DRAFT" or "this
 * document prints the signing date".
 */
export async function pdfText(bytes: Uint8Array): Promise<string> {
  const pdf = await PDFDocument.load(bytes)
  let out = ""
  for (const [, obj] of pdf.context.enumerateIndirectObjects()) {
    if (!(obj instanceof PDFRawStream)) continue
    const filter = obj.dict.get(PDFName.of("Filter"))
    const raw = Buffer.from(obj.getContents())
    try {
      out += (filter === PDFName.of("FlateDecode") ? inflateSync(raw) : raw).toString("latin1")
    } catch {
      // Image data and anything else we can't inflate — not text, skip it.
    }
  }
  return out.replace(/<([0-9A-Fa-f]+)>/g, (m, hex: string) =>
    hex.length % 2 ? m : Buffer.from(hex, "hex").toString("latin1")
  )
}
