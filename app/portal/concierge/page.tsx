import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, ConciergeBell } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Your concierge" }

/**
 * CONCIERGE — the done-for-you home. Phase 1 ships this as a guarded landing;
 * Phases 2–4 fill it with the agreements gate, the booked intro call, the secure
 * vault, and the live control tower. Access requires a paid concierge package.
 */
export default async function ConciergeHome() {
  const myCase = await getMyCase()
  if (!myCase) redirect("/portal")

  const serviceMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  if (serviceMode !== "concierge") redirect("/portal/choose-path")

  const supabase = await createClient()
  const { data: paid } = await supabase
    .from("payments")
    .select("package_key")
    .eq("case_id", myCase.id)
    .eq("status", "paid")
    .eq("package_key", "full_concierge")
    .limit(1)
  const paidConcierge = (paid ?? []).length > 0
  // Chose concierge but hasn't paid yet — send them to finish enrolling.
  if (!paidConcierge) redirect("/portal/choose-path")

  const firstName = myCase.client.full_name.split(" ")[0]

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Full Concierge</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          You&apos;re on the done-for-you path. From here we prepare and assemble everything — you review it
          at the end and file your own application. We&apos;ll walk you through each step.
        </p>
      </div>

      <div className="brass-edge flex items-start gap-3 rounded-lg border border-brass/40 bg-brass/8 p-5">
        <ConciergeBell className="mt-0.5 size-5 shrink-0 text-brass" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Your concierge is being set up</h2>
          <p className="mt-1 text-sm text-text-mid">
            We&apos;re getting your engagement ready. In the meantime you can keep working your checklist —
            nothing you&apos;ve done is lost.
          </p>
          <Link
            href="/portal/checklist"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
          >
            View your checklist <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </div>
  )
}
