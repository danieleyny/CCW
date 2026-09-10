/**
 * The shared interior PAGE HERO, restyled to marketing v2 — it now renders the
 * dark `.guide-hero` from the interior article template (spectral-ribbon
 * decoration lives in marketing-v2.css). The prop API is unchanged, so every
 * content page that imports it inherits the new look without edits.
 *
 * The spec styles the headline through `.guide-hero h2`; real pages need a
 * single semantic <h1>, so that one declaration is replicated inline here rather
 * than by touching the shared stylesheet.
 */
const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 840,
  fontFamily: "var(--display)",
  fontSize: "clamp(46px, 6vw, 78px)",
  fontWeight: 500,
  lineHeight: 0.94,
  letterSpacing: "-0.06em",
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
      <div className="guide-hero-copy">
        <p className="eyebrow">{eyebrow}</p>
        <h1 style={heroTitleStyle}>{title}</h1>
        {subtitle && <p className="guide-hero-lede">{subtitle}</p>}
      </div>
    </header>
  )
}
