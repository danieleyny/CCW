import "server-only"

import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { createClient as createSupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

const DIR = path.join(process.cwd(), "content/blog")

export interface PostMeta {
  slug: string
  title: string
  description: string
  date: string
  /** Optional content revision date → Article dateModified + sitemap lastmod. */
  updated?: string
  tag: string
  readingMinutes: number
  status: "published" | "draft"
  author: string
  /** True when automation helped create the first draft; disclosed to readers. */
  automationAssisted: boolean
  source: "repository" | "studio"
}

function readingMinutes(content: string): number {
  const words = content.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 200))
}

function repositoryPosts(): Array<{ meta: PostMeta; content: string }> {
  if (!fs.existsSync(DIR)) return []
  return fs
    .readdirSync(DIR)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => {
      const slug = file.replace(/\.mdx$/, "")
      const raw = fs.readFileSync(path.join(DIR, file), "utf8")
      const { data, content } = matter(raw)
      const status: PostMeta["status"] = data.status === "draft" ? "draft" : "published"
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
          status,
          author: (data.author as string) || "Gun License NYC editorial team",
          automationAssisted: data.automationAssisted === true,
          source: "repository" as const,
        },
      }
    })
    .filter((post) => post.meta.status === "published")
}

function publicClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  return createSupabaseClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function studioPosts(): Promise<Array<{ meta: PostMeta; content: string }>> {
  const db = publicClient()
  if (!db) return []
  const { data, error } = await db
    .from("public_blog_posts")
    .select("slug,title,description,tag,content_markdown,automation_assisted,published_at,updated_at")
    .order("published_at", { ascending: false })
  if (error) {
    console.error("[blog] public article projection unavailable:", error.message)
    return []
  }
  return (data ?? []).flatMap((row) => {
    if (!row.slug || !row.title || !row.description || !row.content_markdown || !row.published_at) return []
    return [{
      content: row.content_markdown,
      meta: {
        slug: row.slug,
        title: row.title,
        description: row.description,
        date: row.published_at.slice(0, 10),
        updated: row.updated_at?.slice(0, 10),
        tag: row.tag || "Guide",
        readingMinutes: readingMinutes(row.content_markdown),
        status: "published" as const,
        author: "Gun License NYC editorial team",
        automationAssisted: row.automation_assisted === true,
        source: "studio" as const,
      },
    }]
  })
}

export function getRepositoryPostSlugs() {
  return repositoryPosts().map((post) => post.meta.slug)
}

export async function getAllPosts(): Promise<PostMeta[]> {
  const merged = new Map(repositoryPosts().map((post) => [post.meta.slug, post.meta]))
  for (const post of await studioPosts()) merged.set(post.meta.slug, post.meta)
  return [...merged.values()].sort((a, b) => (a.date < b.date ? 1 : -1))
}

export async function getPost(slug: string): Promise<{ meta: PostMeta; content: string } | null> {
  const studio = (await studioPosts()).find((post) => post.meta.slug === slug)
  if (studio) return studio
  return repositoryPosts().find((post) => post.meta.slug === slug) ?? null
}
