import { describe, expect, it } from "vitest"
import { validateFile, sanitizeFilename, MAX_FILE_BYTES } from "@/lib/files/validator"

describe("sanitizeFilename (FMT-01 — the NYPD portal rejects dirty names)", () => {
  it("strips accents, spaces, and symbols", () => {
    expect(sanitizeFilename("Résumé & notes #1.PDF")).toBe("Resume-notes-1.pdf")
  })
  it("never returns an empty base", () => {
    expect(sanitizeFilename("###.jpg")).toBe("file.jpg")
  })
  it("collapses to a single extension", () => {
    expect(sanitizeFilename("scan.v2.final.png")).toBe("scan-v2-final.png")
  })
})

describe("validateFile", () => {
  it("accepts HEIC (the iPhone default — a required doc must not bounce)", () => {
    expect(validateFile({ name: "safe.HEIC", size: 1_000_000 }).ok).toBe(true)
    expect(validateFile({ name: "safe.heif", size: 1_000_000 }).ok).toBe(true)
  })
  it("rejects executables and unknown types", () => {
    expect(validateFile({ name: "evil.exe", size: 100 }).ok).toBe(false)
    expect(validateFile({ name: "noextension", size: 100 }).ok).toBe(false)
  })
  it("enforces the 5 MB cap", () => {
    expect(validateFile({ name: "big.pdf", size: MAX_FILE_BYTES + 1 }).ok).toBe(false)
    expect(validateFile({ name: "fine.pdf", size: MAX_FILE_BYTES }).ok).toBe(true)
  })
})
