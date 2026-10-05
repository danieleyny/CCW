import { describe, expect, it, vi } from "vitest"
import { convertApplicantPhotoSafely } from "@/lib/files/photo-convert-safe"

describe("convertApplicantPhotoSafely", () => {
  it("returns null instead of failing an upload when the native converter cannot load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)

    const result = await convertApplicantPhotoSafely(
      Buffer.from("valid file already stored"),
      "image/jpeg",
      async () => {
        throw new Error("libvips missing")
      }
    )

    expect(result).toBeNull()
    expect(warn).toHaveBeenCalledOnce()
    warn.mockRestore()
  })

  it("uses the converter when the native module is available", async () => {
    const expected = {
      buffer: Buffer.from("converted"),
      contentType: "image/jpeg" as const,
      note: "converted PNG → JPEG",
      width: 1200,
      height: 1200,
    }

    const result = await convertApplicantPhotoSafely(
      Buffer.from("source"),
      "image/png",
      async () => ({ convertApplicantPhoto: async () => expected })
    )

    expect(result).toEqual(expected)
  })
})
