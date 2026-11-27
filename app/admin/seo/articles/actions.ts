"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { requireAdmin } from "@/lib/auth"
import { getRepositoryPostSlugs } from "@/lib/blog"
import { generateArticleDraft } from "@/lib/blog/generator"
import {
  ARTICLE_QUALITY_MIN_SCORE,
  ARTICLE_TITLE_MAX_LENGTH,
  markdownSafetyIssues,
  parseSourceUrls,
  publicationReadiness,
  slugifyArticle,
} from "@/lib/blog/validation"
import { CANONICAL_ORIGIN } from "@/lib/seo"
import { createClient } from "@/lib/supabase/server"
import type { Database, Json } from "@/lib/supabase/types"

type BlogPost = Database["public"]["Tables"]["blog_posts"]["Row"]

const uuid = z.string().uuid()
const nullableText = (max: number) => z.preprocess(
  (value) => typeof value === "string" && value.trim() ? value.trim() : null,
  z.string().max(max).nullable()
)

const createSchema = z.object({
  seoItemId: z.preprocess((value) => typeof value === "string" && value ? value : null, uuid.nullable()),
  title: z.string().trim().min(25).max(ARTICLE_TITLE_MAX_LENGTH),
  description: z.string().trim().min(70).max(160),
  kind: z.enum(["applicant_question", "official_update", "guide", "article_refresh", "news_analysis"]),
  targetQuery: nullableText(180),
  summary: nullableText(4000),
  sourceUrls: z.string().max(5000),
  sourceNotes: nullableText(20_000),
  tag: z.string().trim().min(2).max(50),
  needsLegalReview: z.boolean(),
})

const editorSchema = z.object({
  id: uuid,
  title: z.string().trim().min(25).max(ARTICLE_TITLE_MAX_LENGTH),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  description: z.string().trim().max(180),
  tag: z.string().trim().min(2).max(50),
  targetQuery: nullableText(180),
  content: z.string().max(100_000),
  sourceUrls: z.string().max(5000),
  sourceNotes: nullableText(20_000),
  needsLegalReview: z.boolean(),
})

function value(formData: FormData, key: string) {
  return formData.get(key)
}

function articleUrl(id: string, kind: "notice" | "error", message: string) {
  return `/admin/seo/articles/${id}?${kind}=${encodeURIComponent(message)}`
}

function sourceArray(value: Json): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.startsWith("https://"))
    : []
}

function sameStrings(left: string[], right: string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort())
}

function automationSourceHashes(post: BlogPost) {
  const context = post.automation_context
  if (!context || Array.isArray(context) || typeof context !== "object") return []
  const values = context.source_hashes
  if (!Array.isArray(values)) return []
  return values.flatMap((entry) => {
    if (!entry || Array.isArray(entry) || typeof entry !== "object") return []
    const url = entry.url
    const sha256 = entry.sha256
    return typeof url === "string" && typeof sha256 === "string" ? [{ url, sha256 }] : []
  })
}

async function evidenceFreshnessProblems(post: BlogPost) {
  const expected = automationSourceHashes(post)
  if (!expected.length) return []
  const db = await createClient()
  const { data, error } = await db
    .from("editorial_sources")
    .select("url,content_hash,last_success_at")
    .in("url", expected.map((source) => source.url))
  if (error) return ["The official-source freshness check could not be completed."]
  const current = new Map((data ?? []).map((source) => [source.url, source]))
  const problems: string[] = []
  const staleBefore = Date.now() - 14 * 86_400_000
  for (const source of expected) {
    const live = current.get(source.url)
    if (!live?.content_hash || live.content_hash !== source.sha256) {
      problems.push("An official source changed after this draft was generated. Regenerate the article before review.")
      break
    }
    if (!live.last_success_at || new Date(live.last_success_at).getTime() < staleBefore) {
      problems.push("The official evidence snapshot is more than 14 days old. Run editorial automation again before review.")
      break
    }
  }
  return problems
}

function parseEditor(formData: FormData) {
  const parsed = editorSchema.safeParse({
    id: value(formData, "id"),
    title: value(formData, "title"),
    slug: value(formData, "slug"),
    description: value(formData, "description"),
    tag: value(formData, "tag"),
    targetQuery: value(formData, "targetQuery"),
    content: value(formData, "content"),
    sourceUrls: value(formData, "sourceUrls"),
    sourceNotes: value(formData, "sourceNotes"),
    needsLegalReview: value(formData, "needsLegalReview") === "on",
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the article fields." } as const
  try {
    return { data: { ...parsed.data, sourceUrls: parseSourceUrls(parsed.data.sourceUrls) } } as const
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Check the source URLs." } as const
  }
}

async function getArticle(id: string) {
  const db = await createClient()
  const { data, error } = await db.from("blog_posts").select("*").eq("id", id).single()
  if (error || !data) return null
  return data
}

async function availableSlug(requested: string, articleId?: string) {
  const base = slugifyArticle(requested) || "nyc-license-guide"
  const reserved = new Set(getRepositoryPostSlugs())
  const db = await createClient()
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`
    if (reserved.has(slug)) continue
    let query = db.from("blog_posts").select("id").eq("slug", slug)
    if (articleId) query = query.neq("id", articleId)
    const { data, error } = await query.maybeSingle()
    if (error) throw new Error("The article URL could not be checked.")
    if (!data) return slug
  }
  throw new Error("Choose a more distinct article URL.")
}

async function syncSeoItem(post: BlogPost, status: "drafting" | "review" | "approved" | "published") {
  if (!post.seo_content_item_id) return
  const db = await createClient()
  const update: Database["public"]["Tables"]["seo_content_items"]["Update"] = {
    title: post.title,
    slug: post.slug,
    target_query: post.target_query,
    source_urls: post.source_urls,
    status,
    needs_legal_review: post.needs_legal_review,
    updated_by: post.updated_by,
    published_url: status === "published" ? `${CANONICAL_ORIGIN}/blog/${post.slug}` : null,
  }
  update.legal_reviewed_at = post.legal_reviewed_at
  update.legal_reviewed_by = post.legal_reviewed_by
  await db.from("seo_content_items").update(update).eq("id", post.seo_content_item_id)
}

function seoStatusForArticle(status: string): "drafting" | "review" | "approved" | "published" {
  if (status === "published") return "published"
  if (status === "approved") return "approved"
  if (status === "review") return "review"
  return "drafting"
}

function revalidateArticle(slug?: string) {
  revalidatePath("/admin/seo")
  revalidatePath("/blog")
  if (slug) revalidatePath(`/blog/${slug}`)
  revalidatePath("/feed.xml")
  revalidatePath("/sitemap.xml")
  revalidatePath("/llms.txt")
}

export async function createArticle(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = createSchema.safeParse({
    seoItemId: value(formData, "seoItemId"),
    title: value(formData, "title"),
    description: value(formData, "description"),
    kind: value(formData, "kind"),
    targetQuery: value(formData, "targetQuery"),
    summary: value(formData, "summary"),
    sourceUrls: value(formData, "sourceUrls") || "",
    sourceNotes: value(formData, "sourceNotes"),
    tag: value(formData, "tag"),
    needsLegalReview: value(formData, "needsLegalReview") === "on",
  })
  if (!parsed.success) redirect(`/admin/seo/new?error=${encodeURIComponent(parsed.error.issues[0]?.message || "Check the article setup.")}`)

  let sources: string[]
  try {
    sources = parseSourceUrls(parsed.data.sourceUrls)
  } catch (error) {
    redirect(`/admin/seo/new?error=${encodeURIComponent(error instanceof Error ? error.message : "Check the source URLs.")}`)
  }
  if (!sources.length) {
    redirect(`/admin/seo/new?error=${encodeURIComponent("Add at least one primary official source before generating the article.")}`)
  }
  if ((parsed.data.sourceNotes?.length ?? 0) < 80) {
    redirect(`/admin/seo/new?error=${encodeURIComponent("Add source notes explaining what the official sources establish.")}`)
  }

  const db = await createClient()
  let seoItemId = parsed.data.seoItemId
  if (seoItemId) {
    const { data: linked } = await db.from("blog_posts").select("id").eq("seo_content_item_id", seoItemId).maybeSingle()
    if (linked) redirect(articleUrl(linked.id, "notice", "This queue item already has an article draft."))
  }

  let slug: string
  try {
    slug = await availableSlug(parsed.data.title)
  } catch (error) {
    redirect(`/admin/seo/new?error=${encodeURIComponent(error instanceof Error ? error.message : "The article URL could not be created.")}`)
  }

  let generated: Awaited<ReturnType<typeof generateArticleDraft>>
  try {
    generated = await generateArticleDraft({
      title: parsed.data.title,
      kind: parsed.data.kind,
      targetQuery: parsed.data.targetQuery,
      brief: parsed.data.summary,
      sourceUrls: sources,
      sourceNotes: parsed.data.sourceNotes,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "The complete article draft could not be generated."
    redirect(`/admin/seo/new?error=${encodeURIComponent(message)}`)
  }

  if (!seoItemId) {
    const { data: item, error } = await db.from("seo_content_items").insert({
      title: parsed.data.title,
      slug,
      kind: parsed.data.kind,
      target_query: parsed.data.targetQuery,
      summary: parsed.data.summary,
      source_urls: sources,
      status: "drafting",
      priority: 2,
      needs_legal_review: parsed.data.needsLegalReview,
      created_by: auth.userId,
      updated_by: auth.userId,
    }).select("id").single()
    if (error || !item) redirect(`/admin/seo/new?error=${encodeURIComponent("The editorial record could not be created.")}`)
    seoItemId = item.id
  }
  const { data: article, error } = await db.from("blog_posts").insert({
    seo_content_item_id: seoItemId,
    title: parsed.data.title,
    slug,
    description: parsed.data.description,
    tag: parsed.data.tag,
    target_query: parsed.data.targetQuery,
    content_markdown: generated.content,
    source_urls: sources,
    source_notes: parsed.data.sourceNotes,
    automation_assisted: true,
    needs_legal_review: parsed.data.needsLegalReview,
    created_by: auth.userId,
    updated_by: auth.userId,
  }).select("id").single()
  if (error || !article) redirect(`/admin/seo/new?error=${encodeURIComponent("The article draft could not be created.")}`)

  await logActivity({ action: "blog.article_created", entity: "blog_post", entityId: article.id, detail: { title: parsed.data.title, ai: generated.usedAi } })
  revalidateArticle()
  redirect(articleUrl(article.id, "notice", generated.usedAi ? "Complete AI-assisted draft created. Review every claim before publishing." : "Guided draft created. Fill in the verified facts and sources."))
}

export async function saveArticle(formData: FormData) {
  const auth = await requireAdmin()
  const result = parseEditor(formData)
  if ("error" in result) redirect(articleUrl(String(value(formData, "id")), "error", result.error ?? "Check the article fields."))
  const current = await getArticle(result.data.id)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  if (current.status === "published") redirect(articleUrl(current.id, "error", "Unpublish the article before editing it."))
  const safeIssues = markdownSafetyIssues(result.data.content)
  if (safeIssues.length) redirect(articleUrl(current.id, "error", safeIssues[0]))

  let slug = result.data.slug
  if (slug !== current.slug) {
    try { slug = await availableSlug(slug, current.id) }
    catch (error) { redirect(articleUrl(current.id, "error", error instanceof Error ? error.message : "The URL is unavailable.")) }
  }
  const changed = current.title !== result.data.title
    || current.slug !== slug
    || current.description !== result.data.description
    || current.tag !== result.data.tag
    || current.target_query !== result.data.targetQuery
    || current.content_markdown !== result.data.content
    || current.source_notes !== result.data.sourceNotes
    || current.needs_legal_review !== result.data.needsLegalReview
    || !sameStrings(sourceArray(current.source_urls), result.data.sourceUrls)

  const update: Database["public"]["Tables"]["blog_posts"]["Update"] = {
    title: result.data.title,
    slug,
    description: result.data.description,
    tag: result.data.tag,
    target_query: result.data.targetQuery,
    content_markdown: result.data.content,
    source_urls: result.data.sourceUrls,
    source_notes: result.data.sourceNotes,
    needs_legal_review: result.data.needsLegalReview,
    updated_by: auth.userId,
  }
  if (changed) Object.assign(update, {
    status: "draft",
    fact_checked_at: null,
    fact_checked_by: null,
    legal_reviewed_at: null,
    legal_reviewed_by: null,
  })
  const db = await createClient()
  const { data: saved, error } = await db.from("blog_posts").update(update).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The draft could not be saved."))
  await syncSeoItem(saved, seoStatusForArticle(saved.status))
  await logActivity({ action: "blog.article_saved", entity: "blog_post", entityId: current.id, detail: { changed, slug } })
  revalidateArticle(current.slug)
  if (slug !== current.slug) revalidateArticle(slug)
  redirect(articleUrl(current.id, "notice", changed ? "Draft saved. Reviews were reset because the article changed." : "Draft is already up to date."))
}

export async function generateArticle(formData: FormData) {
  const auth = await requireAdmin()
  const result = parseEditor(formData)
  if ("error" in result) redirect(articleUrl(String(value(formData, "id")), "error", result.error ?? "Check the article fields."))
  const current = await getArticle(result.data.id)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  if (current.status === "published") redirect(articleUrl(current.id, "error", "Unpublish the article before replacing its draft."))

  const db = await createClient()
  let kind = "guide"
  let brief: string | null = null
  if (current.seo_content_item_id) {
    const { data: item } = await db.from("seo_content_items").select("kind,summary").eq("id", current.seo_content_item_id).maybeSingle()
    kind = item?.kind || kind
    brief = item?.summary || null
  }
  let generated: Awaited<ReturnType<typeof generateArticleDraft>>
  try {
    generated = await generateArticleDraft({
      title: result.data.title,
      kind,
      targetQuery: result.data.targetQuery,
      brief,
      sourceUrls: result.data.sourceUrls,
      sourceNotes: result.data.sourceNotes,
    })
  } catch (error) {
    redirect(articleUrl(current.id, "error", error instanceof Error ? error.message : "The draft could not be generated."))
  }
  let slug = result.data.slug
  if (slug !== current.slug) {
    try { slug = await availableSlug(slug, current.id) }
    catch (error) { redirect(articleUrl(current.id, "error", error instanceof Error ? error.message : "The URL is unavailable.")) }
  }
  const { data: saved, error } = await db.from("blog_posts").update({
    title: result.data.title,
    slug,
    description: result.data.description,
    tag: result.data.tag,
    target_query: result.data.targetQuery,
    content_markdown: generated.content,
    source_urls: result.data.sourceUrls,
    source_notes: result.data.sourceNotes,
    automation_assisted: true,
    needs_legal_review: result.data.needsLegalReview,
    status: "draft",
    fact_checked_at: null,
    fact_checked_by: null,
    legal_reviewed_at: null,
    legal_reviewed_by: null,
    updated_by: auth.userId,
  }).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The generated draft could not be saved."))
  await syncSeoItem(saved, "drafting")
  await logActivity({ action: "blog.article_generated", entity: "blog_post", entityId: current.id, detail: { ai: generated.usedAi } })
  revalidateArticle(current.slug)
  redirect(articleUrl(current.id, "notice", generated.usedAi ? "A new AI-assisted draft was generated. Verify every claim." : "A fresh guided outline was generated."))
}

function reviewProblems(post: BlogPost) {
  const readiness = publicationReadiness({
    title: post.title,
    slug: post.slug,
    description: post.description,
    content: post.content_markdown,
    sourceUrls: sourceArray(post.source_urls),
    sourceNotes: post.source_notes,
    factCheckedAt: "draft-check-only",
    needsLegalReview: false,
  })
  const failedBlocking = readiness.checks.find((check) => check.blocking && !check.passed)
  if (failedBlocking) return [failedBlocking.label]
  if (readiness.score < ARTICLE_QUALITY_MIN_SCORE) {
    return [`Raise the automated article quality score to at least ${ARTICLE_QUALITY_MIN_SCORE}.`]
  }
  return []
}

export async function submitArticleForReview(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = uuid.safeParse(value(formData, "id"))
  if (!parsed.success) redirect("/admin/seo?error=Invalid%20article")
  const current = await getArticle(parsed.data)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  const problems = [...reviewProblems(current), ...await evidenceFreshnessProblems(current)]
  if (problems.length) redirect(articleUrl(current.id, "error", problems[0]))
  const db = await createClient()
  const { data: saved, error } = await db.from("blog_posts").update({ status: "review", updated_by: auth.userId }).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The article could not be submitted for review."))
  await syncSeoItem(saved, "review")
  await logActivity({ action: "blog.review_requested", entity: "blog_post", entityId: current.id })
  revalidatePath(`/admin/seo/articles/${current.id}`)
  redirect(articleUrl(current.id, "notice", "Article submitted for human review."))
}

async function recordReview(id: string, kind: "fact" | "legal", userId: string, certifications: string[]) {
  const current = await getArticle(id)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  if (current.status === "draft") redirect(articleUrl(current.id, "error", "Submit the saved draft for review first."))
  if (kind === "legal" && !current.needs_legal_review) redirect(articleUrl(current.id, "error", "This article is not marked for legal-boundary review."))
  const problems = [...reviewProblems(current), ...await evidenceFreshnessProblems(current)]
  if (problems.length) redirect(articleUrl(current.id, "error", problems[0]))
  const now = new Date().toISOString()
  const update = kind === "fact"
    ? { fact_checked_at: now, fact_checked_by: userId }
    : { legal_reviewed_at: now, legal_reviewed_by: userId }
  const willBeApproved = kind === "fact"
    ? (!current.needs_legal_review || Boolean(current.legal_reviewed_at))
    : Boolean(current.fact_checked_at)
  const db = await createClient()
  const { data: saved, error } = await db.from("blog_posts").update({ ...update, status: willBeApproved ? "approved" : "review", updated_by: userId }).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The review could not be recorded."))
  await syncSeoItem(saved, willBeApproved ? "approved" : "review")
  await logActivity({ action: `blog.${kind}_review_recorded`, entity: "blog_post", entityId: current.id, detail: { reviewed_at: now, certifications } })
  revalidatePath(`/admin/seo/articles/${current.id}`)
  redirect(articleUrl(current.id, "notice", kind === "fact" ? "Human fact-check recorded." : "Legal-boundary review recorded."))
}

export async function recordArticleFactCheck(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = uuid.safeParse(value(formData, "id"))
  if (!parsed.success) redirect("/admin/seo?error=Invalid%20article")
  const certifications = z.object({
    factSources: z.literal("on"),
    factLinks: z.literal("on"),
    factClaims: z.literal("on"),
  }).safeParse({
    factSources: value(formData, "factSources"),
    factLinks: value(formData, "factLinks"),
    factClaims: value(formData, "factClaims"),
  })
  if (!certifications.success) redirect(articleUrl(parsed.data, "error", "Complete all three fact-check confirmations."))
  return recordReview(parsed.data, "fact", auth.userId, ["sources_compared", "links_opened", "claims_supported"])
}

export async function recordArticleLegalReview(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = uuid.safeParse(value(formData, "id"))
  if (!parsed.success) redirect("/admin/seo?error=Invalid%20article")
  const certifications = z.object({
    legalAdvice: z.literal("on"),
    legalPromises: z.literal("on"),
    legalCandor: z.literal("on"),
  }).safeParse({
    legalAdvice: value(formData, "legalAdvice"),
    legalPromises: value(formData, "legalPromises"),
    legalCandor: value(formData, "legalCandor"),
  })
  if (!certifications.success) redirect(articleUrl(parsed.data, "error", "Complete all three legal-boundary confirmations."))
  return recordReview(parsed.data, "legal", auth.userId, ["no_legal_advice", "no_promises_or_representation", "candor_preserved"])
}

export async function publishArticle(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = uuid.safeParse(value(formData, "id"))
  if (!parsed.success) redirect("/admin/seo?error=Invalid%20article")
  const current = await getArticle(parsed.data)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  const freshnessProblems = await evidenceFreshnessProblems(current)
  if (freshnessProblems.length) redirect(articleUrl(current.id, "error", freshnessProblems[0]))
  const readiness = publicationReadiness({
    title: current.title,
    slug: current.slug,
    description: current.description,
    content: current.content_markdown,
    sourceUrls: sourceArray(current.source_urls),
    sourceNotes: current.source_notes,
    factCheckedAt: current.fact_checked_at,
    needsLegalReview: current.needs_legal_review,
    legalReviewedAt: current.legal_reviewed_at,
  })
  if (!readiness.ready) {
    const first = readiness.checks.find((check) => !check.passed)?.label || "Resolve every draft placeholder before publishing."
    redirect(articleUrl(current.id, "error", `Not ready: ${first}`))
  }
  const db = await createClient()
  const now = new Date().toISOString()
  const { data: saved, error } = await db.from("blog_posts").update({ status: "published", published_at: now, updated_by: auth.userId }).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The article could not be published."))
  await syncSeoItem(saved, "published")
  await logActivity({ action: "blog.article_published", entity: "blog_post", entityId: current.id, detail: { slug: current.slug } })
  revalidateArticle(current.slug)
  redirect(articleUrl(current.id, "notice", "Article published and added to the blog, sitemap, RSS feed and llms.txt."))
}

export async function unpublishArticle(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = uuid.safeParse(value(formData, "id"))
  if (!parsed.success) redirect("/admin/seo?error=Invalid%20article")
  const current = await getArticle(parsed.data)
  if (!current) redirect("/admin/seo?error=Article%20not%20found")
  const db = await createClient()
  const { data: saved, error } = await db.from("blog_posts").update({ status: "draft", published_at: null, updated_by: auth.userId }).eq("id", current.id).select("*").single()
  if (error || !saved) redirect(articleUrl(current.id, "error", "The article could not be removed from the public blog."))
  await syncSeoItem(saved, "drafting")
  await logActivity({ action: "blog.article_unpublished", entity: "blog_post", entityId: current.id, detail: { slug: current.slug } })
  revalidateArticle(current.slug)
  redirect(articleUrl(current.id, "notice", "Article unpublished. Its draft and review history were preserved."))
}

