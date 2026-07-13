import { CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { getActivePackages } from "@/lib/packages"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { EnrollButtons } from "@/components/portal/enroll-buttons"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Choose your package" }

/**
 * V3-P3.1 — self-serve enrollment. A stranger can land here from /pricing:
 * unauthenticated visitors are bounced through login/signup by the portal
 * gate, then complete the purchase without talking to anyone.
 */
export default async function EnrollPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const myCase = await getMyCase()
  const supabase = await createClient()
  const packages = await getActivePackages(supabase)

  // Already paid for a package? Show that instead of selling again.
  const { data: paid } = myCase
    ? await supabase
        .from("payments")
        .select("package_key, description, status")
        .eq("case_id", myCase.id)
        .not("package_key", "is", null)
        .in("status", ["paid"])
        .limit(1)
    : { data: [] }
  const purchased = (paid ?? [])[0]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Choose your package</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Service fees only — the NYPD&apos;s $340 application fee and the $88.25 DCJS fingerprint fee
          are paid separately at filing and are never collected by us.
        </p>
      </div>

      {sp.canceled === "1" && (
        <p className="rounded-md border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          Checkout was canceled — no charge was made. Pick up where you left off whenever you&apos;re ready.
        </p>
      )}

      {purchased && (
        <div className="rounded-lg border border-ok/30 bg-ok/8 p-4 text-sm">
          <CheckCircle2 className="mr-1 inline size-4 text-ok" /> You&apos;re enrolled:{" "}
          <b>{purchased.description}</b>. Anything else here would be an add-on — message us with questions.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((p) => (
          <Card key={p.key} className={p.featured ? "brass-edge" : ""}>
            <CardContent className="flex h-full flex-col p-5">
              {p.featured && <div className="engraved mb-1 text-brass">Most chosen</div>}
              <h3 className="font-display text-lg font-semibold">{p.name}</h3>
              <div className="mt-1 font-display text-2xl font-bold tabular-nums">{p.priceLabel}</div>
              <p className="mt-2 flex-1 text-sm text-text-mid">{p.blurb}</p>
              <EnrollButtons
                packageKey={p.key}
                priceCents={p.priceCents}
                depositCents={p.depositCents}
                stripeOn={STRIPE_ENABLED}
                featured={p.featured}
              />
            </CardContent>
          </Card>
        ))}
      </div>

      {!STRIPE_ENABLED && (
        <p className="text-xs text-text-low">
          Card checkout is being finalized — requesting a package records it instantly and we send
          your invoice within one business day.
        </p>
      )}
    </div>
  )
}
