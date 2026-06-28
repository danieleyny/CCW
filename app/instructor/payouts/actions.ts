"use server"

import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { createConnectAccount, createAccountLink } from "@/lib/stripe/connect"

/** Begin (or resume) Stripe Connect Express onboarding for the instructor. */
export async function startPayoutOnboarding(): Promise<{ error?: string }> {
  await requireRole(["instructor"])
  if (!STRIPE_ENABLED) return { error: "Payouts aren't enabled on this deployment yet." }

  const supabase = await createClient()
  const { data: me } = await supabase
    .from("instructors")
    .select("id, email, stripe_connect_account_id")
    .limit(1)
    .maybeSingle()
  if (!me) return { error: "Instructor profile not found." }

  let accountId = me.stripe_connect_account_id
  if (!accountId) {
    const res = await createConnectAccount(me.email)
    if ("skipped" in res) return { error: "Payouts aren't enabled yet." }
    accountId = res.accountId
    await supabase.from("instructors").update({ stripe_connect_account_id: accountId }).eq("id", me.id)
  }

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
  const url = await createAccountLink(accountId, base)
  if (url) redirect(url)
  return { error: "Could not start onboarding. Try again." }
}
