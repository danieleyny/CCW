"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { SEO_KINDS, SEO_STATUSES } from "@/lib/admin/seo"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().max(max).nullable()
  )

const optionalHttpsUrl = z.preprocess(
  (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
  z.string().url().refine((url) => url.startsWith("https://"), "Use a secure https:// source URL.").nullable()
)

const createSchema = z.object({
  title: z.string().trim().min(5, "Enter a specific article title.").max(180),
  kind: z.enum(SEO_KINDS),
  targetQuery: optionalText(180),
  summary: optionalText(1200),
  sourceUrl: optionalHttpsUrl,
  priority: z.coerce.number().int().min(1).max(4),
  dueOn: z.preprocess(
    (value) => (typeof value === "string" && value.trim() ? value.trim() : null),
    z.string().date().nullable()
  ),
  needsLegalReview: z.boolean(),
})

const statusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(SEO_STATUSES),
  publishedUrl: optionalHttpsUrl,
})

const reviewSchema = z.object({ id: z.string().uuid() })

function formValue(formData: FormData, name: string) {
  return formData.get(name)
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120)
}

function messageUrl(kind: "notice" | "error", message: string) {
  return `/admin/seo?${kind}=${encodeURIComponent(message)}`
}

async function availableSlug(title: string) {
  const db = await createClient()
  const base = slugify(title) || "editorial-idea"
  for (let suffix = 1; suffix <= 50; suffix += 1) {
    const slug = suffix === 1 ? base : `${base}-${suffix}`
    const { data, error } = await db.from("seo_content_items").select("id").eq("slug", slug).maybeSingle()
    if (error) throw new Error("The article URL could not be checked.")
    if (!data) return slug
  }
  throw new Error("Choose a more distinct title.")
}

export async function createSeoItem(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = createSchema.safeParse({
    title: formValue(formData, "title"),
    kind: formValue(formData, "kind"),
    targetQuery: formValue(formData, "targetQuery"),
    summary: formValue(formData, "summary"),
    sourceUrl: formValue(formData, "sourceUrl"),
    priority: formValue(formData, "priority"),
    dueOn: formValue(formData, "dueOn"),
    needsLegalReview: formValue(formData, "needsLegalReview") === "on",
  })
  if (!parsed.success) redirect(messageUrl("error", parsed.error.issues[0]?.message ?? "Check the article idea."))

  let slug: string
  try {
    slug = await availableSlug(parsed.data.title)
  } catch (error) {
    redirect(messageUrl("error", error instanceof Error ? error.message : "The idea could not be created."))
  }

  const db = await createClient()
  const { data, error } = await db
    .from("seo_content_items")
    .insert({
      title: parsed.data.title,
      slug,
      kind: parsed.data.kind,
      target_query: parsed.data.targetQuery,
      summary: parsed.data.summary,
      source_urls: parsed.data.sourceUrl ? [parsed.data.sourceUrl] : [],
      priority: parsed.data.priority,
      due_on: parsed.data.dueOn,
      needs_legal_review: parsed.data.needsLegalReview,
      created_by: auth.userId,
      updated_by: auth.userId,
    })
    .select("id")
    .single()

  if (error || !data) redirect(messageUrl("error", "The idea could not be saved."))

  await logActivity({
    action: "seo.item_created",
    entity: "seo_content_item",
    entityId: data.id,
    detail: { title: parsed.data.title, kind: parsed.data.kind, priority: parsed.data.priority },
  })
  revalidatePath("/admin/seo")
  redirect(messageUrl("notice", "Article idea added to the queue."))
}

export async function updateSeoItemStatus(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = statusSchema.safeParse({
    id: formValue(formData, "id"),
    status: formValue(formData, "status"),
    publishedUrl: formValue(formData, "publishedUrl"),
  })
  if (!parsed.success) redirect(messageUrl("error", parsed.error.issues[0]?.message ?? "Check the status."))

  const db = await createClient()
  const { data: current, error: currentError } = await db
    .from("seo_content_items")
    .select("id, title, status, needs_legal_review, legal_reviewed_at")
    .eq("id", parsed.data.id)
    .single()
  if (currentError || !current) redirect(messageUrl("error", "That queue item no longer exists."))
  if (parsed.data.status === "published" && !parsed.data.publishedUrl) {
    redirect(messageUrl("error", "Add the live article URL before marking it published."))
  }
  if (parsed.data.status === "published" && current.needs_legal_review && !current.legal_reviewed_at) {
    redirect(messageUrl("error", "Record the required legal-boundary review before marking it published."))
  }

  const { error } = await db
    .from("seo_content_items")
    .update({
      status: parsed.data.status,
      published_url: parsed.data.publishedUrl,
      updated_by: auth.userId,
    })
    .eq("id", parsed.data.id)
  if (error) redirect(messageUrl("error", "The status could not be updated."))

  await logActivity({
    action: "seo.status_changed",
    entity: "seo_content_item",
    entityId: parsed.data.id,
    detail: { from: current.status, to: parsed.data.status },
  })
  revalidatePath("/admin/seo")
  redirect(messageUrl("notice", `“${current.title}” is now ${parsed.data.status.replaceAll("_", " ")}.`))
}

export async function recordSeoLegalReview(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = reviewSchema.safeParse({ id: formValue(formData, "id") })
  if (!parsed.success) redirect(messageUrl("error", "That queue item is invalid."))

  const db = await createClient()
  const reviewedAt = new Date().toISOString()
  const { error } = await db
    .from("seo_content_items")
    .update({ legal_reviewed_at: reviewedAt, legal_reviewed_by: auth.userId, updated_by: auth.userId })
    .eq("id", parsed.data.id)
    .eq("needs_legal_review", true)
  if (error) redirect(messageUrl("error", "The legal-boundary review could not be recorded."))

  await logActivity({
    action: "seo.legal_review_recorded",
    entity: "seo_content_item",
    entityId: parsed.data.id,
    detail: { reviewed_at: reviewedAt },
  })
  revalidatePath("/admin/seo")
  redirect(messageUrl("notice", "Legal-boundary review recorded."))
}
