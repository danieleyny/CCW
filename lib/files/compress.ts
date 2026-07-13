/**
 * V3-P0.5 — client-side image downscale/re-encode before upload.
 *
 * Why: phone photos (the gun-safe shot, notarized scans) routinely exceed the
 * 5 MB portal-safe cap, and iPhones shoot HEIC. Instead of rejecting the user
 * at a REQUIRED step, we decode in the browser, downscale to a sane document
 * resolution, and re-encode as JPEG (~1–2 MB). Safari decodes HEIC natively;
 * where decode fails (e.g. HEIC on desktop Chrome) we fall back to the original
 * file and let the validator make the call.
 *
 * Browser-only (canvas). Never throws — worst case returns the input file.
 */

const MAX_DIMENSION = 2200 // plenty for a legible document/photo page
const JPEG_QUALITY = 0.82
const SKIP_UNDER_BYTES = 1_500_000 // already small JPEG/PNG → leave untouched

function isImageLike(file: File): boolean {
  return /^image\//i.test(file.type) || /\.(heic|heif|jpe?g|png|bmp|tiff?)$/i.test(file.name)
}

export async function compressImageFile(file: File): Promise<File> {
  if (typeof window === "undefined") return file
  if (!isImageLike(file)) return file // pdfs etc. pass through
  const isHeic = /\.(heic|heif)$/i.test(file.name) || /heic|heif/i.test(file.type)
  if (!isHeic && file.size <= SKIP_UNDER_BYTES) return file

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const w = Math.max(1, Math.round(bitmap.width * scale))
    const h = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    )
    if (!blob) return file
    // Only keep the re-encode when it actually helps (or converts HEIC).
    if (!isHeic && blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
    return new File([blob], newName, { type: "image/jpeg" })
  } catch {
    return file // undecodable in this browser — upload as-is
  }
}
