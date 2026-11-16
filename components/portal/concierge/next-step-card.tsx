import Link from "next/link"
import { ArrowRight, CalendarClock, Compass } from "lucide-react"

export function NextStepCard({
  title,
  description,
  actionLabel,
  href,
  then,
  children,
}: {
  title: string
  description: string
  actionLabel?: string
  href?: string
  then?: string
  children?: React.ReactNode
}) {
  return (
    <section
      id="next-step"
      className="concierge-next-step scroll-mt-24"
      aria-labelledby={children ? undefined : "next-step-title"}
      aria-label={children ? "Your next step" : undefined}
    >
      <span className="concierge-next-icon" aria-hidden>
        {children ? <CalendarClock className="size-6" /> : <Compass className="size-6" />}
      </span>
      <div className="concierge-next-copy">
        <p className="portal-t-eyebrow text-brass-deep">Your next step</p>
        {children ? (
          <div className="concierge-next-action">{children}</div>
        ) : (
          <>
            <h2 id="next-step-title" className="concierge-next-title">{title}</h2>
            <p className="concierge-next-description">{description}</p>
          </>
        )}
        {!children && href && actionLabel ? (
          <Link href={href} className="concierge-next-button">
            {actionLabel} <ArrowRight className="size-4" aria-hidden />
          </Link>
        ) : null}
        {then ? <p className="concierge-next-then">Then: {then}</p> : null}
      </div>
    </section>
  )
}

export function MobileNextStepBar({ title, label, href }: { title: string; label: string; href: string }) {
  return (
    <aside className="concierge-mobile-next" aria-label="Next step">
      <span className="min-w-0">
        <small>Next</small>
        <strong>{title}</strong>
      </span>
      <Link href={href}>
        {label} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </aside>
  )
}
