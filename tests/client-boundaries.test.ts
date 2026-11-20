import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

function tsxFiles(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = join(root, entry.name)
    if (entry.isDirectory()) return tsxFiles(path)
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : []
  })
}

describe("client component boundaries", () => {
  it("marks every component that calls usePortalI18n as a client component", () => {
    const files = [...tsxFiles("app"), ...tsxFiles("components")].filter((file) =>
      readFileSync(file, "utf8").includes("usePortalI18n(")
    )

    const missingDirective = files.filter((file) => {
      const source = readFileSync(file, "utf8")
      return !source.startsWith('"use client"')
    })

    expect(missingDirective).toEqual([])
  })
})
