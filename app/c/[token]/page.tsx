import { createAdminClient } from "@/lib/supabase/admin"
import { LogoLockup } from "@/components/brand/logo"
import { tokenActive } from "@/lib/references/process"
import { CohabitantFlow } from "@/components/public/cohabitant-flow"

export const metadata = { title: "Cohabitant affidavit — Gun License NYC" }

export default async function CohabitantPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data: cohab } = await admin
    .from("cohabitants")
    .select("id, name, relationship, affidavit_status, case_id, token_expires_at, token_revoked_at")
    .eq("token", token)
    .maybeSingle()

  if (!cohab || !tokenActive({ expires_at: cohab.token_expires_at, revoked_at: cohab.token_revoked_at })) {
    return (
      <Shell>
        <h1 className="text-xl font-semibold">This link isn&apos;t valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The affidavit link may have expired or been mistyped. Please ask the applicant to resend it.
        </p>
      </Shell>
    )
  }

  const { data: kase } = await admin.from("cases").select("clients(full_name)").eq("id", cohab.case_id).single()
  const applicant = (kase?.clients as unknown as { full_name: string } | null)?.full_name ?? "the applicant"

  return (
    <Shell>
      <h1 className="text-xl font-semibold tracking-tight">Cohabitant affidavit</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        A quick, guided confirmation for {applicant}&apos;s NYC carry-license application — no account needed.
        We&apos;ll build a notarization-ready affidavit from your confirmation.
      </p>
      <CohabitantFlow
        token={token}
        cohabitantName={cohab.name ?? ""}
        relationship={cohab.relationship ?? null}
        applicant={applicant}
        initialStatus={cohab.affidavit_status}
      />
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
