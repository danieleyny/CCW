import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { TechGrid } from "@/components/shared/tech-grid"

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
    <section className="relative overflow-hidden border-b border-hairline">
      <TechGrid glow="brass" />
      <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <SectionEyebrow>{eyebrow}</SectionEyebrow>
        <h1 className="mt-3 max-w-3xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          {title}
        </h1>
        {subtitle && <p className="mt-4 max-w-2xl text-lg text-text-mid">{subtitle}</p>}
      </div>
    </section>
  )
}
