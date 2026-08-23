import Link from "next/link"
import { getAuth } from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { acceptSponsorInvite } from "@/app/invite/actions"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Your invitation", robots: { index: false, follow: false } }

/**
 * /invite/[token] — the sponsor rep's entry point. The token is an opaque
 * capability link that carries case context; it is CONVENIENCE, NOT SECURITY.
 * Auth + RLS/views are the real gate — every read a sponsor makes is scoped to an
 * active, consented binding regardless of how they got here. Resolved with the
 * admin client only to look up the invite (no login required to see the prompt).
 */
export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()
  const { data: invite } = await admin
    .from("case_sponsorships")
    .select("id, invited_email, invited_name, revoked_at, sponsor:sponsors(legal_name)")
    .eq("invite_token", token)
    .maybeSingle()

  const valid = invite && !invite.revoked_at
  const company = (invite?.sponsor as unknown as { legal_name: string } | null)?.legal_name ?? "a company"

  const auth = await getAuth()

  async function accept() {
    "use server"
    await acceptSponsorInvite(token)
  }

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <SectionEyebrow>Sponsor access</SectionEyebrow>
      {!valid ? (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">This invitation isn&apos;t active</h1>
          <p className="mt-2 text-sm text-text-mid">
            The link may have expired or been withdrawn. Please ask your Gun License NYC contact for a new one.
          </p>
        </>
      ) : (
        <>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">
            You&apos;ve been invited by {company}
          </h1>
          <p className="mt-2 text-sm text-text-mid">
            This link gives you access to the sponsored applicant&apos;s licence file, once the applicant
            has consented. Sign in with <span className="text-foreground">{invite!.invited_email}</span> to continue.
          </p>

          {auth ? (
            <form action={accept} className="mt-6">
              <Button type="submit" className="min-h-[44px] w-full">
                Continue to the sponsor portal
              </Button>
            </form>
          ) : (
            <div className="mt-6 flex flex-col gap-2">
              <Button asChild className="min-h-[44px] w-full">
                <Link href={`/auth/login?redirect=${encodeURIComponent(`/invite/${token}`)}`}>Sign in</Link>
              </Button>
              <Button asChild variant="outline" className="min-h-[44px] w-full">
                <Link href={`/auth/sign-up?redirect=${encodeURIComponent(`/invite/${token}`)}`}>
                  Create your account
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </main>
  )
}
