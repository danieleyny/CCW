import Link from "next/link"
import { ArrowRight, CalendarClock, Compass } from "lucide-react"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

export function NextStepCard({
  title,
  description,
  actionLabel,
  href,
  then,
  children,
  eyebrow = "Your next step",
}: {
  title: string
  description: string
  actionLabel?: string
  href?: string
  then?: string
  children?: React.ReactNode
  eyebrow?: string
}) {
  const { messages } = usePortalI18n()
  const t = messages.concierge
  return (
    <section
      id="next-step"
      className="concierge-next-step scroll-mt-24"
      aria-labelledby={children ? undefined : "next-step-title"}
      aria-label={children ? t.nextStep : undefined}
    >
      <span className="concierge-next-icon" aria-hidden>
        {children ? <CalendarClock className="size-6" /> : <Compass className="size-6" />}
      </span>
      <div className="concierge-next-copy">
        <p className="portal-t-eyebrow text-brass-deep">{eyebrow}</p>
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
        {then ? <p className="concierge-next-then">{t.then}: {then}</p> : null}
      </div>
    </section>
  )
}

export function MobileNextStepBar({ title, label, href }: { title: string; label: string; href: string }) {
  const { messages } = usePortalI18n()
  return (
    <aside className="concierge-mobile-next" aria-label={messages.concierge.nextStep}>
      <span className="min-w-0">
        <small>{messages.concierge.next}</small>
        <strong>{title}</strong>
      </span>
      <Link href={href}>
        {label} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </aside>
  )
}
