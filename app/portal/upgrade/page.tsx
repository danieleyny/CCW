import { notFound, redirect } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { getPackageForBrand } from "@/lib/packages"
import { BRANDS } from "@/config/brands"
import { BRAND_UPGRADE_CONSENT } from "@/lib/brand/upgrade"
import { calculateUpgradeQuote } from "@/lib/brand/upgrade"
import { UpgradeCheckoutForm } from "@/components/portal/upgrade-checkout-form"

export const metadata = { title: "Upgrade to Full Concierge" }

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>
}) {
  const [myCase, sp] = await Promise.all([getMyCase(), searchParams])
  if (!myCase || myCase.brand !== "fl") notFound()
  const supabase = await createClient()
  const [{ data: paidRows }, concierge] = await Promise.all([
    supabase
      .from("payments")
      .select("amount_cents")
      .eq("case_id", myCase.id)
      .eq("brand", "fl")
      .eq("package_key", "self_guided")
      .eq("status", "paid")
      .order("paid_at", { ascending: false })
      .limit(1),
    getPackageForBrand(supabase, "full_concierge", "gln"),
  ])
  if (!paidRows?.[0]) redirect("/portal/enroll?package=self_guided")
  if (!concierge) notFound()
  const { creditCents: credit, dueCents: due } = calculateUpgradeQuote(
    paidRows[0].amount_cents,
    concierge.priceCents,
    BRANDS.fl.upgradeCreditMode,
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="engraved text-brass">Move to Full Concierge</p>
        <h1 className="mt-2 font-display text-3xl font-semibold">Rather have it done with you?</h1>
        <p className="mt-3 text-text-mid">
          Gun License NYC&apos;s team prepares and organizes your application materials with you and provides unlimited support. You still review and submit your own application on the NYPD portal.
        </p>
      </div>
      {sp.canceled === "1" ? (
        <p className="rounded-lg border border-warn/30 bg-warn/10 p-3 text-sm text-warn">Checkout was canceled. Your Firearm License NYC case has not moved and no transfer occurred.</p>
      ) : null}
      <div className="rounded-xl border border-hairline bg-card p-5 shadow-sm">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span>Full Concierge</span><b>${(concierge.priceCents / 100).toLocaleString("en-US")}</b></div>
          <div className="flex justify-between text-ok"><span>Your Self-Guided payment credit</span><b>−${(credit / 100).toLocaleString("en-US")}</b></div>
          <div className="flex justify-between border-t border-hairline pt-3 text-lg"><span>You pay today</span><b>${(due / 100).toLocaleString("en-US")}</b></div>
        </div>
      </div>
      <ul className="space-y-2 text-sm text-text-mid">
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> Case, documents and messages continue with the same account.</li>
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> Your original payment remains credited; it is not refunded or changed.</li>
        <li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" /> Nothing transfers unless Stripe confirms the new payment.</li>
      </ul>
      <UpgradeCheckoutForm consentText={BRAND_UPGRADE_CONSENT} />
    </div>
  )
}
