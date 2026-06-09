"use client"

import { useActionState, useEffect, useRef, useTransition } from "react"
import { Trash2, Plus } from "lucide-react"
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

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="icon"
      variant="ghost"
      className="size-8 text-muted-foreground hover:text-destructive"
      disabled={pending}
      onClick={() => start(onDelete)}
      aria-label="Remove"
    >
      <Trash2 className="size-4" />
    </Button>
  )
}

export function ReferenceCollector({
  caseId,
  references,
}: {
  caseId: string
  references: ReferenceRow[]
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const [state, action, pending] = useActionState<CollectorState, FormData>(addReference, {})

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      toast.success("Reference added")
    }
  }, [state])

  const atMax = references.length >= 4

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        You need <strong>4</strong> character references — 2 may be family; 2 must be unrelated and
        not in law enforcement. All must be lawful US residents.
      </p>

      <ul className="space-y-2">
        {references.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{r.name}</div>
              <div className="text-xs text-muted-foreground">
                {r.relationship ?? "—"} · {r.is_family ? "Family" : "Unrelated"}
                {r.notarized ? " · notarized" : ""}
              </div>
            </div>
            <DeleteButton onDelete={() => deleteReference(r.id, caseId)} />
          </li>
        ))}
        {references.length === 0 && (
          <li className="text-sm text-muted-foreground">No references yet.</li>
        )}
      </ul>

      {atMax ? (
        <p className="rounded-md border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
          All 4 references added. Remember to get each one notarized.
        </p>
      ) : (
        <form ref={formRef} action={action} className="space-y-3 rounded-lg border bg-card p-4">
          <input type="hidden" name="caseId" value={caseId} />
          <div className="text-sm font-medium">Add a reference ({references.length}/4)</div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ref-name">Name</Label>
              <Input id="ref-name" name="name" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-rel">Relationship</Label>
              <Input id="ref-rel" name="relationship" placeholder="e.g. Friend, Sibling" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-email">Email</Label>
              <Input id="ref-email" name="contactEmail" type="email" placeholder="optional" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ref-phone">Phone</Label>
              <Input id="ref-phone" name="contactPhone" placeholder="optional" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="ref-family" name="isFamily" />
            <Label htmlFor="ref-family" className="text-sm font-normal">
              This person is a family member
            </Label>
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" size="sm" disabled={pending}>
            <Plus className="size-4" /> Add reference
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

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset()
      toast.success("Cohabitant added")
    }
  }, [state])

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        List every person <strong>18 or older</strong> living in your home. Each needs a notarized
        affidavit.
      </p>

      <ul className="space-y-2">
        {cohabitants.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <div className="text-sm font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">{c.relationship ?? "—"}</div>
            </div>
            <DeleteButton onDelete={() => deleteCohabitant(c.id, caseId)} />
          </li>
        ))}
        {cohabitants.length === 0 && (
          <li className="text-sm text-muted-foreground">No cohabitants listed.</li>
        )}
      </ul>

      <form ref={formRef} action={action} className="space-y-3 rounded-lg border bg-card p-4">
        <input type="hidden" name="caseId" value={caseId} />
        <div className="text-sm font-medium">Add a cohabitant</div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="cohab-name">Name</Label>
            <Input id="cohab-name" name="name" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cohab-rel">Relationship</Label>
            <Input id="cohab-rel" name="relationship" placeholder="e.g. Spouse, Roommate" />
          </div>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" size="sm" disabled={pending}>
          <Plus className="size-4" /> Add cohabitant
        </Button>
      </form>
    </div>
  )
}
