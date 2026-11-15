"use client"

import { useActionState } from "react"
import { ArrowRight, Building2, Check, Home, Loader2, MapPinned, ShieldCheck } from "lucide-react"
import {
  selectApplicationType,
  type SelectApplicationTypeResult,
} from "@/app/portal/license-path/actions"
import type {
  ApplicantSelectableApplicationType,
  ApplicationType,
} from "@/lib/application-types"
import { Button } from "@/components/ui/button"

type Card = {
  id: ApplicantSelectableApplicationType
  eyebrow: string
  title: string
  description: string
  points: string[]
  Icon: typeof Home
  accent: "signal" | "brass" | "cyan"
}

const CARDS: Card[] = [
  {
    id: "premise_residence",
    eyebrow: "Keep it at home",
    title: "Premise Residence",
    description: "For a handgun kept at your New York City residence — not carried in public.",
    points: [
      "Two non-family character references",
      "No 16+2-hour concealed-carry course for this application path",
      "A checklist centered on your identity, residence, household and disclosures",
    ],
    Icon: Home,
    accent: "brass",
  },
  {
    id: "concealed_carry",
    eyebrow: "Carry in New York City",
    title: "Concealed Carry",
    description: "For an eligible New York City applicant seeking authority to carry concealed.",
    points: [
      "Four character references",
      "The required 16-hour classroom and 2-hour live-fire course",
      "Carry-specific preparation and document tracking",
    ],
    Icon: ShieldCheck,
    accent: "signal",
  },
  {
    id: "special_carry",
    eyebrow: "Extend a county licence",
    title: "Special Carry",
    description: "For someone outside NYC who already holds a qualifying New York county carry licence.",
    points: [
      "Your active home-county pistol licence remains the foundation",
      "NYC-specific application documents and review",
      "Personal carry only — armed employment follows a separate sponsored route",
    ],
    Icon: MapPinned,
    accent: "cyan",
  },
]

export function ApplicationTypeCards({ current }: { current: ApplicationType | null }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {CARDS.map((card) => (
        <ApplicationTypeCard key={card.id} card={card} selected={current === card.id} />
      ))}
    </div>
  )
}

function ApplicationTypeCard({ card, selected }: { card: Card; selected: boolean }) {
  const [state, action, pending] = useActionState<SelectApplicationTypeResult, FormData>(
    selectApplicationType,
    {}
  )
  const tone = {
    signal: "border-signal/35 bg-signal/[0.045] text-signal",
    brass: "border-brass/40 bg-brass/[0.055] text-brass-bright",
    cyan: "border-cyan-400/35 bg-cyan-400/[0.04] text-cyan-300",
  }[card.accent]

  return (
    <article className={`relative flex min-h-full flex-col overflow-hidden rounded-xl border p-5 sm:p-6 ${tone}`}>
      <div aria-hidden className="absolute -right-12 -top-12 size-32 rounded-full border border-current/10" />
      <div aria-hidden className="absolute -right-4 -top-4 size-20 rounded-full border border-current/10" />
      <card.Icon className="relative size-6" strokeWidth={1.6} />
      <p className="engraved relative mt-5 text-current">{card.eyebrow}</p>
      <h2 className="relative mt-2 font-display text-2xl font-semibold tracking-tight text-foreground">
        {card.title}
      </h2>
      <p className="relative mt-2 text-sm leading-6 text-text-mid">{card.description}</p>
      <ul className="relative mt-5 space-y-2.5 text-sm text-foreground">
        {card.points.map((point) => (
          <li key={point} className="flex gap-2.5">
            <Check className="mt-0.5 size-4 shrink-0 text-current" />
            <span>{point}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex-1" />
      {selected && (
        <p className="mb-2 rounded-md border border-current/25 bg-background/30 px-3 py-2 text-xs text-current">
          Currently selected
        </p>
      )}
      <form action={action}>
        <input type="hidden" name="applicationType" value={card.id} />
        <Button type="submit" className="w-full" variant={card.id === "premise_residence" ? "default" : "outline"} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin motion-reduce:animate-none" /> : selected ? "Continue with this path" : "Choose this path"}
          {!pending && <ArrowRight className="ml-1.5 size-4" />}
        </Button>
      </form>
      {state.error && <p role="alert" className="mt-2 text-xs text-danger">{state.error}</p>}
    </article>
  )
}

export function StaffAssistedApplicationTypes() {
  return (
    <div className="mt-5 grid gap-3 rounded-xl border border-hairline bg-card/60 p-4 sm:grid-cols-[auto_1fr] sm:items-center sm:p-5">
      <Building2 className="size-5 text-text-low" />
      <div>
        <p className="text-sm font-medium text-foreground">Premise Business, armed work, or retired law enforcement?</p>
        <p className="mt-1 text-xs leading-5 text-text-mid">
          Those categories need a short staff review before we configure the case. Contact your concierge and we&apos;ll open the correct path without guessing.
        </p>
      </div>
    </div>
  )
}
