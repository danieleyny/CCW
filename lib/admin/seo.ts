import "server-only"

import { getAllPosts, type PostMeta } from "@/lib/blog"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export const SEO_KINDS = [
  "applicant_question",
  "official_update",
  "guide",
  "article_refresh",
  "news_analysis",
] as const

export const SEO_STATUSES = [
  "idea",
  "drafting",
  "review",
  "approved",
  "scheduled",
  "published",
  "archived",
] as const

export type SeoKind = (typeof SEO_KINDS)[number]
export type SeoStatus = (typeof SEO_STATUSES)[number]
export type SeoItem = Database["public"]["Tables"]["seo_content_items"]["Row"]

export const SEO_KIND_LABELS: Record<SeoKind, string> = {
  applicant_question: "Applicant question",
  official_update: "Official update",
  guide: "Evergreen guide",
  article_refresh: "Article refresh",
  news_analysis: "News analysis",
}

export const SEO_STATUS_LABELS: Record<SeoStatus, string> = {
  idea: "Idea",
  drafting: "Drafting",
  review: "Needs review",
  approved: "Approved",
  scheduled: "Scheduled",
  published: "Published",
  archived: "Archived",
}

export const SEO_PRIORITY_LABELS: Record<number, string> = {
  1: "High priority",
  2: "Next up",
  3: "Backlog",
  4: "Someday",
}

export interface SeoDeskData {
  items: SeoItem[]
  publishedPosts: PostMeta[]
  stalePosts: PostMeta[]
  counts: Record<SeoStatus, number>
  error: string | null
}

function isOlderThan(post: PostMeta, days: number, now: Date) {
  const reviewed = new Date(`${post.updated ?? post.date}T12:00:00Z`)
  return Number.isFinite(reviewed.getTime()) && now.getTime() - reviewed.getTime() > days * 86_400_000
}

export async function loadSeoDesk(): Promise<SeoDeskData> {
  const db = await createClient()
  const posts = getAllPosts()
  const { data, error } = await db
    .from("seo_content_items")
    .select("*")
    .order("priority", { ascending: true })
    .order("due_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })

  const items = data ?? []
  const counts = Object.fromEntries(
    SEO_STATUSES.map((status) => [status, items.filter((item) => item.status === status).length])
  ) as Record<SeoStatus, number>

  return {
    items,
    publishedPosts: posts,
    stalePosts: posts.filter((post) => isOlderThan(post, 150, new Date())),
    counts,
    error: error ? "The editorial queue could not be loaded." : null,
  }
}
