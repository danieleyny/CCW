"use client"

import Link from "next/link"
import { Check, LockKeyhole } from "lucide-react"
import type { PortalReadiness, ReadinessItem } from "@/lib/disclosures/readiness"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { cn } from "@/lib/utils"

/**
 * The two portal-readiness gates. The computation remains in
 * computePortalReadiness; this component only makes that result legible.
 */
export function ReadinessCard({ readiness }: { readiness: PortalReadiness }) {
  const { messages } = usePortalI18n()
  const t = messages.ui

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2">
      <Gate
        step="1"
        title={t.checklistReadyToEnter}
        done={readiness.readyToEnter}
        doneText={t.checklistReadyToEnterDone}
        missing={readiness.enterMissing}
        incompleteText={interpolate(t.checklistEnterThingsLeft, {
          count: readiness.enterMissing.length,
          things: readiness.enterMissing.length === 1 ? t.checklistThing : t.checklistThings,
        })}
      />

      <div className="hidden sm:block">
        <Gate
          step="2"
          title={t.checklistReadyToFinalize}
          done={readiness.readyToFinalize}
          doneText={t.checklistReadyToFinalizeDone}
          missing={readiness.finalizeMissing}
          blocked={!readiness.readyToEnter}
          incompleteText={t.checklistFinalizeOpen}
          warning={t.checklistFinalizeWarning}
        />
      </div>
    </div>
  )
}

/** On phones gate two moves below the list, where it reads as the next gate. */
export function ReadinessFinalizeRow({ readiness }: { readiness: PortalReadiness }) {
  const { messages } = usePortalI18n()
  const t = messages.ui

  return (
    <div className="mt-5 sm:hidden">
      <Gate
        step="2"
        title={t.checklistReadyToFinalize}
        done={readiness.readyToFinalize}
        doneText={t.checklistReadyToFinalizeDone}
        missing={readiness.finalizeMissing}
        blocked={!readiness.readyToEnter}
        incompleteText={t.checklistFinalizeOpen}
        warning={t.checklistFinalizeWarning}
        compact
      />
    </div>
  )
}

function Gate({
  step,
  title,
  done,
  doneText,
  missing,
  blocked = false,
  incompleteText,
  warning,
  compact = false,
}: {
  step: string
  title: string
  done: boolean
  doneText: string
  missing: ReadinessItem[]
  blocked?: boolean
  incompleteText: string
  warning?: string
  compact?: boolean
}) {
  const { messages } = usePortalI18n()
  const t = messages.ui

  return (
    <section
      className={cn(
        "h-full rounded-[18px] border p-4 shadow-[0_12px_34px_-28px_rgba(10,18,34,.45)]",
        done
          ? "border-ok/25 bg-ok/[0.055]"
          : blocked
            ? "border-hairline bg-surface-2/80"
            : "border-hairline bg-white",
        compact && "rounded-2xl p-3.5"
      )}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full border font-mono text-[11px] font-semibold",
            done
              ? "border-ok bg-ok text-white"
              : blocked
                ? "border-hairline-strong bg-white text-text-low"
                : "border-brass/60 bg-brass/10 text-brass-bright"
          )}
        >
          {done ? <Check className="size-4" strokeWidth={2.5} /> : blocked ? <LockKeyhole className="size-3.5" /> : step}
        </span>

        <div className="min-w-0 flex-1">
          <h2 className={cn("text-[15px] font-semibold", done && "text-ok", blocked && "text-text-mid")}>{title}</h2>
          <p className="mt-1 text-[13px] leading-5 text-text-mid">
            {done ? doneText : blocked ? t.checklistFinalizeBlocked : incompleteText}
          </p>

          {!done && !blocked && missing.length > 0 ? (
            <ul className="mt-3 flex flex-wrap gap-1.5" aria-label={t.checklistMissingItems}>
              {missing.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  <Link
                    href={item.href}
                    className="inline-flex min-h-8 items-center rounded-full border border-brass/30 bg-brass/[0.08] px-3 text-[12px] font-medium text-brass-bright transition-colors hover:border-brass/60 hover:bg-brass/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/35"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          {warning && (done || !blocked) ? (
            <p className="mt-2.5 border-t border-hairline pt-2.5 text-[11px] leading-4 text-text-low">{warning}</p>
          ) : null}
        </div>
      </div>
    </section>
  )
}
