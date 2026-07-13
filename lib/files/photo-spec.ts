/**
 * V3-P4.2 — the NYPD application-photo spec, checked mechanically before
 * upload (38 RCNY §5-05(b)(1)): square aspect, 600×600–1200×1200 px. What a
 * machine can't check (taken ≤30 days ago, chest-up, nothing obscuring
 * identification) the UI states plainly.
 *
 * Friendly by design: an oversized SQUARE photo is auto-downscaled to spec
 * instead of rejected; only genuinely unfixable problems (not square, too
 * small, undecodable) come back as issues. Browser-only; never throws.
 */

export const PHOTO_MIN_PX = 600
export const PHOTO_MAX_PX = 1200
export const PHOTO_ASPECT_TOLERANCE = 0.02 // 2% off square is fine
const ASPECT_TOLERANCE = PHOTO_ASPECT_TOLERANCE

export interface PhotoSpecResult {
  ok: boolean
  file?: File
  issues: string[]
  width?: number
  height?: number
}

export async function normalizeApplicantPhoto(file: File): Promise<PhotoSpecResult> {
  if (!/^image\//i.test(file.type) && !/\.(heic|heif|jpe?g|png)$/i.test(file.name)) {
    return { ok: false, issues: ["The application photo must be an image (JPG or PNG)."] }
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return { ok: false, issues: ["We couldn't read that image — try a JPG or PNG."] }
  }

  const { width, height } = bitmap
  const issues: string[] = []

  const aspectOff = Math.abs(width - height) / Math.max(width, height)
  if (aspectOff > ASPECT_TOLERANCE) {
    issues.push(
      `The photo must be SQUARE — yours is ${width}×${height}. Crop it square (most phones: Edit → Crop → Square) and re-upload.`
    )
  }
  if (Math.min(width, height) < PHOTO_MIN_PX) {
    issues.push(`Too small: minimum is ${PHOTO_MIN_PX}×${PHOTO_MIN_PX}px — yours is ${width}×${height}.`)
  }
  if (issues.length > 0) {
    bitmap.close()
    return { ok: false, issues, width, height }
  }

  // In spec already?
  if (width <= PHOTO_MAX_PX) {
    bitmap.close()
    return { ok: true, file, issues: [], width, height }
  }

  // Square but oversized → downscale to the max instead of rejecting.
  const canvas = document.createElement("canvas")
  canvas.width = PHOTO_MAX_PX
  canvas.height = PHOTO_MAX_PX
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    bitmap.close()
    return { ok: true, file, issues: [], width, height } // can't fix — let it through for review
  }
  ctx.drawImage(bitmap, 0, 0, PHOTO_MAX_PX, PHOTO_MAX_PX)
  bitmap.close()
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9))
  if (!blob) return { ok: true, file, issues: [], width, height }

  const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg"
  return {
    ok: true,
    file: new File([blob], newName, { type: "image/jpeg" }),
    issues: [],
    width: PHOTO_MAX_PX,
    height: PHOTO_MAX_PX,
  }
}
