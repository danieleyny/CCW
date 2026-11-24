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
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { trackEvent } from "@/lib/analytics"

type PathId = "self_guided" | "full_concierge"

type PlanNarrative = {
  eyebrow: string
  tagline: string
  Icon: LucideIcon
  you: string[]
  we: string[]
}

function selectedFromMode(mode: "self_guided" | "concierge" | null): PathId | null {
  if (mode === "concierge") return "full_concierge"
  return mode
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
  const { messages } = usePortalI18n()
  const t = messages.choosePath
  const narrativeByPath: Record<PathId, PlanNarrative> = {
    self_guided: {
      eyebrow: t.youGuideEyebrow,
      tagline: t.selfTagline,
      Icon: Compass,
      you: [t.gatherDocuments, t.bookTraining, t.submitApplication],
      we: [t.personalizedChecklist, t.prepareForms, t.flagGaps],
    },
    full_concierge: {
      eyebrow: t.conciergeEyebrow,
      tagline: t.conciergeTagline,
      Icon: ConciergeBell,
      we: [t.coordinateAffidavits, t.qualityCheckPacket, t.filingReadyApplication, t.routineFollowUp],
      you: [t.signAndProvide, t.reviewPacket, t.submitToNypd],
    },
  }
  const saved = selectedFromMode(alreadyMode)
  const [selected, setSelected] = useState<PathId | null>(saved)
  const [state, action, pending] = useActionState<EnrollResult, FormData>(choosePath, {})
  const cards = (["self_guided", "full_concierge"] as const)
    .map((id) => packages.find((pkg) => pkg.key === id))
    .filter((pkg): pkg is ServicePackage => Boolean(pkg))
  const selectedPackage = cards.find((pkg) => pkg.key === selected) ?? null
  const selectedNarrative = selected ? narrativeByPath[selected] : null
  const disabled = pending || Boolean(state.requested)

  let nextLine = ""
  let desktopLabel = t.continue
  if (selected === "self_guided") {
    nextLine = t.nextTellUs
  } else if (selected === "full_concierge" && stripeEnabled) {
    nextLine = t.nextCheckout
    desktopLabel = t.continuePayment
  } else if (selected === "full_concierge") {
    nextLine = t.nextInvoice
    desktopLabel = t.requestInvoice
  }
  if (state.error) nextLine = t.couldNotStart

  return (
    <div className="portal-plan-picker">
      <form
        action={action}
        onSubmit={() => {
          if (!selectedPackage) return
          trackEvent("service_path_selected", { package_key: selectedPackage.key })
          if (selectedPackage.key === "full_concierge" && stripeEnabled) {
            trackEvent("begin_checkout", {
              package_key: selectedPackage.key,
              payment_mode: "full",
              transport_type: "beacon",
            })
          }
        }}
      >
        <input type="hidden" name="mode" value="full" />
        <div className="portal-plan-grid" role="radiogroup" aria-label={t.servicePlan}>
          {cards.map((pkg) => {
            const id = pkg.key as PathId
            const narrative = narrativeByPath[id]
            const concierge = id === "full_concierge"
            const applicantTasks =
              isPremiseResidence(applicationType) && id === "self_guided"
                ? [
                    t.gatherDocuments,
                    t.coordinateReferences,
                    t.submitApplication,
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
                currentLabel={staffProvisioned && savedChoice ? t.setUpForYou : t.yourPick}
                disabled={disabled}
                eyebrow={narrative.eyebrow}
                title={id === "full_concierge" ? t.concierge.replace(":", "") : t.selfGuided.replace(":", "")}
                description={narrative.tagline}
                Icon={narrative.Icon}
                onChange={() => setSelected(id)}
                tone={concierge ? "featured-dark" : "light"}
                badge={concierge ? t.doneForYou : undefined}
                className="portal-plan-card"
              >
                <p className="portal-choice-eyebrow portal-t-eyebrow">{narrative.eyebrow}</p>

                <div className="portal-plan-heading">
                  <h2 className="portal-plan-title">{id === "full_concierge" ? t.concierge.replace(":", "") : t.selfGuided.replace(":", "")}</h2>
                  <p className="portal-plan-price">{pkg.priceLabel}</p>
                </div>
                <p className="portal-plan-description">{narrative.tagline}</p>

                <div className={`portal-plan-lists ${concierge ? "portal-plan-lists-featured" : ""}`}>
                  {concierge ? (
                    <>
                      <PlanList title={t.weDo} items={narrative.we} checks />
                      <PlanList title={t.youDo} items={applicantTasks} />
                    </>
                  ) : (
                    <>
                      <PlanList title={t.youDo} items={applicantTasks} />
                      <PlanList title={t.weDo} items={narrative.we} checks />
                    </>
                  )}
                </div>

                {concierge && (
                  <div className="portal-plan-filing-band">
                    <Send size={18} strokeWidth={1.8} aria-hidden />
                    <p>
                      <strong>{t.filingReadyPacket}</strong>{" "}
                      {t.reviewAndSubmit}
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
            title={state.requested ? t.requestReceived : selectedPackage.key === "full_concierge" ? t.concierge.replace(":", "") : t.selfGuided.replace(":", "")}
            detail={state.requested ? undefined : selectedPackage.priceLabel}
            subline={
              state.requested
                ? t.invoiceTiming
                : nextLine
            }
            pending={pending}
            pendingLabel={t.starting}
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
