"use client"

import { useActionState } from "react"
import { ArrowRight, Check, Loader2, Compass, ConciergeBell } from "lucide-react"
import { choosePath } from "@/app/portal/choose-path/actions"
import type { EnrollResult } from "@/app/portal/enroll/actions"
import type { ServicePackage } from "@/lib/packages"
import { AccessCodeField } from "@/components/portal/access-code-field"
import { Button } from "@/components/ui/button"

/**
 * CONCIERGE Phase 1 — the fork. Two premium cards, one CTA each. Copy is honest
 * about the ONE line that never moves: the applicant files their own NYPD
 * application on both paths. Concierge only removes the chores before that.
 */

type PathId = "self_guided" | "full_concierge"

const NARRATIVE: Record<
  PathId,
  { eyebrow: string; tagline: string; Icon: typeof Compass; you: string[]; we: string[] }
> = {
  self_guided: {
    eyebrow: "You drive it, we guide it",
    tagline: "The full playbook, in your hands.",
    Icon: Compass,
    you: [
      "Gather your own documents",
      "Book your own training",
      "File your own application",
    ],
    we: [
      "Give you the exact, personalized checklist",
      "Prepare your forms and answer every question",
      "Flag anything that would get you bounced",
    ],
  },
  full_concierge: {
    eyebrow: "We drive it, you watch",
    tagline: "Hand us the pieces — we assemble everything.",
    Icon: ConciergeBell,
    you: [
      "Sign a few forms and drop in your documents",
      "Review the finished packet",
      "File your own application — we walk you through it",
    ],
    we: [
      "Chase your references and cohabitant affidavits",
      "Prepare, assemble, and quality-check your whole packet",
      "Keep you posted at every step",
    ],
  },
}

export function ChoosePathCards({
  packages,
  alreadyMode,
  staffProvisioned = false,
  codesEnabled = false,
}: {
  packages: ServicePackage[]
  /** If the applicant already chose but hasn't paid, highlight that card. */
  alreadyMode: "self_guided" | "concierge" | null
  /** The path was set by STAFF (admin_manual) — don't attribute the choice to them. */
  staffProvisioned?: boolean
  /** ACCESS CODES — whether to show the "Have an access code?" field. */
  codesEnabled?: boolean
}) {
  // Only render the two real fork options, in a deliberate order.
  const order: PathId[] = ["self_guided", "full_concierge"]
  const cards = order
    .map((id) => packages.find((p) => p.key === id))
    .filter((p): p is ServicePackage => !!p)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((pkg) => (
        <PathCard
          key={pkg.key}
          pkg={pkg}
          selected={
            (pkg.key === "full_concierge" && alreadyMode === "concierge") ||
            (pkg.key === "self_guided" && alreadyMode === "self_guided")
          }
          staffProvisioned={staffProvisioned}
          codesEnabled={codesEnabled}
        />
      ))}
    </div>
  )
}

function PathCard({
  pkg,
  selected,
  staffProvisioned,
  codesEnabled,
}: {
  pkg: ServicePackage
  selected: boolean
  staffProvisioned: boolean
  codesEnabled: boolean
}) {
  const [state, action, pending] = useActionState<EnrollResult, FormData>(choosePath, {})
  const n = NARRATIVE[pkg.key as PathId]
  const concierge = pkg.key === "full_concierge"

  return (
    <div
      className={`flex h-full flex-col rounded-xl border p-5 sm:p-6 ${
        concierge ? "brass-edge border-brass/40 bg-brass/[0.04]" : "border-hairline bg-card"
      }`}
    >
      <div className="flex items-center gap-2">
        <n.Icon className={`size-5 ${concierge ? "text-brass" : "text-signal"}`} />
        <span className={`engraved ${concierge ? "text-brass" : "text-text-low"}`}>{n.eyebrow}</span>
      </div>

      <h2 className="mt-3 font-display text-xl font-semibold tracking-tight">{pkg.name}</h2>
      <p className="mt-1 text-sm text-text-mid">{n.tagline}</p>
      <div className="mt-3 font-display text-2xl font-bold tabular-nums">
        {pkg.priceLabel}
        {pkg.depositCents > 0 && (
          <span className="ml-2 align-middle text-xs font-normal text-text-low">
            or ${(pkg.depositCents / 100).toLocaleString("en-US")} to start
          </span>
        )}
      </div>

      <dl className="mt-4 space-y-4 text-sm">
        <div>
          <dt className="engraved mb-2 text-text-low">What you do</dt>
          <ul className="space-y-1.5">
            {n.you.map((li) => (
              <li key={li} className="flex gap-2 text-text-mid">
                <span aria-hidden className="mt-2 size-1 shrink-0 rounded-full bg-text-low" />
                {li}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <dt className={`engraved mb-2 ${concierge ? "text-brass" : "text-text-low"}`}>What we do</dt>
          <ul className="space-y-1.5">
            {n.we.map((li) => (
              <li key={li} className="flex gap-2 text-foreground">
                <Check className={`mt-0.5 size-4 shrink-0 ${concierge ? "text-brass" : "text-ok"}`} />
                {li}
              </li>
            ))}
          </ul>
        </div>
      </dl>

      <div className="mt-5 flex-1" />

      {selected && (
        <p className="mb-2 flex items-center gap-1.5 rounded-md border border-brass/30 bg-brass/8 p-2 text-xs text-brass-bright">
          <Check className="size-3.5 shrink-0" />
          {staffProvisioned
            ? "Your case is set up on this path — finish payment to begin."
            : "You picked this — finish payment to begin."}
        </p>
      )}

      <form action={action}>
        <input type="hidden" name="packageKey" value={pkg.key} />
        <input type="hidden" name="mode" value="full" />
        <Button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          variant={concierge ? "default" : "outline"}
          className="w-full"
        >
          {pending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" /> Starting…
            </>
          ) : (
            <>
              {concierge ? "Choose Full Concierge" : "Choose Self-Guided"}
              <ArrowRight className="ml-1.5 size-4" />
            </>
          )}
        </Button>
      </form>

      {state.requested && (
        <p className="mt-2 flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-2 text-xs text-ok">
          <Check className="size-3.5 shrink-0" /> Request received — we&apos;ll send your invoice within one
          business day, then your path unlocks.
        </p>
      )}
      {state.error && (
        <p className="mt-2 text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}

      {codesEnabled && <AccessCodeField packageKey={pkg.key} />}
    </div>
  )
}
