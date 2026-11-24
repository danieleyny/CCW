import { SeoWorkspace } from "@/components/admin/seo-workspace"
import { SEO_STATUSES, loadSeoDesk, type SeoStatus } from "@/lib/admin/seo"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: { absolute: "SEO desk · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminSeoPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const params = await searchParams
  const requestedView = first(params.view)
  const view = SEO_STATUSES.includes(requestedView as SeoStatus) ? requestedView as SeoStatus : "active"
  const data = await loadSeoDesk()

  return (
    <SeoWorkspace
      data={data}
      view={view}
      notice={first(params.notice)}
      error={first(params.error)}
    />
  )
}
