import { CreditCard, ShieldCheck, CircleSlash } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { Card, CardContent } from "@/components/ui/card"
import { PayoutButton } from "@/components/instructor/payout-button"

export const metadata = { title: "Payouts" }

export default async function PayoutsPage() {
  const supabase = await createClient()
  const { data: me } = await supabase
    .from("instructors")
    .select("id, payouts_enabled, stripe_connect_account_id")
    .limit(1)
    .maybeSingle()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payouts</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Get paid for bookings via Stripe Connect. The platform takes a small
          fee per session; the rest is deposited to your account.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          {!STRIPE_ENABLED ? (
            <div className="flex items-center gap-3 text-sm text-text-mid">
              <CircleSlash className="size-5 text-text-low" />
              <div>
                <div className="font-medium text-foreground">Payouts aren&apos;t enabled yet</div>
                Online payments are turned off on this deployment. When they&apos;re
                enabled, you&apos;ll onboard a Stripe payout account here.
              </div>
            </div>
          ) : me?.payouts_enabled ? (
            <div className="flex items-center gap-3 text-sm">
              <ShieldCheck className="size-5 text-ok" />
              <div>
                <div className="font-medium">Payouts active</div>
                <span className="text-text-mid">Your Stripe account is connected and ready.</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <CreditCard className="size-5 text-signal" />
                <div>
                  <div className="font-medium">
                    {me?.stripe_connect_account_id ? "Finish setting up payouts" : "Set up payouts"}
                  </div>
                  <span className="text-text-mid">Onboard your Stripe Express account to receive payments.</span>
                </div>
              </div>
              <PayoutButton label={me?.stripe_connect_account_id ? "Resume onboarding" : "Set up payouts"} />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
