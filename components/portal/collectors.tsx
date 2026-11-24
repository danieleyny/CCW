"use client"

import { useActionState, useEffect, useRef, useState, useTransition } from "react"
import { Trash2, Plus, Users } from "lucide-react"
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
  contact_email: string | null
  affidavit_status: string
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [pending, start] = useTransition()
  const { messages } = usePortalI18n()
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => start(onDelete)}
      aria-label={messages.ui.remove}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

function RemoveCohabitantButton({
  cohabitant,
  caseId,
}: {
  cohabitant: Pick<CohabitantRow, "id" | "name">
  caseId: string
}) {
  const [pending, start] = useTransition()
  const { locale } = usePortalI18n()

  function remove() {
    const prompt = locale === "es"
      ? `¿Eliminar a ${cohabitant.name} de su hogar? Su enlace seguro dejará de funcionar.`
      : `Remove ${cohabitant.name} from your household? Their secure affidavit link will stop working.`
    if (!window.confirm(prompt)) return

    start(async () => {
      const result = await deleteCohabitant(cohabitant.id, caseId)
      if (result.error) {
        toast.error(result.error)
        return
      }
      if (result.warning) toast.warning(result.warning)
      else {
        toast.success(locale === "es"
          ? `${cohabitant.name} fue eliminado y se actualizaron los requisitos del hogar.`
          : `${cohabitant.name} removed and your household requirements were updated.`)
      }
    })
  }

  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={remove}
      aria-label={locale === "es" ? `Eliminar a ${cohabitant.name} del hogar` : `Remove ${cohabitant.name} from household`}
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

/** Relationship words that make someone a family member — typing one auto-marks
 *  the family box so the applicant doesn't have to remember the rule. */
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
function isFamilyRelationship(v: string): boolean {
  const s = v.toLowerCase()
  return FAMILY_WORDS.some((w) => new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(s))
}

export function ReferenceCollector({
  caseId,
  references,
  required = 4,
}: {
  caseId: string
  references: ReferenceRow[]
  /** How many references this track needs (2 for carry_guard, else 4). */
  required?: number
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<CollectorState, FormData>(addReference, {})
  const [isFamily, setIsFamily] = useState(false)
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      // Reset the form after a successful server add — a legitimate response to an
      // async action result, not derivable during render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsFamily(false)
      toast.success(t.referenceAdded)
    }
  }, [state, t.referenceAdded])

  const atMax = references.length >= required
  // The ONE composition rule (38 RCNY §5-05(b)(8)) drives the family control, the
  // success banner, and the send-back message — same rule the server enforces.
  const comp = referenceComposition(references, required)
  const showFamilyOption = comp.maxFamily > 0
  const familyAllowed = showFamilyOption && !comp.familyCapReached

  // Never leave a disallowed "family" selection armed (e.g. after the cap fills).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!familyAllowed && isFamily) setIsFamily(false)
  }, [familyAllowed, isFamily])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {required <= 2 ? (
          <>
            You need <strong>{required}</strong> character references — neither may be family, and
            neither may be in law enforcement. All must be lawful US residents.
          </>
        ) : (
          <>
            You need <strong>{required}</strong> character references — 2 may be family; 2 must be
            unrelated and not in law enforcement. All must be lawful US residents.
          </>
        )}
      </p>
      {locale === "es" ? <p className="text-xs text-text-low">{messages.common.legalEnglishNotice}</p> : null}

      <ul className="space-y-2">
        {references.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.relationship ?? "—"} · {r.is_family ? t.family : t.unrelated}
                {r.notarized ? ` · ${t.notarized}` : ""}
              </div>
            </div>
            <DeleteButton onDelete={() => deleteReference(r.id, caseId)} />
          </li>
        ))}
        {references.length === 0 && (
          <li className="text-sm text-muted-foreground">{t.noReferences}</li>
        )}
      </ul>

      {comp.complete ? (
        // Success is gated on COMPOSITION, not just count — an invalid set (too many
        // family) never shows the "all done" banner.
        <p className="rounded-md border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
          {interpolate(t.referencesAdded, { count: required })}
        </p>
      ) : atMax && comp.problem ? (
        // Count is met but the composition is invalid — tell them exactly why and let
        // them delete a family reference above.
        <p className="rounded-md border border-warn/30 bg-warn/10 p-3 text-sm text-warn">{comp.problem}</p>
      ) : (
        <form ref={formRef} action={action} className="space-y-3 rounded-lg border bg-card p-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="text-sm font-medium">{interpolate(t.addReferenceCount, { current: references.length, required })}</div>
          <div className="grid gap-3 sm:grid-cols-2">
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
                onChange={(e) => {
                  // Typing a family word (Dad, Mother, Sister…) auto-marks family.
                  if (isFamilyRelationship(e.target.value)) setIsFamily(true)
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
          </div>
          {/* How long they've known the applicant — captured here, pre-filled into the
              reference's own invitation, and makes for a stronger letter. NEVER a block:
              38 RCNY §5-03 sets no minimum acquaintance period (finding 9). */}
          <div className="space-y-1.5">
            <Label htmlFor="ref-known">How long have you known them?</Label>
            <Input id="ref-known" name="knownDuration" placeholder="e.g. 8 years, since college" />
            <p className="text-[11px] text-text-low">
              Any length is fine. Investigators do weigh how well a reference knows you, so a longer
              acquaintance makes for a stronger letter — we&apos;ll add this to their invitation.
            </p>
          </div>
          {/* The family control appears ONLY on a track that allows a family
              reference (Carry Guard / Premises allow none, so it isn't offered at
              all). Once the family cap is full, it's disabled with the reason. */}
          {showFamilyOption ? (
            <button
              type="button"
              onClick={() => familyAllowed && setIsFamily((v) => !v)}
              aria-pressed={isFamily}
              disabled={!familyAllowed}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors ${
                isFamily
                  ? "border-brass/60 bg-brass/10 ring-1 ring-brass/25"
                  : "border-hairline bg-surface-2/40 hover:bg-surface-2"
              } ${!familyAllowed ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <Checkbox
                id="ref-family"
                name="isFamily"
                checked={isFamily}
                disabled={!familyAllowed}
                onCheckedChange={(v) => setIsFamily(!!v)}
                onClick={(e) => e.stopPropagation()}
                className="size-5"
              />
              <span className="min-w-0">
                <span className={`flex items-center gap-1.5 text-sm font-medium ${isFamily ? "text-brass-bright" : "text-foreground"}`}>
                  <Users className="size-3.5" /> {t.familyMember}
                </span>
                <span className="mt-0.5 block text-xs text-text-low">
                  {comp.familyCapReached
                    ? `You already have ${comp.maxFamily} family reference${comp.maxFamily === 1 ? "" : "s"} — this one must be unrelated.`
                    : `Up to ${comp.maxFamily} of your references may be family; at least 2 must be unrelated.`}
                </span>
              </span>
            </button>
          ) : (
            <p className="rounded-lg border border-hairline bg-surface-2/40 p-3 text-xs text-text-low">
              For this licence, none of your references may be family — each must be someone unrelated to you.
            </p>
          )}
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            <Plus className="size-4" /> {t.addReference}
          </Button>
        </form>
      )}
    </div>
  )
}

export function CohabitantCollector({
  caseId,
  cohabitants,
}: {
  caseId: string
  cohabitants: CohabitantRow[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<CollectorState, FormData>(addCohabitant, {})
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      if (state.warning) toast.warning(state.warning)
      else toast.success(t.cohabitantAdded)
    }
  }, [state, t.cohabitantAdded])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        List every person <strong>18 or older</strong> living in your home. Each needs a notarized
        affidavit.
      </p>
      {locale === "es" ? <p className="text-xs text-text-low">{messages.common.legalEnglishNotice}</p> : null}

      <ul className="space-y-2">
        {cohabitants.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">
                {c.relationship ?? "—"}{c.contact_email ? ` · ${c.contact_email}` : ""}
              </div>
            </div>
            <RemoveCohabitantButton cohabitant={c} caseId={caseId} />
          </li>
        ))}
        {cohabitants.length === 0 && (
          <li className="text-sm text-muted-foreground">{t.noCohabitants}</li>
        )}
      </ul>

      <form ref={formRef} action={action} className="space-y-3 rounded-lg border bg-card p-4">
        <input type="hidden" name="caseId" value={caseId} />
        <div className="text-sm font-medium">{t.addCohabitant}</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cohab-name">{t.name}</Label>
            <Input id="cohab-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cohab-rel">{t.relationship}</Label>
            <Input id="cohab-rel" name="relationship" placeholder={t.cohabitantExample} required />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="cohab-email">{t.cohabitantEmail}</Label>
            <Input id="cohab-email" name="contactEmail" type="email" placeholder={t.cohabitantEmailPlaceholder} required />
          </div>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" /> {t.addCohabitant}
        </Button>
      </form>
    </div>
  )
}
