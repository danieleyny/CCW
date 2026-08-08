import Link from "next/link"
import { Check, AlertTriangle, ArrowRight, Clock } from "lucide-react"
import type { GoLiveStep } from "@/lib/instructors/profile"
import { cn } from "@/lib/utils"

/**
 * The prominent RED "you're not live yet" checklist — every remaining go-live
 * step, done ✓ / to-do in red, with a fix link (or "waiting on admin" for the
 * steps only an admin can clear). Rendered only while the instructor is not live.
 */
export function GoLiveChecklist({ steps, remaining }: { steps: GoLiveStep[]; remaining: number }) {
  return (
    <div className="rounded-lg border-2 border-danger/60 bg-danger/8 p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="size-5 shrink-0 text-danger" />
        <h2 className="text-base font-bold text-danger">You&apos;re not live yet — applicants can&apos;t see you</h2>
      </div>
      <p className="mt-1 text-sm text-text-mid">
        Finish {remaining === 1 ? "this step" : `these ${remaining} steps`} to appear in applicant searches and
        receive requests.
      </p>
      <ul className="mt-3 space-y-2">
        {steps.map((s) => (
          <li
            key={s.key}
            className={cn(
              "flex items-start gap-3 rounded-md border p-3",
              s.done ? "border-ok/30 bg-ok/5" : "border-danger/40 bg-danger/5"
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                s.done ? "bg-ok/20 text-ok" : "bg-danger/20"
              )}
            >
              {s.done ? <Check className="size-3.5" /> : <span className="size-1.5 rounded-full bg-danger" />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className={cn("text-sm font-medium", s.done ? "text-text-low line-through" : "text-foreground")}>
                  {s.label}
                </span>
                {!s.done &&
                  (s.waiting ? (
                    <span className="inline-flex items-center gap-1 text-xs text-text-low">
                      <Clock className="size-3" /> Waiting on admin review
                    </span>
                  ) : s.fixHref ? (
                    <Link
                      href={s.fixHref}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-danger hover:underline"
                    >
                      Fix <ArrowRight className="size-3" />
                    </Link>
                  ) : null)}
              </div>
              {!s.done && <p className="mt-0.5 text-xs text-text-low">{s.why}</p>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
