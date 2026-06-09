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
  tag: string
  readingMinutes: number
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
      return {
        slug,
        title: data.title as string,
        description: data.description as string,
        date: data.date as string,
        tag: (data.tag as string) ?? "Guide",
        readingMinutes: readingMinutes(content),
      }
    })
    .sort((a, b) => (a.date < b.date ? 1 : -1))
}

export function getPost(slug: string): { meta: PostMeta; content: string } | null {
  const file = path.join(DIR, `${slug}.mdx`)
  if (!fs.existsSync(file)) return null
  const raw = fs.readFileSync(file, "utf8")
  const { data, content } = matter(raw)
  return {
    content,
    meta: {
      slug,
      title: data.title as string,
      description: data.description as string,
      date: data.date as string,
      tag: (data.tag as string) ?? "Guide",
      readingMinutes: readingMinutes(content),
    },
  }
}
