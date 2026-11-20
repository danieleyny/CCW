import { TrackView } from "@/components/analytics/track-view"
import { AdminTrainingWorkspace } from "@/components/admin/training-workspace"
import { loadAdminTraining } from "@/lib/admin/training"
import { requireAdmin } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { trainingStripeEnabled, trainingStripeMode } from "@/lib/training/server"

export const metadata = { title: { absolute: "Training · Staff" } }

export default async function AdminTrainingPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>
}) {
  await requireAdmin()
  const query = await searchParams
  const db = await createClient()
  const data = await loadAdminTraining(db, {
    selectedId: query.class,
    stripeMode: trainingStripeMode(),
    refundsEnabled: trainingStripeEnabled(),
  })

  return (
    <>
      <TrackView event="admin_training_viewed" params={{ selected: data.selectedId ? "class" : "empty" }} />
      <AdminTrainingWorkspace data={data} />
    </>
  )
}
