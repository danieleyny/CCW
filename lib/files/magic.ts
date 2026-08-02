/**
 * SEC-10 — content-sniffing guard for uploads.
 *
 * `validateFile` checks the *declared* extension and filename, but the extension
 * is just a label: the reference/cohabitant token flows upload arbitrary bytes
 * with a client-supplied Content-Type, and the portal uploads straight to
 * Storage from the browser. A file named `letter.pdf` whose bytes are actually
 * `<script>` served back with `Content-Type: text/html` is stored XSS that fires
 * in a staff reviewer's browser.
 *
 * So before we trust an upload we read its leading bytes and confirm they are
 * one of the allowed *binary* document types — then store it under the
 * Content-Type WE derived from the bytes, never the one the client sent. HTML,
 * SVG (script-bearing), and anything unrecognised are rejected outright.
 */

export type SniffedKind = "pdf" | "jpeg" | "png" | "bmp" | "tiff" | "heic"

export interface SniffResult {
  kind: SniffedKind
  /** The Content-Type to STORE the object as — derived from the bytes. */
  contentType: string
}

const CONTENT_TYPE: Record<SniffedKind, string> = {
  pdf: "application/pdf",
  jpeg: "image/jpeg",
  png: "image/png",
  bmp: "image/bmp",
  tiff: "image/tiff",
  heic: "image/heic",
}

function startsWith(b: Uint8Array, sig: number[], offset = 0): boolean {
  if (b.length < offset + sig.length) return false
  for (let i = 0; i < sig.length; i++) if (b[offset + i] !== sig[i]) return false
  return true
}

/**
 * Identify an upload from its magic bytes. Returns null when the content is not
 * one of the allowed binary document types (the caller must then reject it).
 * Only the first ~16 bytes are needed.
 */
export function sniffFileType(bytes: Uint8Array): SniffResult | null {
  // PDF — "%PDF"
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) return { kind: "pdf", contentType: CONTENT_TYPE.pdf }
  // JPEG — FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return { kind: "jpeg", contentType: CONTENT_TYPE.jpeg }
  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return { kind: "png", contentType: CONTENT_TYPE.png }
  // BMP — "BM"
  if (startsWith(bytes, [0x42, 0x4d])) return { kind: "bmp", contentType: CONTENT_TYPE.bmp }
  // TIFF — "II*\0" (little-endian) or "MM\0*" (big-endian)
  if (startsWith(bytes, [0x49, 0x49, 0x2a, 0x00]) || startsWith(bytes, [0x4d, 0x4d, 0x00, 0x2a]))
    return { kind: "tiff", contentType: CONTENT_TYPE.tiff }
  // HEIC/HEIF — ISOBMFF: bytes 4..8 == "ftyp", then a HEIF-family brand.
  if (startsWith(bytes, [0x66, 0x74, 0x79, 0x70], 4)) {
    const brand = String.fromCharCode(...bytes.slice(8, 12))
    if (["heic", "heix", "heif", "hevc", "mif1", "msf1", "heim", "heis"].includes(brand))
      return { kind: "heic", contentType: CONTENT_TYPE.heic }
  }
  return null
}
