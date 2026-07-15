import Link from "next/link"
import { brand } from "@/config/brand"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { LogoMark } from "@/components/brand/logo"

const COLS = [
  {
    title: "Service",
    links: [
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
      { href: "/eligibility", label: "Eligibility quiz" },
      { href: "/book", label: "Book a consult" },
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
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
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
