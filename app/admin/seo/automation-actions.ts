"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"
import { logActivity } from "@/lib/activity"
import { requireAdmin } from "@/lib/auth"
import { runEditorialAutomation } from "@/lib/blog/automation"
import { createClient } from "@/lib/supabase/server"

const sourceToggleSchema = z.object({
  id: z.string().uuid(),
  active: z.enum(["true", "false"]).transform((value) => value === "true"),
})

export async function runEditorialAutomationNow() {
  const auth = await requireAdmin()
  const result = await runEditorialAutomation({ trigger: "manual", actorId: auth.userId })

  await logActivity({
    action: "seo.automation_run",
    entity: "editorial_run",
    entityId: result.runId ?? null,
    detail: { status: result.status, article_id: result.articleId ?? null },
  })
  revalidatePath("/admin/seo")

  if (result.articleId) {
    redirect(`/admin/seo/articles/${result.articleId}?notice=${encodeURIComponent(result.message)}`)
  }
  const kind = result.status === "failed" ? "error" : "notice"
  redirect(`/admin/seo?${kind}=${encodeURIComponent(result.message)}`)
}

export async function toggleEditorialSource(formData: FormData) {
  const auth = await requireAdmin()
  const parsed = sourceToggleSchema.safeParse({
    id: formData.get("id"),
    active: formData.get("active"),
  })
  if (!parsed.success) redirect("/admin/seo/automation?error=That%20source%20could%20not%20be%20updated.")

  const db = await createClient()
  const { data, error } = await db.from("editorial_sources").update({
    active: parsed.data.active,
    updated_by: auth.userId,
  }).eq("id", parsed.data.id).select("name").single()
  if (error || !data) redirect("/admin/seo/automation?error=That%20source%20could%20not%20be%20updated.")

  await logActivity({
    action: "seo.editorial_source_toggled",
    entity: "editorial_source",
    entityId: parsed.data.id,
    detail: { active: parsed.data.active },
  })
  revalidatePath("/admin/seo")
  revalidatePath("/admin/seo/automation")
  redirect(`/admin/seo/automation?notice=${encodeURIComponent(`${data.name} ${parsed.data.active ? "enabled" : "paused"}.`)}`)
}
