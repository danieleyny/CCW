"use client"

import { useActionState, useState } from "react"
import Link from "next/link"
import {
  Building2,
  ChevronRight,
  Home,
  MapPinned,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react"
import {
  selectApplicationType,
  type SelectApplicationTypeResult,
} from "@/app/portal/license-path/actions"
import type {
  ApplicantSelectableApplicationType,
  ApplicationType,
} from "@/lib/application-types"
import {
  ChoiceCard,
  type ChoiceCardFact,
} from "@/components/portal/ui/choice-card"
import { StickyActionBar } from "@/components/portal/ui/sticky-action-bar"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Messages } from "@/lib/i18n/messages"

type Card = {
  id: ApplicantSelectableApplicationType
  eyebrow: string
  title: string
  description: string
  facts: ChoiceCardFact[]
  Icon: LucideIcon
}

function getCards(t: Messages["licensePath"]): Card[] {
  return [
  {
    id: "premise_residence",
    eyebrow: t.keepAtHome,
    title: t.premiseResidence,
    description: t.premiseDescription,
    facts: [
      { label: t.references, value: "2", note: t.nonFamily },
      { label: t.training, value: t.none, note: t.noCourse },
      { label: t.checklist, value: t.home, note: t.residenceHousehold },
    ],
    Icon: Home,
  },
  {
    id: "concealed_carry",
    eyebrow: t.carryInNyc,
    title: t.concealedCarry,
    description: t.concealedDescription,
    facts: [
      { label: t.references, value: "4", note: t.character },
      { label: t.training, value: "16 + 2 hrs", note: t.classroomLiveFire },
      { label: t.checklist, value: t.carry, note: t.carrySpecific },
    ],
    Icon: ShieldCheck,
  },
  {
    id: "special_carry",
    eyebrow: t.extendCounty,
    title: t.specialCarry,
    description: t.specialDescription,
    facts: [
      { label: t.requires, value: t.county, note: t.activeLicense },
      { label: t.review, value: t.nyc, note: t.nycDocuments },
      { label: t.scope, value: t.personal, note: t.carryOnly },
    ],
    Icon: MapPinned,
  },
  ]
}

function getSelectableType(type: ApplicationType | null, cards: Card[]) {
  return cards.some((card) => card.id === type)
    ? (type as ApplicantSelectableApplicationType)
    : null
}

export function ApplicationTypeCards({
  current,
  context = "setup",
}: {
  current: ApplicationType | null
  context?: "setup" | "license"
}) {
  const { messages } = usePortalI18n()
  const t = messages.licensePath
  const license = messages.license
  const cards = getCards(t)
  const saved = getSelectableType(current, cards)
  const [selected, setSelected] = useState<ApplicantSelectableApplicationType | null>(saved)
  const [state, action, pending] = useActionState<SelectApplicationTypeResult, FormData>(
    selectApplicationType,
    {}
  )
  const selectedCard = cards.find((card) => card.id === selected)
  const savedCard = cards.find((card) => card.id === saved)
  const switching = Boolean(selectedCard && savedCard && selectedCard.id !== savedCard.id)
  const subline = context === "license"
    ? license.pathUpdatesChecklist
    : switching
      ? `${t.replaces} ${savedCard?.title} · ${t.nextChoosePlan}`
      : t.nextChoosePlan
  const showAction = Boolean(selectedCard && (context === "setup" || switching || !savedCard))

  return (
    <form action={action} className={context === "license" ? "license-v2-path-form" : undefined}>
      <input type="hidden" name="returnTo" value={context === "license" ? "license" : "choose-path"} />
      <div className="portal-choice-grid" role="radiogroup" aria-label={t.radioLabel}>
        {cards.map((card) => (
          <ChoiceCard
            key={card.id}
            id={`application-type-${card.id}`}
            name="applicationType"
            value={card.id}
            selected={selected === card.id}
            current={saved === card.id}
            disabled={pending}
            eyebrow={card.eyebrow}
            title={card.title}
            description={card.description}
            facts={card.facts}
            Icon={card.Icon}
            onChange={() => setSelected(card.id)}
          />
        ))}
      </div>

      {state.error && (
        <p className="portal-license-error" role="alert">
          {state.error}
        </p>
      )}

      {showAction && selectedCard && (
        <StickyActionBar
          key={`${selectedCard.id}-${state.error ? "error" : "ready"}`}
          Icon={selectedCard.Icon}
          title={selectedCard.title}
          subline={subline}
          pending={pending}
          error={state.error}
          desktopLabel={context === "license" ? `${license.pathUpdateAction}: ${selectedCard.title}` : undefined}
          mobileLabel={context === "license" ? license.pathUpdateAction : undefined}
        />
      )}
    </form>
  )
}

export function StaffAssistedApplicationTypes() {
  const { messages } = usePortalI18n()
  const t = messages.licensePath
  return (
    <Link className="portal-staff-row" href="/portal/messages">
      <span className="portal-staff-icon" aria-hidden>
        <Building2 size={20} strokeWidth={1.65} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.90625rem] font-semibold leading-5">
          {t.staffQuestion}
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-5 text-text-mid">
          {t.staffAnswer}
        </span>
      </span>
      <ChevronRight className="portal-staff-arrow size-4" aria-hidden />
    </Link>
  )
}
