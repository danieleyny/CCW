/**
 * V4-A1c — server-side image dimensions with no dependency.
 *
 * The browser photo validator (lib/files/photo-spec.ts) uses createImageBitmap,
 * which doesn't exist on the server, so the CP-5 gate had no way to independently
 * confirm a bound applicant photo actually meets the NYPD spec. This parses the
 * width/height straight out of the PNG and JPEG headers from a byte buffer.
 */

export interface ImageDimensions {
  width: number
  height: number
  format: "png" | "jpeg"
}

/** Read width/height from PNG or JPEG bytes. Returns null if not a recognizable image. */
export function readImageDimensions(bytes: Uint8Array): ImageDimensions | null {
  return readPng(bytes) ?? readJpeg(bytes)
}

function readPng(b: Uint8Array): ImageDimensions | null {
  // Signature 89 50 4E 47 0D 0A 1A 0A, then IHDR at offset 16 (width) / 20 (height), big-endian.
  if (b.length < 24) return null
  const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
  for (let i = 0; i < 8; i++) if (b[i] !== sig[i]) return null
  const width = be32(b, 16)
  const height = be32(b, 20)
  if (!width || !height) return null
  return { width, height, format: "png" }
}

function readJpeg(b: Uint8Array): ImageDimensions | null {
  // SOI = FF D8. Walk marker segments until a Start-Of-Frame (SOF0–SOF15,
  // excluding the non-frame markers), whose payload holds height then width.
  if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null
  let off = 2
  while (off + 9 < b.length) {
    if (b[off] !== 0xff) {
      off++
      continue
    }
    let marker = b[off + 1]
    // Skip fill bytes (0xFF padding).
    while (marker === 0xff && off + 1 < b.length) {
      off++
      marker = b[off + 1]
    }
    off += 2
    // Standalone markers with no length payload.
    if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) continue
    if (off + 1 >= b.length) break
    const segLen = (b[off] << 8) | b[off + 1]
    const isSof =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 && // DHT
      marker !== 0xc8 && // JPG extension
      marker !== 0xcc // DAC
    if (isSof) {
      if (off + 6 >= b.length) return null
      const height = (b[off + 3] << 8) | b[off + 4]
      const width = (b[off + 5] << 8) | b[off + 6]
      if (!width || !height) return null
      return { width, height, format: "jpeg" }
    }
    off += segLen
  }
  return null
}

function be32(b: Uint8Array, i: number): number {
  return (b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]
}
