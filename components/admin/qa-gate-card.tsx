"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ShieldCheck, ShieldAlert } from "lucide-react"
import { signPreFilingQa } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * V3-P2.4 — the CP-5 gate, visible: what still blocks filing, and the named
 * sign-off once everything clears. The same checks are enforced server-side in
 * setCaseStage — this card is the honest mirror of that gate.
 */
export function QaGateCard({
  caseId,
  blockers,
  readyForSignOff,
  signedOffBy,
  signedOffAt,
  trainerReviewed,
}: {
  caseId: string
  blockers: string[]
  readyForSignOff: boolean
  signedOffBy: string | null
  signedOffAt: string | null
  /** How much of the concierge-safe work a trainer has already checked. */
  trainerReviewed?: { done: number; total: number } | null
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const signed = !!signedOffBy

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        signed ? "border-ok/30 bg-ok/8" : readyForSignOff ? "border-signal/30 bg-signal/5" : "border-warn/30 bg-warn/8"
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold">
        {signed ? <ShieldCheck className="size-4 text-ok" /> : <ShieldAlert className="size-4 text-warn" />}
        Pre-filing QA gate (CP-5)
      </div>

      {trainerReviewed && trainerReviewed.total > 0 && (
        // A signal into the gate, never a substitute for it: the blocker list
        // below and the named sign-off are still what decide.
        <p className="mt-1 text-xs text-text-mid">
          Trainer has reviewed {trainerReviewed.done} of {trainerReviewed.total} items they can see.
          Disclosures are reviewed here, not by them.
        </p>
      )}

      {signed ? (
        <p className="mt-1 text-sm text-ok">
          Signed off by {signedOffBy}
          {signedOffAt && ` · ${new Date(signedOffAt).toLocaleDateString()}`} — this case may enter
          Application Assembled / Filed.
        </p>
      ) : readyForSignOff ? (
        <div className="mt-1 space-y-2 text-sm">
          <p className="text-signal">Every check passes — a named sign-off is the last step before assembly.</p>
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              start(async () => {
                const res = await signPreFilingQa(caseId)
                if (!res.ok) toast.error("Gate re-check failed", { description: res.blockers.join(" · ") })
                else {
                  toast.success("QA signed off — recorded in the activity log")
                  router.refresh()
                }
              })
            }
          >
            <ShieldCheck className="size-3.5" /> Sign off pre-filing QA
          </Button>
        </div>
      ) : (
        <ul className="mt-1 list-disc pl-5 text-sm text-warn">
          {blockers.map((b) => (
            <li key={b}>{b}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
