import Link from "next/link"

export type PortalHomeHeroChoice = {
  title: string
  detail: string
}

export type PortalHomeHeroProps = {
  eyebrow: string
  title: string
  detail: string
  variant?: "default" | "waiting" | "licensed" | "denied"
  action?: { label: string; href: string }
  secondary?: { label: string; href: string }
  progress?: { done: number; total: number; label: string; caption: string }
  choices?: PortalHomeHeroChoice[]
}

export function PortalHomeHero({
  eyebrow,
  title,
  detail,
  variant = "default",
  action,
  secondary,
  progress,
  choices,
}: PortalHomeHeroProps) {
  const percentage = progress?.total
    ? Math.min(100, Math.max(0, (progress.done / progress.total) * 100))
    : 0
  const radius = 72
  const circumference = 2 * Math.PI * radius
  const dash = circumference * (percentage / 100)

  return (
    <section className={`portal-home-hero portal-home-hero-${variant}`}>
      <div className="portal-home-hero-copy">
        <p className="portal-t-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="portal-home-hero-detail">{detail}</p>

        {choices?.length ? (
          <div className="portal-home-hero-choices">
            {choices.map((choice) => (
              <div key={choice.title}>
                <strong>{choice.title}</strong>
                <span>{choice.detail}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="portal-home-hero-actions">
          {action ? (
            <Link
              href={action.href}
              className={variant === "waiting" ? "portal-home-hero-action-outline" : "portal-home-hero-action"}
            >
              {action.label}
            </Link>
          ) : null}
          {secondary ? (
            <Link href={secondary.href} className="portal-home-hero-secondary">
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>

      {progress && progress.total > 0 ? (
        <div className="portal-home-progress">
          <div
            className="portal-home-progress-dial"
            role="img"
            aria-label={progress.label}
          >
            <svg viewBox="0 0 170 170" aria-hidden="true">
              <circle cx="85" cy="85" r={radius} className="portal-home-progress-track" />
              <circle
                cx="85"
                cy="85"
                r={radius}
                className="portal-home-progress-value"
                strokeDasharray={`${dash} ${circumference - dash}`}
              />
            </svg>
            <span>
              <strong>{progress.done}</strong>
              <small>/ {progress.total}</small>
              <em>{progress.caption}</em>
            </span>
          </div>
          <div
            className="portal-home-progress-mobile"
            role="img"
            aria-label={progress.label}
          >
            <span>{progress.done}/{progress.total}</span>
            <i><b style={{ width: `${percentage}%` }} /></i>
          </div>
        </div>
      ) : null}
    </section>
  )
}
