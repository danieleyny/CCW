import "server-only"

import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type BlogPostRow = Database["public"]["Tables"]["blog_posts"]["Row"]
export type SeoContentRow = Database["public"]["Tables"]["seo_content_items"]["Row"]

export async function loadArticle(id: string) {
  const db = await createClient()
  const { data: article, error } = await db.from("blog_posts").select("*").eq("id", id).maybeSingle()
  if (error || !article) return null
  let seoItem: SeoContentRow | null = null
  if (article.seo_content_item_id) {
    const { data } = await db.from("seo_content_items").select("*").eq("id", article.seo_content_item_id).maybeSingle()
    seoItem = data ?? null
  }
  return { article, seoItem }
}

export async function loadArticleSetup(seoItemId?: string | null) {
  if (!seoItemId) return null
  const db = await createClient()
  const { data } = await db.from("seo_content_items").select("*").eq("id", seoItemId).maybeSingle()
  return data ?? null
}

