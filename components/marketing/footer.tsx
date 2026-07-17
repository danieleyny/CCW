import Link from "next/link"
import { brand } from "@/config/brand"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { LogoMark } from "@/components/brand/logo"

/**
 * The footer is the hub of the hub-and-spoke: every new SEO page is reachable
 * from here, so nothing is an orphan and everything sits <=2 clicks from home.
 */
const COLS = [
  {
    title: "Service",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/eligibility", label: "Eligibility quiz" },
      { href: "/book", label: "Book a consult" },
      { href: "/about", label: "About us" },
    ],
  },
  {
    title: "Answers",
    links: [
      { href: "/cost", label: "What it costs" },
      { href: "/timeline", label: "How long it takes" },
      { href: "/requirements", label: "What's required" },
      { href: "/checklist", label: "Free checklist" },
      { href: "/do-i-need-a-lawyer", label: "Do I need a lawyer?" },
    ],
  },
  {
    title: "Situations",
    links: [
      { href: "/non-resident-business", label: "Non-residents & business" },
      { href: "/renewal", label: "Renewal" },
      { href: "/denied-appeal", label: "If you're denied" },
      { href: "/resources", label: "Official sources" },
    ],
  },
  {
    title: "Boroughs",
    links: [
      { href: "/gun-license/manhattan", label: "Manhattan" },
      { href: "/gun-license/brooklyn", label: "Brooklyn" },
      { href: "/gun-license/queens", label: "Queens" },
      { href: "/gun-license/bronx", label: "The Bronx" },
      { href: "/gun-license/staten-island", label: "Staten Island" },
    ],
  },
  {
    title: "Learn",
    links: [
      { href: "/blog", label: "Guides" },
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
      { href: "/privacy", label: "Privacy" },
    ],
  },
]

export function MarketingFooter() {
  return (
    <footer className="relative border-t border-hairline">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          <div className="md:col-span-2">
            <Link
              href="/"
              className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground"
            >
              <LogoMark className="size-8 text-brass" />
              {brand.logo.wordmark}
            </Link>
            <p className="mt-4 max-w-sm text-sm text-text-mid">{brand.tagline}</p>
            <p className="mt-4 font-mono text-xs text-text-low">
              {brand.contact.email} · {brand.contact.phone}
            </p>
          </div>
          {COLS.map((col) => (
            <div key={col.title}>
              <SectionEyebrow>{col.title}</SectionEyebrow>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-sm text-text-mid transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-hairline pt-6">
          <p className="max-w-3xl text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
          <p className="mt-4 font-mono text-xs text-text-low">
            © {brand.legalName}
          </p>
        </div>
      </div>
    </footer>
  )
}
