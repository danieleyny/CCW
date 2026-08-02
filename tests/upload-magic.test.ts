/**
 * SEC-10 — the magic-byte sniffer is the server-side truth about an upload's
 * type. These assert it accepts the real binary document formats and rejects
 * anything that could execute in a reviewer's browser (HTML, SVG, scripts).
 */
import { describe, expect, it } from "vitest"
import { sniffFileType } from "@/lib/files/magic"

const bytes = (...b: number[]) => new Uint8Array(b)
const ascii = (s: string) => new Uint8Array([...s].map((c) => c.charCodeAt(0)))

describe("sniffFileType", () => {
  it("accepts a real PDF and stores it as application/pdf", () => {
    expect(sniffFileType(ascii("%PDF-1.7\n"))).toEqual({ kind: "pdf", contentType: "application/pdf" })
  })

  it("accepts JPEG / PNG by signature", () => {
    expect(sniffFileType(bytes(0xff, 0xd8, 0xff, 0xe0))?.contentType).toBe("image/jpeg")
    expect(sniffFileType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))?.contentType).toBe("image/png")
  })

  it("accepts a HEIC (iPhone camera default) ftyp container", () => {
    const heic = new Uint8Array([0, 0, 0, 0x18, ...ascii("ftyp"), ...ascii("heic"), 0, 0, 0, 0])
    expect(sniffFileType(heic)?.kind).toBe("heic")
  })

  it("REJECTS HTML masquerading as an upload", () => {
    expect(sniffFileType(ascii("<!DOCTYPE html><script>alert(1)</script>"))).toBeNull()
    expect(sniffFileType(ascii("<html>"))).toBeNull()
  })

  it("REJECTS an SVG (can carry script)", () => {
    expect(sniffFileType(ascii("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull()
  })

  it("REJECTS empty / junk bytes", () => {
    expect(sniffFileType(new Uint8Array())).toBeNull()
    expect(sniffFileType(bytes(0x00, 0x01, 0x02, 0x03))).toBeNull()
  })
})
