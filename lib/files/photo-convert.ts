import "server-only"
import sharp from "sharp"

/**
 * Server-side applicant-photo conversion. For a concierge client, getting a portal-shaped
 * image is OUR job, not theirs — accept any common image and convert it to a JPEG cropped
 * toward the passport 1:1 ratio and capped at the portal's 1200px.
 *
 * HARD LIMIT, stated plainly here and in the copy: this fixes FORMAT and DIMENSIONS ONLY.
 * It cannot fix a hat, glasses, a tilted head, poor lighting, a selfie, or a photo older
 * than 30 days — all of which NYPD rejects. Those stay a human check; the admin surface
 * flags the converted photo for review rather than implying it is now compliant.
 */

export interface PhotoConversion {
  buffer: Buffer
  contentType: "image/jpeg"
  /** Human summary of what changed — shown to staff so they know what they're sending. */
  note: string
  width: number
  height: number
}

// Raster formats sharp decodes reliably. PDF is deliberately excluded: PDF→image needs a
// rasteriser that isn't reliably available in this runtime, so a PDF photo is kept as-is
// and flagged for a person to convert — never silently "converted" into nothing.
const RASTER = /^image\/(jpeg|jpg|png|webp|gif|tiff|avif|bmp|heic|heif)$/i
const TARGET = 1200

export function isConvertiblePhoto(contentType: string): boolean {
  return RASTER.test(contentType)
}

export async function convertApplicantPhoto(input: Buffer, contentType: string): Promise<PhotoConversion | null> {
  if (!RASTER.test(contentType)) return null
  try {
    const meta = await sharp(input).metadata()
    const fromFormat = (meta.format ?? contentType.split("/")[1] ?? "image").toLowerCase()
    const out = await sharp(input, { failOn: "none" })
      .rotate() // honour EXIF orientation before cropping
      .resize({ width: TARGET, height: TARGET, fit: "cover", position: "attention" })
      .jpeg({ quality: 88 })
      .toBuffer({ resolveWithObject: true })

    const changes: string[] = []
    if (fromFormat !== "jpeg" && fromFormat !== "jpg") changes.push(`converted ${fromFormat.toUpperCase()} → JPEG`)
    if (meta.width && meta.height && meta.width !== meta.height) changes.push("cropped to a square")
    changes.push(`sized to ${out.info.width}×${out.info.height}`)
    return { buffer: out.data, contentType: "image/jpeg", note: changes.join("; "), width: out.info.width, height: out.info.height }
  } catch {
    return null
  }
}
