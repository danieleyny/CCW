import Link from "next/link"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { PartnerPreviewForm } from "@/components/marketing/partner-preview-form"

/**
 * The coming-soon screen for a partner page that isn't public yet. Looks like the rest
 * of the marketing site (the nav + footer frame stay). The preview-code field reveals
 * the real profile; the code itself is NEVER rendered here. Pages set robots noindex in
 * their metadata while coming_soon.
 *
 * `path` is the clean URL to land on after a correct code (the same page, without params).
 */
export function PartnerComingSoon({ path }: { path: string }) {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <SectionEyebrow>Coming soon</SectionEyebrow>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        Our attorney partner page is almost ready.
      </h1>
      <p className="mt-4 max-w-xl text-text-mid">
        We&apos;re finalising this with the attorney before it goes live.
      </p>

      <PartnerPreviewForm path={path} />

      <p className="mt-6 text-sm">
        <Link href="/do-i-need-a-lawyer" className="text-signal hover:underline">
          Do I need a lawyer?
        </Link>
      </p>
    </section>
  )
}
