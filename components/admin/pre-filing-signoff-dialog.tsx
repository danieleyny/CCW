"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, ShieldCheck, TriangleAlert } from "lucide-react"
import { signPreFilingQa } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { trackEvent } from "@/lib/analytics"
import { cn } from "@/lib/utils"

const CHECK_NAMES = ["Checklist items", "Disclosures", "Training", "References", "Reference mix", "Photo", "Track"]

function plainBlocker(blocker: string) {
  if (/blocking requirement/i.test(blocker)) return "Checklist items changed after this page loaded. Reopen the checklist to review what is still needed."
  return blocker.replace(/\b[A-Z]{2,4}-\d{2,3}\b/g, "a checklist item")
}

export function PreFilingSignoffDialog({
  caseId,
  applicant,
  staffName,
  serviceMode,
  label = "Review & sign",
  className,
}: {
  caseId: string
  applicant: string
  staffName: string
  serviceMode: "concierge" | "self_guided" | null
  label?: string
  className?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [attested, setAttested] = useState(false)
  const [state, setState] = useState<"review" | "refused" | "success">("review")
  const [blockers, setBlockers] = useState<string[]>([])
  const [permissionError, setPermissionError] = useState(false)
  const [signedAt, setSignedAt] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const nextStep = serviceMode === "self_guided"
    ? "Applicant files on the NYPD portal."
    : "Our team assembles and quality-checks the packet; the applicant files with our guidance."
  const filingParty = serviceMode === "self_guided"
    ? "the applicant to file"
    : "the applicant to file with our team’s guidance"

  function changeOpen(next: boolean) {
    if (pending) return
    setOpen(next)
    if (next) {
      setState("review")
      setBlockers([])
      setPermissionError(false)
      setAttested(false)
      setSignedAt(null)
      trackEvent("admin_signoff_dialog_opened")
    }
  }

  function confirm() {
    if (!attested || pending) return
    startTransition(async () => {
      try {
        const result = await signPreFilingQa(caseId)
        if (!result.ok) {
          const nextBlockers = result.blockers.map(plainBlocker)
          setBlockers(nextBlockers)
          setState("refused")
          trackEvent("admin_signoff_refused", { blocker_count: nextBlockers.length })
          return
        }
        setSignedAt(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }))
        setState("success")
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        setPermissionError(/permission|forbidden|unauthor|staff/i.test(message))
        setBlockers(["The server could not record this sign-off. Nothing was changed."])
        setState("refused")
        trackEvent("admin_signoff_refused", { blocker_count: 1 })
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogTrigger asChild>
        <Button className={cn("bg-[#14254A] text-white hover:bg-[#1D3261]", className)}>
          <ShieldCheck className="size-4" /> {label}
        </Button>
      </DialogTrigger>
      <DialogContent
        manualPosition
        className="inset-x-0 bottom-0 max-h-[92dvh] max-w-none overflow-y-auto rounded-b-none border-[#D9B25F]/30 bg-white p-5 text-[#101828] sm:top-1/2 sm:left-1/2 sm:bottom-auto sm:w-[560px] sm:max-w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:p-6"
        onEscapeKeyDown={(event) => pending && event.preventDefault()}
        onPointerDownOutside={(event) => pending && event.preventDefault()}
      >
        {state === "review" && (
          <>
            <DialogHeader>
              <DialogTitle className="font-[family-name:var(--font-title)] text-2xl leading-tight">Sign off {applicant}&apos;s packet</DialogTitle>
              <DialogDescription>We re-run all 7 checks when you confirm. No case stage changes here.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-[#21845A]/25 bg-[#EAF7F0] p-4">
              <p className="flex items-center gap-2 font-semibold text-[#16643F]"><CheckCircle2 className="size-5" /> 7 of 7 checks pass right now</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {CHECK_NAMES.map((name, index) => <span key={name} className="rounded-full border border-[#21845A]/20 bg-white px-2 py-1 text-[11px] text-[#16643F]">{index + 1}. {name}</span>)}
              </div>
            </div>
            <label className="flex cursor-pointer gap-3 rounded-xl border border-black/10 bg-[#FAFAF8] p-4 text-sm leading-6">
              <input type="checkbox" checked={attested} onChange={(event) => setAttested(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#14254A]" />
              <span>I reviewed this packet. It is complete, the disclosures are candid, and nothing has been left out — ready for {filingParty}.</span>
            </label>
            <DialogFooter className="border-black/10 bg-[#F7F5EF]">
              <DialogClose asChild><Button variant="outline" disabled={pending}>Cancel</Button></DialogClose>
              <Button disabled={!attested || pending} onClick={confirm} className="bg-[#14254A] text-white hover:bg-[#1D3261]">
                <ShieldCheck className="size-4" /> {pending ? "Re-running checks…" : `Sign as ${staffName}`}
              </Button>
            </DialogFooter>
          </>
        )}

        {state === "refused" && (
          <>
            <DialogHeader>
              <div className="mb-1 grid size-11 place-items-center rounded-full bg-[#FEF3F2] text-[#B42318]"><TriangleAlert className="size-5" /></div>
              <DialogTitle className="font-[family-name:var(--font-title)] text-2xl">Can&apos;t sign off yet</DialogTitle>
              <DialogDescription>{permissionError ? "You don't have permission to sign off." : "The server re-ran the gate and found a change. Nothing was signed."}</DialogDescription>
            </DialogHeader>
            {!permissionError && <ul role="alert" className="space-y-2 rounded-xl border border-[#FDA29B] bg-[#FEF3F2] p-4 text-sm text-[#912018]">{blockers.map((blocker) => <li key={blocker}>• {blocker}</li>)}</ul>}
            <DialogFooter className="border-black/10 bg-[#F7F5EF]">
              <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
              {!permissionError && <Button asChild><Link href={`/admin/cases/${caseId}?tab=checklist`}>Open checklist</Link></Button>}
            </DialogFooter>
          </>
        )}

        {state === "success" && (
          <>
            <DialogHeader>
              <div className="mb-1 grid size-11 place-items-center rounded-full bg-[#EAF7F0] text-[#21845A]"><CheckCircle2 className="size-6" /></div>
              <DialogTitle className="font-[family-name:var(--font-title)] text-2xl">Signed off</DialogTitle>
              <DialogDescription>Signed by {staffName} · {signedAt}. Recorded in the case activity.</DialogDescription>
            </DialogHeader>
            <div className="rounded-xl border border-[#D9B25F]/30 bg-[#FBF7EC] p-4 text-sm"><strong>Next:</strong> {nextStep}</div>
            <DialogFooter className="border-black/10 bg-[#F7F5EF]">
              <DialogClose asChild><Button variant="outline">Back to queue</Button></DialogClose>
              <Button asChild><Link href={`/admin/cases/${caseId}`}>Open case</Link></Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
