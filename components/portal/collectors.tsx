"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { Plus, Trash2, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import {
  addReference,
  deleteReference,
  addCohabitant,
  deleteCohabitant,
  type CollectorState,
} from "@/app/portal/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { referenceComposition } from "@/lib/references/composition"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { cn } from "@/lib/utils"

export interface ReferenceRow {
  id: string
  name: string
  relationship: string | null
  is_family: boolean
  contact_email: string | null
  notarized: boolean
  received: boolean
}

export interface CohabitantRow {
  id: string
  name: string
  relationship: string | null
  affidavit_status: string
}

export function RemovePersonButton({
  caseId,
  id,
  kind,
  name,
}: {
  caseId: string
  id: string
  kind: "reference" | "cohabitant"
  name: string
}) {
  const [pending, start] = useTransition()
  const { messages } = usePortalI18n()

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => start(() => kind === "reference" ? deleteReference(id, caseId) : deleteCohabitant(id, caseId))}
      aria-label={`${messages.ui.remove} ${name}`}
      className="grid size-9 shrink-0 place-items-center rounded-full text-text-low transition hover:bg-danger/[0.07] hover:text-danger disabled:opacity-50"
    >
      <Trash2 className="size-4" aria-hidden />
    </button>
  )
}

const FAMILY_WORDS = [
  "father", "mother", "dad", "mom", "mum", "mommy", "daddy", "papa", "mama", "parent",
  "sister", "brother", "sibling", "son", "daughter", "child", "kid",
  "wife", "husband", "spouse", "fiance", "fiancé", "fiancee", "fiancée",
  "uncle", "aunt", "auntie", "cousin", "nephew", "niece",
  "grandmother", "grandfather", "grandma", "grandpa", "granny", "grandad", "nana", "nanny",
  "in-law", "inlaw", "mother-in-law", "father-in-law", "brother-in-law", "sister-in-law",
  "stepfather", "stepmother", "stepdad", "stepmom", "stepson", "stepdaughter",
  "stepsister", "stepbrother", "half-brother", "half-sister", "relative", "family",
  "padre", "madre", "papá", "papa", "mamá", "mama", "hermana", "hermano", "hijo", "hija",
  "esposa", "esposo", "cónyuge", "conyuge", "tío", "tio", "tía", "tia", "primo", "prima",
  "sobrino", "sobrina", "abuela", "abuelo", "suegra", "suegro", "cuñado", "cunado", "cuñada", "cunada",
  "pariente", "familiar", "familia",
]

function isFamilyRelationship(value: string): boolean {
  const normalized = value.toLowerCase()
  return FAMILY_WORDS.some((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`).test(normalized))
}

function ordinalFor(index: number, t: Record<string, string>) {
  return [t.peopleOrdinalFirst, t.peopleOrdinalSecond, t.peopleOrdinalThird, t.peopleOrdinalFourth][index]
    ?? String(index + 1)
}

export function ReferenceCollector({
  caseId,
  references,
  required = 4,
  hideRule = false,
  hideAdd = false,
}: {
  caseId: string
  references: ReferenceRow[]
  required?: number
  hideRule?: boolean
  hideAdd?: boolean
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<CollectorState, FormData>(addReference, {})
  const [isFamily, setIsFamily] = useState(false)
  const [open, setOpen] = useState(false)
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      // Reset local form controls only after the server confirms the add.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFamily(false)
      setOpen(false)
      toast.success(t.referenceAdded)
    }
  }, [state, t.referenceAdded])

  const atMax = references.length >= required
  // One composition rule drives this view and the server boundary.
  const composition = referenceComposition(references, required)
  const showFamilyOption = composition.maxFamily > 0
  const familyAllowed = showFamilyOption && !composition.familyCapReached
  const remaining = Math.max(0, required - references.length)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!familyAllowed && isFamily) setIsFamily(false)
  }, [familyAllowed, isFamily])

  const ruleCopy = required <= 2
    ? interpolate(t.peopleFamilyRuleTwo, { required })
    : interpolate(t.peopleFamilyRuleFour, { required, family: composition.maxFamily, unrelated: composition.minNonFamily })

  return (
    <div className="space-y-4">
      {!hideRule ? <section className="rounded-2xl border border-hairline bg-white p-4 shadow-[0_10px_30px_rgba(10,18,34,.04)] sm:p-5">
        <div className="flex flex-wrap items-center gap-2" aria-label={ruleCopy}>
          {Array.from({ length: required }, (_, index) => {
            const reference = references[index]
            const family = !!reference?.is_family
            return (
              <span
                key={reference?.id ?? `empty-${index}`}
                title={reference?.name}
                className={cn(
                  "grid size-11 place-items-center rounded-xl border font-mono text-[11px] font-bold tracking-[.08em]",
                  !reference && "border-dashed border-text-low/35 bg-surface-2 text-text-low",
                  reference && !family && "border-[var(--portal-navy)]/15 bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]",
                  reference && family && "border-[var(--portal-gold)]/35 bg-[var(--portal-gold)]/12 text-[var(--portal-gold-deep)]"
                )}
              >
                {reference ? (family ? t.peopleFamilySlot : t.peopleUnrelatedSlot) : "+"}
              </span>
            )
          })}
        </div>
        <p className="mt-3 text-[14px] leading-6 text-text-mid">{ruleCopy}</p>
        {remaining > 0 && composition.familyCapReached ? (
          <p className="mt-2 rounded-xl border border-warn/20 bg-warn/[0.06] px-3 py-2 text-[13px] font-medium text-warn">
            {interpolate(t.peopleMoreUnrelated, { count: remaining })}
          </p>
        ) : null}
      </section> : null}

      {!hideAdd ? composition.complete ? (
        <p className="rounded-2xl border border-ok/25 bg-ok/[0.07] p-4 text-[14px] font-medium text-ok">
          {interpolate(t.referencesAdded, { count: required })}
        </p>
      ) : atMax && composition.problem ? (
        <p className="rounded-2xl border border-warn/30 bg-warn/10 p-4 text-[14px] text-warn">
          {locale === "es"
            ? interpolate(t.peopleFamilyProblem, { family: composition.familyCount, unrelated: composition.minNonFamily, required })
            : composition.problem}
        </p>
      ) : !open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group flex min-h-28 w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--portal-gold)]/65 bg-[var(--portal-gold)]/[0.045] p-5 text-left transition hover:bg-[var(--portal-gold)]/[0.08]"
        >
          <span>
            <span className="portal-title-font block text-[22px] font-medium text-foreground">
              {interpolate(t.peopleAddOrdinalReference, { ordinal: ordinalFor(references.length, t) })}
            </span>
            <span className="mt-1 block text-[13px] leading-5 text-text-mid">{t.peopleAddReferenceHint}</span>
          </span>
          <span className="grid size-11 shrink-0 place-items-center rounded-full [background:var(--portal-gold-button)] text-[var(--portal-navy)]">
            <Plus className="size-5" aria-hidden />
          </span>
        </button>
      ) : (
        <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-[var(--portal-gold)]/35 bg-white p-5 shadow-[0_14px_34px_rgba(10,18,34,.06)]">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[11px] font-semibold uppercase tracking-[.15em] text-[var(--portal-gold-deep)]">
                {interpolate(t.peopleReferenceCount, { current: references.length + 1, required })}
              </p>
              <h3 className="portal-title-font mt-1 text-[24px] font-medium">{t.peopleReferenceDetails}</h3>
            </div>
            {references.length > 0 ? (
              <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-text-mid underline">
                {t.cancel}
              </button>
            ) : null}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-name">{t.name}</Label>
              <Input id="ref-name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-rel">{t.relationship}</Label>
              <Input
                id="ref-rel"
                name="relationship"
                placeholder={t.relationshipExample}
                onChange={(event) => {
                  if (isFamilyRelationship(event.target.value)) setIsFamily(true)
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-email">{t.email}</Label>
              <Input id="ref-email" name="contactEmail" type="email" placeholder={t.optional} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-phone">{t.phone}</Label>
              <Input id="ref-phone" name="contactPhone" placeholder={t.optional} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="ref-known">{t.peopleKnownDuration}</Label>
              <Input id="ref-known" name="knownDuration" placeholder={t.peopleKnownDurationExample} />
              {/* Compliance guardrail: Any length is fine; this field informs the invitation and never blocks a reference. */}
              <p className="text-[12px] leading-5 text-text-low">{t.peopleKnownDurationHint}</p>
            </div>
          </div>

          {showFamilyOption ? (
            <button
              type="button"
              onClick={() => familyAllowed && setIsFamily((value) => !value)}
              aria-pressed={isFamily}
              disabled={!familyAllowed}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                isFamily ? "border-[var(--portal-gold)]/60 bg-[var(--portal-gold)]/10" : "border-hairline bg-surface-2/45 hover:bg-surface-2",
                !familyAllowed && "cursor-not-allowed opacity-60"
              )}
            >
              <Checkbox
                id="ref-family"
                name="isFamily"
                checked={isFamily}
                disabled={!familyAllowed}
                onCheckedChange={(value) => setIsFamily(!!value)}
                onClick={(event) => event.stopPropagation()}
                className="size-5"
              />
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  <Users className="size-4" aria-hidden /> {t.familyMember}
                </span>
                <span className="mt-0.5 block text-[12px] leading-5 text-text-low">
                  {composition.familyCapReached
                    ? interpolate(t.peopleFamilyCapReached, { count: composition.maxFamily })
                    : interpolate(t.peopleFamilyAllowed, { family: composition.maxFamily, unrelated: composition.minNonFamily })}
                </span>
              </span>
            </button>
          ) : (
            <p className="rounded-xl border border-hairline bg-surface-2/45 p-3 text-[12px] leading-5 text-text-low">
              {t.peopleNoFamilyAllowed}
            </p>
          )}

          {locale === "es" ? <p className="text-[12px] text-text-low">{messages.common.legalEnglishNotice}</p> : null}
          {state.error ? <p className="text-[14px] text-danger">{state.error}</p> : null}
          <Button type="submit" disabled={pending} className="min-h-11 [background:var(--portal-gold-button)] px-5 text-[var(--portal-navy)]">
            <UserPlus className="size-4" aria-hidden /> {t.addReference}
          </Button>
        </form>
      ) : null}
    </div>
  )
}

export function CohabitantCollector({ caseId, count }: { caseId: string; count: number }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<CollectorState, FormData>(addCohabitant, {})
  const [open, setOpen] = useState(false)
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false)
      toast.success(t.cohabitantAdded)
    }
  }, [state, t.cohabitantAdded])

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-24 w-full items-center justify-between gap-4 rounded-2xl border border-dashed border-[var(--portal-gold)]/60 bg-[var(--portal-gold)]/[0.04] p-5 text-left transition hover:bg-[var(--portal-gold)]/[0.08]"
      >
        <span>
          <span className="portal-title-font block text-[22px] font-medium">{t.addCohabitant}</span>
          <span className="mt-1 block text-[13px] text-text-mid">{t.peopleHouseholdAddHint}</span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full [background:var(--portal-gold-button)] text-[var(--portal-navy)]">
          <Plus className="size-5" aria-hidden />
        </span>
      </button>
    )
  }

  return (
    <form ref={formRef} action={action} className="space-y-4 rounded-2xl border border-[var(--portal-gold)]/35 bg-white p-5 shadow-[0_14px_34px_rgba(10,18,34,.06)]">
      <input type="hidden" name="caseId" value={caseId} />
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[.15em] text-[var(--portal-gold-deep)]">{t.peopleHouseholdFormEyebrow}</p>
          <h3 className="portal-title-font mt-1 text-[24px] font-medium">{t.addCohabitant}</h3>
        </div>
        {count > 0 ? (
          <button type="button" onClick={() => setOpen(false)} className="text-[13px] font-semibold text-text-mid underline">{t.cancel}</button>
        ) : null}
      </div>
      <p className="text-[13px] leading-5 text-text-mid">{t.peopleHouseholdRule}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="cohab-name">{t.name}</Label>
          <Input id="cohab-name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="cohab-rel">{t.relationship}</Label>
          <Input id="cohab-rel" name="relationship" placeholder={t.cohabitantExample} />
        </div>
        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="cohab-email">{t.cohabitantEmail}</Label>
          <Input id="cohab-email" name="contactEmail" type="email" placeholder={t.cohabitantEmailPlaceholder} />
        </div>
      </div>
      {locale === "es" ? <p className="text-[12px] text-text-low">{messages.common.legalEnglishNotice}</p> : null}
      {state.error ? <p className="text-[14px] text-danger">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="min-h-11 [background:var(--portal-gold-button)] px-5 text-[var(--portal-navy)]">
        <UserPlus className="size-4" aria-hidden /> {t.addCohabitant}
      </Button>
    </form>
  )
}
