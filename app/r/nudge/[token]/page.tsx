import { createAdminClient } from "@/lib/supabase/admin"
import { LogoLockup } from "@/components/brand/logo"
import { ReferenceNudge } from "@/components/public/reference-nudge"

export const metadata = { title: "Remind a reference — Gun License NYC" }

/**
 * Applicant-facing landing for the one-click "remind this reference" button in
 * the reference-unfilled email. Reading the page does NOT send anything — the
 * resend is a button click (server action), so email prefetch is harmless.
 */
export default async function ReferenceNudgePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: req } = await admin
    .from("reference_requests")
    .select("status, character_references(name)")
    .eq("nudge_token", token)
    .maybeSingle()

  if (!req) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The reminder link may have expired or been mistyped. You can always resend from your
          portal under References &amp; household.
        </p>
      </Shell>
    )
  }

  const referenceName = (req.character_references as unknown as { name: string } | null)?.name ?? "your reference"
  const alreadyDone = req.status === "notarized" || req.status === "submitted"

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Remind {referenceName}</h1>
      {alreadyDone ? (
        <p className="mt-2 text-sm text-muted-foreground">
          Good news — {referenceName} has already completed their reference, so there&apos;s nothing to
          send. It may still be getting notarized; you&apos;ll be notified when it&apos;s uploaded.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted-foreground">
            We&apos;ll email {referenceName} their private link again so they can confirm and notarize
            their character reference — no account needed on their end.
          </p>
          <ReferenceNudge token={token} referenceName={referenceName} />
        </>
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-svh w-full max-w-xl px-4 py-10">
      <LogoLockup className="mb-6 text-lg" />
      {children}
    </div>
  )
}
