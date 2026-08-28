"use client"

import { useTransition } from "react"
import Link from "next/link"
import { FileText, Loader2, CheckCircle2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { prepareApplication } from "@/app/portal/requirements/actions"
import { Button } from "@/components/ui/button"
import type { ApplicationReadiness } from "@/lib/forms/application-readiness"

/**
 * Prepare the FULL NYPD application (PD 643-041) as a filled draft PDF from
 * everything we hold. The applicant reviews, signs, and files it themselves — we
 * never file.
 *
 * HONEST-DRAFT gate: we show exactly how complete the draft will be. When required
 * details are still missing, the primary action is "Finish your details" and the
 * prepare button is demoted to an explicitly-labelled partial draft (watermarked,
 * with a missing-field cover sheet). A complete draft downloads clean.
 */
export function PrepareApplicationButton({ caseId, readiness }: { caseId: string; readiness: ApplicationReadiness }) {
  const [pending, start] = useTransition()
  const ready = readiness.ready

  const prepare = (partial: boolean) =>
    start(async () => {
      const r = await prepareApplication(caseId, partial ? { partial: true } : undefined)
      if (r.error || !r.url) {
        toast.error(r.error ?? "Couldn't prepare the application.")
        return
      }
      if (r.overflow) {
        toast.warning(
          "Your five-year history has more than four entries — the extra rows need a continuation sheet. Tell your case team."
        )
      }
      if (r.partial) {
        toast.warning(`Partial draft — ${r.missing} item${r.missing === 1 ? "" : "s"} still missing. It's watermarked DRAFT — INCOMPLETE.`)
      }
      window.open(r.url, "_blank", "noopener,noreferrer")
    })

  return (
    <div className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brass" />
        <h3 className="text-sm font-semibold">Your NYPD application, prepared</h3>
      </div>
      <p className="mt-1 max-w-prose text-sm text-text-mid">
        We fill the official Handgun License Application (PD 643-041) from everything you&apos;ve given us.
        Review it, sign it, and file it yourself at the NYPD portal — the Social Security number and the
        handgun list are left for you to enter at filing.
      </p>

      {/* Readiness signal */}
      <div className="mt-3 rounded-md border border-hairline bg-surface-2/40 p-3">
        {ready ? (
          <p className="flex items-center gap-1.5 text-sm font-medium text-ok">
            <CheckCircle2 className="size-4" /> Ready — {readiness.captured} of {readiness.total} sections complete.
          </p>
        ) : (
          <>
            <p className="flex items-center gap-1.5 text-sm font-medium text-warn">
              <AlertTriangle className="size-4" /> Not ready — {readiness.missing.length} item
              {readiness.missing.length === 1 ? "" : "s"} still needed.
            </p>
            <ul className="mt-2 space-y-1">
              {readiness.missing.map((m) => (
                <li key={m.label} className="text-sm text-text-mid">
                  <Link href={m.href} className="text-signal underline underline-offset-2">
                    {m.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
        {readiness.notes.length > 0 && (
          <ul className="mt-2 space-y-1 border-t border-hairline pt-2">
            {readiness.notes.map((n) => (
              <li key={n.text} className="text-xs text-text-low">
                {n.text}
                {n.href && (
                  <>
                    {" "}
                    <a href={n.href} target="_blank" rel="noopener noreferrer" className="text-signal underline underline-offset-2">
                      {n.hrefLabel ?? "Learn more"}
                    </a>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {ready ? (
          <Button size="sm" className="min-h-[40px]" disabled={pending} onClick={() => prepare(false)}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
            Prepare my application (PDF)
          </Button>
        ) : (
          <>
            <Button asChild size="sm" className="min-h-[40px]">
              <Link href="/portal/details">Finish your details</Link>
            </Button>
            <Button size="sm" variant="ghost" className="min-h-[40px]" disabled={pending} onClick={() => prepare(true)}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}
              Prepare a partial draft anyway
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
