"use client"

import { ArrowRight, CheckCircle2, Loader2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StickyActionBar({
  Icon,
  title,
  subline,
  pending,
  error,
  detail,
  desktopLabel,
  mobileLabel = "Continue",
  pendingLabel,
  success = false,
}: {
  Icon: LucideIcon
  title: string
  subline: string
  pending: boolean
  error?: string
  detail?: string
  desktopLabel?: string
  mobileLabel?: string
  pendingLabel?: string
  success?: boolean
}) {
  const label = desktopLabel ?? `Continue with ${title}`

  return (
    <section
      className="portal-sticky-bar"
      data-success={success}
      role="region"
      aria-label="Next step"
      aria-live="polite"
    >
      <span className="portal-sticky-icon" aria-hidden>
        {success ? (
          <CheckCircle2 size={21} strokeWidth={1.8} />
        ) : (
          <Icon size={21} strokeWidth={1.7} />
        )}
      </span>
      <span className="min-w-0">
        <span className="portal-sticky-title portal-t-bar block truncate">
          {title}
          {detail && <span className="portal-sticky-detail"> · {detail}</span>}
        </span>
        <span className="portal-sticky-sub block truncate">{subline}</span>
        {error && <span className="portal-sticky-error block">Couldn&apos;t save — try again</span>}
      </span>
      {!success && (
        <Button
          className="portal-sticky-button"
          variant="gold"
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden />
              {pendingLabel ?? "Saving…"}
            </>
          ) : (
            <>
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{mobileLabel}</span>
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </Button>
      )}
    </section>
  )
}
