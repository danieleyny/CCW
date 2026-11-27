import { describe, expect, it } from "vitest"
import { selectRelatedPosts } from "@/lib/blog/related"

describe("related article selection", () => {
  it("prefers the same topic, excludes the current article and then sorts by freshness", () => {
    const current = { slug: "current", tag: "Documents", date: "2026-11-20" }
    const posts = [
      current,
      { slug: "new-process", tag: "Process", date: "2026-11-25" },
      { slug: "old-document", tag: "Documents", date: "2026-10-01" },
      { slug: "updated-document", tag: "Documents", date: "2026-09-01", updated: "2026-11-24" },
      { slug: "old-process", tag: "Process", date: "2026-08-01" },
    ]

    expect(selectRelatedPosts(current, posts, 3).map((post) => post.slug)).toEqual([
      "updated-document",
      "old-document",
      "new-process",
    ])
  })
})
