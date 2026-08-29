import Link from "next/link"
import { CheckCircle2, Circle, AlertTriangle } from "lucide-react"
import type { PortalReadiness } from "@/lib/disclosures/readiness"

/**
 * The two-gate readiness summary (Part 9): ready-to-ENTER (data + disclosures +
 * signed) and ready-to-FINALIZE (uploads accepted). Finalize-and-Pay is irreversible,
 * so the second gate is shown plainly and never claimed early.
 */
export function ReadinessCard({ readiness }: { readiness: PortalReadiness }) {
  return (
    <div className="mb-5 space-y-3 rounded-lg border border-hairline bg-card p-4">
      <Gate
        done={readiness.readyToEnter}
        title="Ready to enter"
        doneText="Everything we need to enter your application is in — your case team can start."
        missing={readiness.enterMissing}
      />
      <div className="border-t border-hairline pt-3">
        <Gate
          done={readiness.readyToFinalize}
          title="Ready to finalize & pay"
          doneText="All required uploads are accepted. Finalizing and paying is irreversible — do it when you're sure."
          missing={readiness.finalizeMissing}
          blockedText={readiness.readyToEnter ? undefined : "Finish the items above first."}
        />
      </div>
    </div>
  )
}

function Gate({
  done,
  title,
  doneText,
  missing,
  blockedText,
}: {
  done: boolean
  title: string
  doneText: string
  missing: { label: string; href: string }[]
  blockedText?: string
}) {
  return (
    <div>
      <div className="flex items-center gap-2">
        {done ? <CheckCircle2 className="size-4 text-ok" /> : <Circle className="size-4 text-text-low" />}
        <span className={`text-sm font-semibold ${done ? "text-ok" : "text-foreground"}`}>{title}</span>
      </div>
      {done ? (
        <p className="mt-1 pl-6 text-xs text-text-mid">{doneText}</p>
      ) : blockedText ? (
        <p className="mt-1 pl-6 text-xs text-text-low">{blockedText}</p>
      ) : (
        <ul className="mt-1.5 space-y-1 pl-6">
          {missing.map((m) => (
            <li key={m.label} className="flex items-center gap-1.5 text-xs text-text-mid">
              <AlertTriangle className="size-3 shrink-0 text-warn" />
              <Link href={m.href} className="text-signal underline underline-offset-2">
                {m.label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
