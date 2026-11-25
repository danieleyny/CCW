import { notFound } from "next/navigation"
import { ArticleStudio } from "@/components/admin/article-studio"
import { loadArticle } from "@/lib/admin/articles"
import { BLOG_AI_ENABLED } from "@/lib/blog/generator"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: { absolute: "Article studio · Staff" } }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function ArticleStudioPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: SearchParams }) {
  await requireAdmin()
  const [{ id }, query] = await Promise.all([params, searchParams])
  const data = await loadArticle(id)
  if (!data) notFound()
  return <ArticleStudio article={data.article} seoItem={data.seoItem} notice={first(query.notice)} error={first(query.error)} aiEnabled={BLOG_AI_ENABLED} />
}

