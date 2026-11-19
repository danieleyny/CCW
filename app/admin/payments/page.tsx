import { TrackView } from "@/components/analytics/track-view"
import { PaymentsWorkspace } from "@/components/admin/payments-workspace"
import { requireStaff } from "@/lib/auth"
import { loadAdminPayments } from "@/lib/admin/payments"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: { absolute: "Payments · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export default async function AdminPayments({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { profile } = await requireStaff()
  const params = await searchParams
  const filter = first(params.filter)
  const q = first(params.q)?.trim() ?? ""
  const page = Math.max(1, Number.parseInt(first(params.page) ?? "1", 10) || 1)
  const showTests = first(params.test) === "1"
  const clientId = first(params.client) ?? null
  const isAdmin = profile.role === "admin"
  const db = await createClient()
  const data = await loadAdminPayments(db, { isAdmin, filter, q, showTests, clientId, page })

  return <>
    <TrackView event="admin_payments_viewed" params={{ filter: data.filter }} />
    <PaymentsWorkspace
      key={`${data.filter}:${data.q}:${data.page}:${data.showTests}`}
      data={data}
      stripeEnabled={process.env.STRIPE_ENABLED === "true" && !!process.env.STRIPE_SECRET_KEY}
    />
  </>
}
