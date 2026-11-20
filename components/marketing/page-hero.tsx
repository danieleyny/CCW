/**
 * The shared interior PAGE HERO, restyled to marketing v2 — it now renders the
 * dark `.guide-hero` from the interior article template (case-path
 * decoration lives in marketing-v2.css). The prop API is unchanged, so every
 * content page that imports it inherits the new look without edits.
 *
 * The spec styles the headline through `.guide-hero h2`; real pages need a
 * single semantic <h1>, so that one declaration is replicated inline here rather
 * than by touching the shared stylesheet.
 */
import { GuideHeroPath } from "@/components/marketing/guide-hero-path"

const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 840,
  fontFamily: "var(--display)",
  fontSize: "clamp(44px, 5.4vw, 80px)",
  fontWeight: 500,
  lineHeight: 1.02,
  letterSpacing: "-0.035em",
}

export function PageHero({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string
  title: string
  subtitle?: string
}) {
  return (
    <header className="guide-hero">
      <GuideHeroPath />
      <div className="guide-hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 style={heroTitleStyle}>{title}</h1>
        {subtitle && <p className="guide-hero-lede">{subtitle}</p>}
      </div>
    </header>
  )
}
