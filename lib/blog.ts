import "server-only"

import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"

const DIR = path.join(process.cwd(), "content/blog")

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  /** Optional `updated:` frontmatter → Article dateModified + sitemap lastmod. */
  updated?: string
  tag: string
  readingMinutes: number
  /** Drafts stay outside every public surface until a human changes this. */
  status: "published" | "draft"
  author: string
  /** True when automation helped create the first draft; disclosed to readers. */
  automationAssisted: boolean
}

function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .filter((f) => f.endsWith(".mdx"))
    .map((f) => {
      const slug = f.replace(/\.mdx$/, "")
      const raw = fs.readFileSync(path.join(DIR, f), "utf8")
      const { data, content } = matter(raw)
      const status: PostMeta["status"] = data.status === "draft" ? "draft" : "published"
      return {
        slug,
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        updated: (data.updated as string) || undefined,
        tag: (data.tag as string) ?? "Guide",
        readingMinutes: readingMinutes(content),
        status,
        author: (data.author as string) || "Gun License NYC editorial team",
        automationAssisted: data.automationAssisted === true,
      }
    })
    .filter((post) => post.status === "published")
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): { meta: PostMeta; content: string } | null {
  const file = path.join(DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  const { data, content } = matter(raw)
  if (data.status === "draft") return null
  return {
    content,
    meta: {
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      updated: (data.updated as string) || undefined,
      tag: (data.tag as string) ?? "Guide",
      readingMinutes: readingMinutes(content),
      status: "published",
      author: (data.author as string) || "Gun License NYC editorial team",
      automationAssisted: data.automationAssisted === true,
    },
  }
}
