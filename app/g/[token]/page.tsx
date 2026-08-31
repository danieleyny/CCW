import { createAdminClient } from "@/lib/supabase/admin"
import { LogoLockup } from "@/components/brand/logo"
import { safeguardTokenActive } from "@/lib/safeguard/invite"
import { SafeguardFlow } from "@/components/public/safeguard-flow"

export const metadata = { title: "Safeguarding acknowledgement — Gun License NYC", robots: { index: false, follow: false } }

export default async function SafeguardPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: invite } = await admin
    .from("safeguard_invites")
    .select("id, case_id, status, token_expires_at, token_revoked_at, opened_at")
    .eq("token", token)
    .maybeSingle()

  if (!invite || !safeguardTokenActive(invite)) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The link may have expired or been mistyped. Please ask the applicant to resend it.
        </p>
      </Shell>
    )
  }

  const { data: kase } = await admin.from("cases").select("clients(full_name)").eq("id", invite.case_id).single()
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"

  if (!invite.opened_at) {
    await admin.from("safeguard_invites").update({ opened_at: new Date().toISOString() }).eq("id", invite.id)
  }

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Safeguarding acknowledgement</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {applicant} designated you to safeguard and surrender their firearm(s) if they die or become
        incapacitated. Complete NYPD&apos;s short acknowledgement — no account needed. We build it from what
        they told us; you sign it in front of a witness and upload it.
      </p>
      <SafeguardFlow token={token} applicant={applicant} initialStatus={invite.status} />
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-svh w-full max-w-xl px-4 py-10">
      {/* Shown to a THIRD PARTY from an emailed link — kept branded so it doesn't read
          as phishing. The acknowledgement PDF they sign is the official NYPD form. */}
      <LogoLockup className="mb-6 text-lg" />
      {children}
    </div>
  )
}
