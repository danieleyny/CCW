"use client"

import { useActionState, useState } from "react"
import { Check, Compass, ConciergeBell, Send, type LucideIcon } from "lucide-react"
import { choosePath } from "@/app/portal/choose-path/actions"
import type { EnrollResult } from "@/app/portal/enroll/actions"
import { AccessCodeField } from "@/components/portal/access-code-field"
import { ChoiceCard } from "@/components/portal/ui/choice-card"
import { StickyActionBar } from "@/components/portal/ui/sticky-action-bar"
import { isPremiseResidence, type ApplicationType } from "@/lib/application-types"
import type { ServicePackage } from "@/lib/packages"

type PathId = "self_guided" | "full_concierge"

type PlanNarrative = {
  eyebrow: string
  tagline: string
  Icon: LucideIcon
  you: string[]
  we: string[]
}

const NARRATIVE: Record<PathId, PlanNarrative> = {
  self_guided: {
    eyebrow: "You drive it, we guide it",
    tagline: "The full playbook, in your hands.",
    Icon: Compass,
    you: [
      "Gather your own documents",
      "Book your own training",
      "Submit your own application",
    ],
    we: [
      "Give you the exact, personalized checklist",
      "Prepare your forms and answer process questions",
      "Flag gaps before you submit",
    ],
  },
  full_concierge: {
    eyebrow: "We do the legwork · you stay in control",
    tagline: "Hand us the pieces — we organize the preparation from start to finish.",
    Icon: ConciergeBell,
    we: [
      "Coordinate with your references and cohabitant affidavits",
      "Prepare, assemble, and quality-check your whole packet",
      "Organize a filing-ready application for your review",
      "Follow up routinely, with unlimited support from our team",
    ],
    you: [
      "Sign your forms and provide your documents",
      "Review your finished packet",
      "Submit your own application directly to NYPD",
    ],
  },
}

function selectedFromMode(mode: "self_guided" | "concierge" | null): PathId | null {
  if (mode === "concierge") return "full_concierge"
  return mode
}

function formatDollars(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US")}`
}

export function ChoosePathCards({
  packages,
  alreadyMode,
  staffProvisioned = false,
  codesEnabled = false,
  applicationType,
  stripeEnabled,
  feeNote,
}: {
  packages: ServicePackage[]
  alreadyMode: "self_guided" | "concierge" | null
  staffProvisioned?: boolean
  codesEnabled?: boolean
  applicationType: ApplicationType
  stripeEnabled: boolean
  feeNote: string
}) {
  const saved = selectedFromMode(alreadyMode)
  const [selected, setSelected] = useState<PathId | null>(saved)
  const [state, action, pending] = useActionState<EnrollResult, FormData>(choosePath, {})
  const cards = (["self_guided", "full_concierge"] as const)
    .map((id) => packages.find((pkg) => pkg.key === id))
    .filter((pkg): pkg is ServicePackage => Boolean(pkg))
  const selectedPackage = cards.find((pkg) => pkg.key === selected) ?? null
  const selectedNarrative = selected ? NARRATIVE[selected] : null
  const disabled = pending || Boolean(state.requested)

  let nextLine = ""
  let desktopLabel = "Continue"
  if (selected === "self_guided") {
    nextLine = "Next: tell us about you — pay when you're ready"
  } else if (selected === "full_concierge" && stripeEnabled) {
    nextLine = "Next: secure checkout"
    desktopLabel = "Continue to payment"
  } else if (selected === "full_concierge") {
    nextLine = "Next: we email your invoice"
    desktopLabel = "Request invoice"
  }
  if (state.error) nextLine = "Couldn't start — try again"

  return (
    <div className="portal-plan-picker">
      <form action={action}>
        <input type="hidden" name="mode" value="full" />
        <div className="portal-plan-grid" role="radiogroup" aria-label="Service plan">
          {cards.map((pkg) => {
            const id = pkg.key as PathId
            const narrative = NARRATIVE[id]
            const concierge = id === "full_concierge"
            const applicantTasks =
              isPremiseResidence(applicationType) && id === "self_guided"
                ? [
                    "Gather your own documents",
                    "Coordinate your two references",
                    "Submit your own application",
                  ]
                : narrative.you
            const savedChoice = saved === id

            return (
              <ChoiceCard
                key={id}
                id={`service-plan-${id}`}
                name="packageKey"
                value={id}
                selected={selected === id}
                current={savedChoice}
                currentLabel={staffProvisioned && savedChoice ? "Set up for you" : "Your pick"}
                disabled={disabled}
                eyebrow={narrative.eyebrow}
                title={pkg.name}
                description={narrative.tagline}
                Icon={narrative.Icon}
                onChange={() => setSelected(id)}
                tone={concierge ? "featured-dark" : "light"}
                badge={concierge ? "Done for you" : undefined}
                className="portal-plan-card"
              >
                <p className="portal-choice-eyebrow portal-t-eyebrow">{narrative.eyebrow}</p>

                <div className="portal-plan-heading">
                  <h2 className="portal-plan-title">{pkg.name}</h2>
                  <p className="portal-plan-price">{pkg.priceLabel}</p>
                </div>
                {pkg.depositCents > 0 && (
                  <p className="portal-plan-deposit">
                    Deposit option: {formatDollars(pkg.depositCents)}
                  </p>
                )}
                <p className="portal-plan-description">{narrative.tagline}</p>

                <div className={`portal-plan-lists ${concierge ? "portal-plan-lists-featured" : ""}`}>
                  {concierge ? (
                    <>
                      <PlanList title="We do" items={narrative.we} checks />
                      <PlanList title="You do" items={applicantTasks} />
                    </>
                  ) : (
                    <>
                      <PlanList title="You do" items={applicantTasks} />
                      <PlanList title="We do" items={narrative.we} checks />
                    </>
                  )}
                </div>

                {concierge && (
                  <div className="portal-plan-filing-band">
                    <Send size={18} strokeWidth={1.8} aria-hidden />
                    <p>
                      <strong>Your filing-ready packet, fully organized.</strong>{" "}
                      You review and submit it directly to NYPD.
                    </p>
                  </div>
                )}
              </ChoiceCard>
            )
          })}
        </div>

        {state.error && (
          <p className="portal-plan-error" role="alert">
            {state.error}
          </p>
        )}

        {selectedPackage && selectedNarrative && (
          <StickyActionBar
            key={`${selectedPackage.key}-${state.requested ? "success" : "active"}`}
            Icon={selectedNarrative.Icon}
            title={state.requested ? "Request received" : selectedPackage.name}
            detail={state.requested ? undefined : selectedPackage.priceLabel}
            subline={
              state.requested
                ? "We'll email your invoice within one business day, then your path unlocks."
                : nextLine
            }
            pending={pending}
            pendingLabel="Starting…"
            desktopLabel={desktopLabel}
            success={Boolean(state.requested)}
          />
        )}
      </form>

      <div className="portal-plan-under-row">
        {codesEnabled ? (
          <AccessCodeField
            packageKey={selectedPackage?.key ?? null}
            planName={selectedPackage?.name}
          />
        ) : (
          <span />
        )}
        <p className="portal-plan-fine-print">{feeNote}</p>
      </div>
    </div>
  )
}

function PlanList({
  title,
  items,
  checks = false,
}: {
  title: string
  items: string[]
  checks?: boolean
}) {
  return (
    <section className="portal-plan-list">
      <h3 className="portal-plan-list-title portal-t-label">{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>
            {checks ? (
              <Check className="portal-plan-list-check" size={16} strokeWidth={2} aria-hidden />
            ) : (
              <span className="portal-plan-list-dot" aria-hidden />
            )}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}
