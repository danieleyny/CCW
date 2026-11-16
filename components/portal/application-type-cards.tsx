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

type Card = {
  id: ApplicantSelectableApplicationType
  eyebrow: string
  title: string
  description: string
  facts: ChoiceCardFact[]
  Icon: LucideIcon
}

const CARDS: Card[] = [
  {
    id: "premise_residence",
    eyebrow: "Keep it at home",
    title: "Premise Residence",
    description: "A handgun kept at your NYC home — not carried in public.",
    facts: [
      { label: "References", value: "2", note: "non-family" },
      { label: "Training", value: "None", note: "no 16 + 2-hr course" },
      { label: "Checklist", value: "Home", note: "ID, residence, household" },
    ],
    Icon: Home,
  },
  {
    id: "concealed_carry",
    eyebrow: "Carry in NYC",
    title: "Concealed Carry",
    description: "Authority to carry concealed, for an eligible NYC applicant.",
    facts: [
      { label: "References", value: "4", note: "character" },
      { label: "Training", value: "16 + 2 hrs", note: "classroom + live-fire" },
      { label: "Checklist", value: "Carry", note: "carry-specific" },
    ],
    Icon: ShieldCheck,
  },
  {
    id: "special_carry",
    eyebrow: "Extend a county license",
    title: "Special Carry",
    description: "You live outside NYC and already hold a NY county carry license.",
    facts: [
      { label: "Requires", value: "County", note: "your active license" },
      { label: "Review", value: "NYC", note: "NYC documents" },
      { label: "Scope", value: "Personal", note: "carry only" },
    ],
    Icon: MapPinned,
  },
]

function getSelectableType(type: ApplicationType | null) {
  return CARDS.some((card) => card.id === type)
    ? (type as ApplicantSelectableApplicationType)
    : null
}

export function ApplicationTypeCards({ current }: { current: ApplicationType | null }) {
  const saved = getSelectableType(current)
  const [selected, setSelected] = useState<ApplicantSelectableApplicationType | null>(saved)
  const [state, action, pending] = useActionState<SelectApplicationTypeResult, FormData>(
    selectApplicationType,
    {}
  )
  const selectedCard = CARDS.find((card) => card.id === selected)
  const savedCard = CARDS.find((card) => card.id === saved)
  const switching = Boolean(selectedCard && savedCard && selectedCard.id !== savedCard.id)
  const subline = switching
    ? `Replaces ${savedCard?.title} · Next: choose your plan`
    : "Next: choose your plan"

  return (
    <form action={action}>
      <div className="portal-choice-grid" role="radiogroup" aria-label="License path">
        {CARDS.map((card) => (
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

      {selectedCard && (
        <StickyActionBar
          key={`${selectedCard.id}-${state.error ? "error" : "ready"}`}
          Icon={selectedCard.Icon}
          title={selectedCard.title}
          subline={subline}
          pending={pending}
          error={state.error}
        />
      )}
    </form>
  )
}

export function StaffAssistedApplicationTypes() {
  return (
    <Link className="portal-staff-row" href="/portal/messages">
      <span className="portal-staff-icon" aria-hidden>
        <Building2 size={20} strokeWidth={1.65} />
      </span>
      <span className="min-w-0">
        <span className="block text-[0.90625rem] font-semibold leading-5">
          Premise Business, armed work or retired law enforcement?
        </span>
        <span className="mt-0.5 block text-[0.8125rem] leading-5 text-text-mid">
          These need a quick staff review — message your concierge and we&apos;ll set it up.
        </span>
      </span>
      <ChevronRight className="portal-staff-arrow size-4" aria-hidden />
    </Link>
  )
}
