/**
 * FMT-01 — upload format guard. The NYPD online portal silently rejects files
 * that are too large, the wrong type, or have "dirty" filenames (accents, &, #,
 * *, spaces). We enforce size + extension and ALWAYS sanitize the filename
 * before storage so a bad name can never cause a silent rejection downstream.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
// V3-P0.5 — heic/heif included: it's the iPhone camera default, and the gun-safe
// photo is a REQUIRED document. The client-side compressor (lib/files/compress.ts)
// converts to JPEG where the browser can decode; otherwise the original is kept.
export const ALLOWED_EXTENSIONS = ["pdf", "tif", "tiff", "jpg", "jpeg", "gif", "png", "bmp", "heic", "heif"] as const
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]
/** The portal accepts IMAGES ONLY for the photograph — a PDF is rejected there. */
export const IMAGE_EXTENSIONS = ["tif", "tiff", "jpg", "jpeg", "gif", "png", "bmp", "heic", "heif"] as const

/**
 * Make a filename portal-safe: strip accents, lowercase the extension, and
 * collapse every disallowed character (spaces, &, #, *, …) to a single dash.
 * Always returns a non-empty name with at most one extension.
 */
export function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf(".")
  let base = lastDot > 0 ? name.slice(0, lastDot) : name
  let ext = lastDot > 0 ? name.slice(lastDot + 1) : ""

  const stripAccents = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "")

  base = stripAccents(base)
    .replace(/[^a-zA-Z0-9_-]+/g, "-") // spaces / & / # / * / etc → dash
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
  if (!base) base = "file"

  ext = stripAccents(ext).toLowerCase().replace(/[^a-z0-9]/g, "")
  return ext ? `${base}.${ext}` : base
}

export interface FileValidationResult {
  ok: boolean
  sanitizedName: string
  extension: string
  errors: string[]
}

/** Validate size + extension and return the sanitized filename (FMT-01). Pass
 *  `imageOnly` for the photograph — the portal rejects a PDF there. */
export function validateFile(input: { name: string; size: number; imageOnly?: boolean }): FileValidationResult {
  const errors: string[] = []
  const sanitizedName = sanitizeFilename(input.name)
  const extension = sanitizedName.includes(".") ? sanitizedName.split(".").pop()! : ""
  const allowed = input.imageOnly ? IMAGE_EXTENSIONS : ALLOWED_EXTENSIONS

  if (!(allowed as readonly string[]).includes(extension)) {
    errors.push(
      input.imageOnly
        ? `The photograph must be an IMAGE — a PDF isn't accepted here. Allowed: ${IMAGE_EXTENSIONS.join(", ")}.`
        : `Unsupported file type "${extension || "unknown"}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`
    )
  }
  if (input.size > MAX_FILE_BYTES) {
    errors.push(`File is ${(input.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`)
  }

  return { ok: errors.length === 0, sanitizedName, extension, errors }
}
