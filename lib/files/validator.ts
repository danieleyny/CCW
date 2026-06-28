/**
 * FMT-01 — upload format guard. The NYPD online portal silently rejects files
 * that are too large, the wrong type, or have "dirty" filenames (accents, &, #,
 * *, spaces). We enforce size + extension and ALWAYS sanitize the filename
 * before storage so a bad name can never cause a silent rejection downstream.
 */

export const MAX_FILE_BYTES = 5 * 1024 * 1024 // 5 MB
export const ALLOWED_EXTENSIONS = ["pdf", "jpg", "jpeg", "png", "bmp", "tif", "tiff"] as const
export type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

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

/** Validate size + extension and return the sanitized filename (FMT-01). */
export function validateFile(input: { name: string; size: number }): FileValidationResult {
  const errors: string[] = []
  const sanitizedName = sanitizeFilename(input.name)
  const extension = sanitizedName.includes(".") ? sanitizedName.split(".").pop()! : ""

  if (!ALLOWED_EXTENSIONS.includes(extension as AllowedExtension)) {
    errors.push(
      `Unsupported file type "${extension || "unknown"}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}.`
    )
  }
  if (input.size > MAX_FILE_BYTES) {
    errors.push(`File is ${(input.size / 1048576).toFixed(1)} MB; the limit is 5 MB.`)
  }

  return { ok: errors.length === 0, sanitizedName, extension, errors }
}
