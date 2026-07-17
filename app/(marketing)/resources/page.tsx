import { ExternalLink } from "lucide-react"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { resourceGroups } from "@/content/resources"

export const metadata = buildMetadata({
  title: "NYC Gun License Official Sources",
  description:
    "Primary sources for NYC gun licensing — the NYPD License Division, fees, DCJS, CCIA training, recertification, and safe storage. Every link dated when verified.",
  path: "/resources",
})

export default function ResourcesPage() {
  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Official sources, in one place"
        subtitle="Everything here points to a government source. Every link is dated the day we last verified it."
      />

      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="space-y-4">
          {resourceGroups.map((g) => (
            <details key={g.title} className="group rounded-xl border border-hairline bg-card" open>
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-5 py-3 [&::-webkit-details-marker]:hidden">
                <span className="font-display text-lg font-semibold">{g.title}</span>
                <span className="font-mono text-signal transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="px-5 pb-4">
                {g.intro && <p className="mb-3 text-sm text-text-mid">{g.intro}</p>}
                <ul className="divide-y divide-hairline">
                  {g.links.map((l) => (
                    <li key={`${g.title}-${l.label}`}>
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-h-12 items-center justify-between gap-3 py-2 transition-colors hover:text-foreground"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 text-sm font-medium">
                            {l.label} <ExternalLink className="size-3.5 shrink-0 text-text-low" />
                          </span>
                          {l.note && <span className="mt-0.5 block text-xs text-text-mid">{l.note}</span>}
                        </span>
                        <span className="shrink-0 font-mono text-[10px] text-text-low">
                          verified {l.lastVerified}
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </details>
          ))}
        </div>

        <div className="mt-8 text-center">
          <SectionEyebrow>Note</SectionEyebrow>
          <p className="mt-2 text-xs text-text-low">
            Rules change. If a link is stale, tell us — we keep these current, and Law Watch emails you
            when a requirement actually changes.
          </p>
        </div>
      </section>
    </>
  )
}
