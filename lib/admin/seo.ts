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
export type BlogArticleSummary = Pick<Database["public"]["Tables"]["blog_posts"]["Row"], "id" | "seo_content_item_id" | "status" | "title" | "slug" | "updated_at">
export type EditorialSourceSummary = Pick<
  Database["public"]["Tables"]["editorial_sources"]["Row"],
  "id" | "name" | "organization" | "url" | "source_type" | "active" | "priority" | "last_success_at" | "last_error"
>
export type EditorialRunSummary = Pick<
  Database["public"]["Tables"]["editorial_runs"]["Row"],
  "id" | "trigger" | "status" | "model" | "source_count" | "draft_count" | "article_id" | "skip_reason" | "error_message" | "started_at" | "completed_at"
>

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
  articles: BlogArticleSummary[]
  publishedPosts: PostMeta[]
  stalePosts: PostMeta[]
  sources: EditorialSourceSummary[]
  runs: EditorialRunSummary[]
  pendingDrafts: number
  counts: Record<SeoStatus, number>
  error: string | null
}

function isOlderThan(post: PostMeta, days: number, now: Date) {
  const reviewed = new Date(`${post.updated ?? post.date}T12:00:00Z`)
  return Number.isFinite(reviewed.getTime()) && now.getTime() - reviewed.getTime() > days * 86_400_000
}

export async function loadSeoDesk(): Promise<SeoDeskData> {
  const db = await createClient()
  const posts = await getAllPosts()
  const [
    { data, error },
    { data: articles, error: articleError },
    { data: sources, error: sourceError },
    { data: runs, error: runError },
  ] = await Promise.all([
    db.from("seo_content_items").select("*").order("priority", { ascending: true }).order("due_on", { ascending: true, nullsFirst: false }).order("created_at", { ascending: false }),
    db.from("blog_posts").select("id,seo_content_item_id,status,title,slug,updated_at").order("updated_at", { ascending: false }),
    db.from("editorial_sources").select("id,name,organization,url,source_type,active,priority,last_success_at,last_error").order("priority", { ascending: true }).order("name", { ascending: true }),
    db.from("editorial_runs").select("id,trigger,status,model,source_count,draft_count,article_id,skip_reason,error_message,started_at,completed_at").order("started_at", { ascending: false }).limit(12),
  ])

  const items = data ?? []
  const counts = Object.fromEntries(
    SEO_STATUSES.map((status) => [status, items.filter((item) => item.status === status).length])
  ) as Record<SeoStatus, number>

  return {
    items,
    articles: articles ?? [],
    publishedPosts: posts,
    stalePosts: posts.filter((post) => isOlderThan(post, 150, new Date())),
    sources: sources ?? [],
    runs: runs ?? [],
    pendingDrafts: (articles ?? []).filter((article) => article.status === "draft" || article.status === "review").length,
    counts,
    error: error || articleError || sourceError || runError ? "The editorial workspace could not be loaded completely." : null,
  }
}
