import { DarkBackdrop } from "@/components/theme/dark-backdrop"

/**
 * The entire marketing surface runs the cinematic DARK register — home and every
 * interior route (/pricing, /faq, /how-it-works, /blog, /eligibility, /contact,
 * …) alike, so navigating never flips the theme. The `.dark` class on the
 * wrapper re-themes the whole subtree (nav, page, footer) via cascading CSS
 * vars; nav + footer are passed in as already-rendered server elements so they
 * stay server components. (The homepage's transparent-over-hero nav behavior is
 * handled inside the nav itself.)
 */
export function MarketingFrame({
  nav,
  footer,
  children,
}: {
  nav: React.ReactNode
  footer: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="dark flex min-h-svh flex-col bg-background text-foreground">
      <DarkBackdrop />
      {nav}
      <main className="flex-1">{children}</main>
      {footer}
    </div>
  )
}
