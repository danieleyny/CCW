/**
 * Audit article section structure without changing content by default.
 *
 * Read-only:
 *   ENV_FILE=.env.local pnpm exec tsx scripts/audit-article-headings.ts
 *
 * Owner-approved cleanup only:
 *   CONFIRM=NORMALIZE_ARTICLES ENV_FILE=.env.local pnpm exec tsx scripts/audit-article-headings.ts --apply
 */
import fs from "node:fs"
import path from "node:path"
import matter from "gray-matter"
import { createClient } from "@supabase/supabase-js"
import { boldHeadingLines, normalizeArticleMarkdown } from "@/lib/blog/normalize"
import { parseArticle } from "@/lib/blog/structure"
import type { Database } from "@/lib/supabase/types"

async function main() {
const apply = process.argv.includes("--apply")
if (apply && process.env.CONFIRM !== "NORMALIZE_ARTICLES") {
  throw new Error("Refusing to change articles without CONFIRM=NORMALIZE_ARTICLES.")
}

const envFile = process.env.ENV_FILE ?? ".env.local"
const env = fs.existsSync(envFile)
  ? Object.fromEntries(fs.readFileSync(envFile, "utf8").split("\n").filter((line) => line.includes("=")).map((line) => {
      const index = line.indexOf("=")
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")]
    }))
  : process.env
const db = createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

type BackupEntry = { source: "database" | "repository"; id?: string; slug: string; title: string; content: string }
const backups: BackupEntry[] = []
const report: Array<{ source: string; slug: string; boldHeadings: number; hasShortAnswer: boolean }> = []
const databaseUpdates: Array<{ id: string; slug: string; content: string; boldHeadings: number }> = []
const repositoryUpdates: Array<{ file: string; content: string; data: Record<string, unknown> }> = []

const { data: posts, error } = await db.from("blog_posts").select("id,slug,title,content_markdown,status").in("status", ["published", "approved"])
if (error) throw error
for (const post of posts ?? []) {
  const boldHeadings = boldHeadingLines(post.content_markdown).length
  const normalized = normalizeArticleMarkdown(post.content_markdown, { title: post.title })
  report.push({ source: "database", slug: post.slug, boldHeadings, hasShortAnswer: Boolean(parseArticle(normalized).shortAnswer) })
  if (apply && normalized !== post.content_markdown) {
    backups.push({ source: "database", id: post.id, slug: post.slug, title: post.title, content: post.content_markdown })
    databaseUpdates.push({ id: post.id, slug: post.slug, content: normalized, boldHeadings })
  }
}

const directory = path.join(process.cwd(), "content", "blog")
for (const filename of fs.existsSync(directory) ? fs.readdirSync(directory).filter((file) => file.endsWith(".mdx")) : []) {
  const file = path.join(directory, filename)
  const raw = fs.readFileSync(file, "utf8")
  const parsed = matter(raw)
  const title = String(parsed.data.title ?? "")
  const slug = filename.replace(/\.mdx$/, "")
  const boldHeadings = boldHeadingLines(parsed.content).length
  const normalized = normalizeArticleMarkdown(parsed.content, { title })
  report.push({ source: "repository", slug, boldHeadings, hasShortAnswer: Boolean(parseArticle(normalized).shortAnswer) })
  if (apply && normalized !== parsed.content.trim()) {
    backups.push({ source: "repository", slug, title, content: raw })
    repositoryUpdates.push({ file, content: normalized, data: parsed.data })
  }
}

console.table(report)
if (apply && backups.length) {
  const output = path.join(process.cwd(), "scripts", "out")
  fs.mkdirSync(output, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = path.join(output, `article-backup-${stamp}.json`)
  fs.writeFileSync(backupFile, JSON.stringify(backups, null, 2), "utf8")
  for (const update of databaseUpdates) {
    const { error: updateError } = await db.from("blog_posts").update({ content_markdown: update.content }).eq("id", update.id)
    if (updateError) throw updateError
    const { error: logError } = await db.from("activity_log").insert({ action: "blog.normalize_headings", entity: "blog_post", entity_id: update.id, detail: { slug: update.slug, converted_headings: update.boldHeadings } })
    if (logError) throw logError
  }
  for (const update of repositoryUpdates) {
    fs.writeFileSync(update.file, matter.stringify(update.content, update.data), "utf8")
  }
  console.log(`Normalized ${backups.length} article(s). Backup: ${backupFile}`)
} else if (!apply) {
  console.log("Read-only audit complete. No article content was changed.")
}
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
