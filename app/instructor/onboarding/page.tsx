import { redirect } from "next/navigation"
import { CheckCircle2 } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { getMyInstructor } from "@/lib/instructor"
import { OnboardingForm } from "@/components/instructor/onboarding-form"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ONBOARDING_INTRO } from "@/content/trainer-onboarding"

export const metadata = { title: "Onboarding" }

/**
 * PART C / Phase 13 — the onboarding gate. Required before an instructor reaches
 * applicants; once complete it just confirms so.
 */
export default async function InstructorOnboardingPage() {
  await requireRole(["instructor"])
  const me = await getMyInstructor()
  if (!me) redirect("/instructor")

  const done = !!me.onboarding_completed_at

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <SectionEyebrow>Instructor</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Platform onboarding</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-mid">{ONBOARDING_INTRO}</p>
      </div>

      {done ? (
        <div className="flex items-center gap-2 rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
          <CheckCircle2 className="size-4" /> You&apos;ve completed onboarding. This is what clears you to go
          live once an admin verifies your credential.
        </div>
      ) : (
        <OnboardingForm />
      )}
    </div>
  )
}
