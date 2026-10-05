import "server-only"
import type { PhotoConversion } from "@/lib/files/photo-convert"

type PhotoConverterModule = {
  convertApplicantPhoto: (input: Buffer, contentType: string) => Promise<PhotoConversion | null>
}

type PhotoConverterLoader = () => Promise<PhotoConverterModule>

/**
 * Load the native image converter only when an applicant-photo upload needs it.
 *
 * `sharp` is an optional native runtime dependency. A missing platform binary must
 * never prevent unrelated files (SS card, lease, training certificate, etc.) from
 * being recorded, and it must not lose a photo that already reached secure storage.
 * Returning null deliberately routes the photo to the existing staff-conversion
 * fallback instead of failing the whole upload.
 */
export async function convertApplicantPhotoSafely(
  input: Buffer,
  contentType: string,
  load: PhotoConverterLoader = () => import("@/lib/files/photo-convert")
): Promise<PhotoConversion | null> {
  try {
    const { convertApplicantPhoto } = await load()
    return await convertApplicantPhoto(input, contentType)
  } catch (error) {
    console.warn("Applicant photo conversion unavailable; queued for staff preparation.", error)
    return null
  }
}
