import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ProvisionSponsorForm } from "@/components/admin/provision-sponsor-form"
import { setCaseTrack } from "@/app/admin/sponsors/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export const metadata = { title: "Sponsorships", robots: { index: false, follow: false } }

const SCOPE_LABEL: Record<string, string> = {
  packet_only: "Packet only",
  assist: "Assist",
  full: "Full",
}

/**
 * Staff-only sponsorship console. Deliberately UNLISTED — not in the admin nav;
 * the owner navigates here directly. This is the tool that stands up the (dark)
 * two-party cases.
 */
export default async function AdminSponsorsPage() {
  await requireStaff()

  async function applyTrack(formData: FormData) {
    "use server"
    await setCaseTrack(formData)
  }

  const db = await createClient()
  const { data: rows } = await db
    .from("case_sponsorships")
    .select("id, scope, status, applicant_consented_at, invited_name, invited_email, sponsor:sponsors(legal_name), case:cases(id, license_track, client:clients(full_name))")
    .order("created_at", { ascending: false })

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Concierge · sponsorships</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Sponsorships</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Stand up a two-party sponsored case. The applicant must consent before the representative sees
          anything, and every sensitive read is logged.
        </p>
      </div>

      <ProvisionSponsorForm />

      {/* Staff override of a derived track — the License Division's answer beats
          our inference (e.g. confirming a non-resident's category). Required note. */}
      <form action={applyTrack} className="space-y-3 rounded-lg border border-hairline bg-card p-5">
        <h2 className="text-lg font-semibold tracking-tight">Override a case&apos;s licence track</h2>
        <p className="text-xs text-text-mid">
          Use when the License Division confirms a category our intake couldn&apos;t resolve. Logged with your note.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input name="caseId" placeholder="Case ID" required className="sm:col-span-1" />
          <select
            name="track"
            defaultValue="carry_guard"
            className="h-11 rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground"
          >
            <option value="carry_guard">carry_guard</option>
            <option value="special_carry_guard">special_carry_guard</option>
            <option value="sponsored_unresolved">sponsored_unresolved</option>
            <option value="concealed_carry">concealed_carry</option>
          </select>
          <Input name="note" placeholder="Reason (required)" required />
        </div>
        <Button type="submit" size="sm" className="min-h-[40px]">Apply override</Button>
      </form>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Existing sponsorships</h2>
        {(rows ?? []).length === 0 ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">None yet.</p>
        ) : (
          <ul className="space-y-2">
            {(rows ?? []).map((s) => {
              const company = (s.sponsor as unknown as { legal_name: string } | null)?.legal_name ?? "—"
              const kase = s.case as unknown as { license_track: string; client: { full_name: string } | null } | null
              const applicant = kase?.client?.full_name ?? "—"
              const consented = !!s.applicant_consented_at && s.status === "active"
              return (
                <li key={s.id} className="rounded-lg border border-hairline bg-card p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-medium">{company}</span> → {applicant}
                      <span className="ml-2 text-xs text-text-mid">
                        {SCOPE_LABEL[s.scope] ?? s.scope} · {kase?.license_track}
                      </span>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        consented ? "bg-ok/12 text-ok" : "bg-warn/12 text-warn"
                      }`}
                    >
                      {consented ? "Consented · active" : `${s.status} · awaiting consent`}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-text-low">
                    Rep: {s.invited_name ?? s.invited_email}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
