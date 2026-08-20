import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { getActivePackages, hasPaidPackage } from "@/lib/packages"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { ChoosePathCards } from "@/components/portal/choose-path-cards"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Choose how we'll work together" }

/**
 * CONCIERGE Phase 1 — the post-intake fork. Everyone completes intake the same
 * way; here they choose the EXPERIENCE (Self-Guided vs Full Concierge). Selecting
 * one records `service_mode` and hands off to checkout. Already-paid applicants
 * are sent to the surface they bought.
 */
export default async function ChoosePathPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <div className="rounded-lg border bg-card p-8 text-center">
        <h1 className="text-lg font-semibold">Almost there.</h1>
        <p className="mt-2 text-sm text-text-mid">
          Your case isn&apos;t set up yet. Your concierge will reach out shortly to get you started.
        </p>
      </div>
    )
  }

  const supabase = await createClient()

  // Already paid? Don't sell again — route to what they bought.
  const [paidConcierge, paidSelf] = await Promise.all([
    hasPaidPackage(supabase, myCase.id, "full_concierge"),
    hasPaidPackage(supabase, myCase.id, "self_guided"),
  ])
  if (paidConcierge) redirect("/portal/concierge")
  if (paidSelf) redirect("/portal")

  const packages = await getActivePackages(supabase)
  const alreadyMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>One decision</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          How would you like to work together?
        </h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Same finish line, two ways to get there. Either way, <b>you file your own NYPD application</b> —
          the law requires it. The difference is how much of everything before that we take off your plate.
        </p>
      </div>

      <ChoosePathCards packages={packages} alreadyMode={alreadyMode} />

      <p className="text-xs text-text-low">
        Service fees only — the NYPD&apos;s application fee and the fingerprint fee are paid separately at
        filing and are never collected by us. You can switch paths anytime before you pay.
        {!STRIPE_ENABLED &&
          " Card checkout is being finalized — choosing a path records it instantly and we send your invoice within one business day."}
      </p>
    </div>
  )
}
