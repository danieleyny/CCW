"use client"

import { ArrowRight, Loader2, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export function StickyActionBar({
  Icon,
  title,
  subline,
  pending,
  error,
}: {
  Icon: LucideIcon
  title: string
  subline: string
  pending: boolean
  error?: string
}) {
  return (
    <section
      className="portal-sticky-bar"
      role="region"
      aria-label="Next step"
      aria-live="polite"
    >
      <span className="portal-sticky-icon" aria-hidden>
        <Icon size={21} strokeWidth={1.7} />
      </span>
      <span className="min-w-0">
        <span className="portal-sticky-title portal-t-bar block truncate">{title}</span>
        <span className="portal-sticky-sub block truncate">{subline}</span>
        {error && <span className="portal-sticky-error block">Couldn&apos;t save — try again</span>}
      </span>
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
            Saving…
          </>
        ) : (
          <>
            <span className="hidden sm:inline">Continue with {title}</span>
            <span className="sm:hidden">Continue</span>
            <ArrowRight className="size-4" aria-hidden />
          </>
        )}
      </Button>
    </section>
  )
}
