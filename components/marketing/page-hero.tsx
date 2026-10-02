import {
  inferInteriorHeroVariant,
  InteriorHeroVisual,
  type InteriorHeroVariant,
} from "@/components/marketing/v2/interior-hero-visual"

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
export function PageHero({
  eyebrow,
  title,
  subtitle,
  variant,
}: {
  eyebrow: string
  title: string
  subtitle?: string
  variant?: InteriorHeroVariant
}) {
  const visualVariant = variant ?? inferInteriorHeroVariant(eyebrow, title)

  return (
    <header className={`guide-hero guide-hero--${visualVariant}`}>
      <div className="guide-hero-layout">
        <div className="guide-hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          {subtitle && <p className="guide-hero-lede">{subtitle}</p>}
        </div>
        <InteriorHeroVisual variant={visualVariant} />
      </div>
    </header>
  )
}
