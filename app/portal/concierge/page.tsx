import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { loadConciergeOnboarding } from "@/lib/concierge/onboarding"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { AgreementsGate } from "@/components/portal/concierge/agreements-gate"
import { BookCall } from "@/components/portal/concierge/book-call"

export const metadata = { title: "Your concierge" }

/**
 * CONCIERGE — the done-for-you home. Access requires a paid concierge package.
 * First run is a strict order: the agreements gate blocks everything until it's
 * signed; then the intro call. Phases 3–4 add the secure vault and the live
 * control tower into this same page.
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
  if ((paid ?? []).length === 0) redirect("/portal/choose-path")

  const onboarding = await loadConciergeOnboarding(supabase, myCase.id)
  const firstName = myCase.client.full_name.split(" ")[0]

  // The gate blocks everything until the engagement is signed.
  if (!onboarding.agreementsSigned) {
    return <AgreementsGate defaultName={myCase.client.full_name} />
  }

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Full Concierge</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          You&apos;re on the done-for-you path. We prepare and assemble everything — you review it at the
          end and file your own application. First, let&apos;s get your intro call on the calendar.
        </p>
      </div>

      <BookCall
        calendlyUrl={process.env.CALENDLY_CONCIERGE_URL ?? null}
        caseId={myCase.id}
        introCall={onboarding.introCall}
      />

      {/* Phase 3 (secure vault) and Phase 4 (control tower) render below here. */}
      <Link
        href="/portal/checklist"
        className="flex items-center justify-between rounded-md border border-hairline bg-surface-2/40 px-4 py-3.5 text-text-mid transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium">Meanwhile, you can add documents anytime</span>
        <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
