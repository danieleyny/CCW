import Link from "next/link"
import { ArticleBody } from "@/components/blog/article-body"
import { ArticleToc } from "@/components/blog/article-toc"
import { getRequestBrand } from "@/lib/brand/server"
import type { ParsedArticle, ArticleSection } from "@/lib/blog/structure"
import { formatDate } from "@/lib/format"

export interface RelatedGuide {
  slug: string
  title: string
  tag: string
  readingMinutes: number
}

export interface ArticlePresentationProps {
  title: string
  description: string
  tag: string
  date: string
  updated?: string
  readingMinutes: number
  content: string
  structure: ParsedArticle
  automationAssisted: boolean
  author?: string
  showGuidesLink?: boolean
  reviewed?: boolean
  relatedPosts?: RelatedGuide[]
}

function splitFirstParagraph(markdown: string) {
  const blocks = markdown.trim().split(/\n\s*\n/)
  return { first: blocks[0]?.trim() ?? "", rest: blocks.slice(1).join("\n\n").trim() }
}

function EligibilityCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-[14px] bg-[#14254A] p-5 text-white ${className}`}>
      <p className="font-[family-name:var(--font-title)] text-[21px] font-medium not-italic leading-[1.2]">Not sure you qualify?</p>
      <p className="mb-3.5 mt-2 text-[14px] leading-[1.5] text-[#B9C2D6]">A free two-minute check, no account needed.</p>
      <Link href="/eligibility" style={{ color: "#14254A" }} className="block rounded-[9px] bg-[#D3B36B] px-3 py-3 text-center text-[14.5px] font-bold transition-colors hover:bg-[#E0C47F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70">
        Check eligibility →
      </Link>
    </div>
  )
}

function SectionContent({ section, sources }: { section: ArticleSection; sources: ParsedArticle["sources"] }) {
  if (section.kind === "role") {
    const { first, rest } = splitFirstParagraph(section.markdown)
    return (
      <>
        {first ? (
          <aside className="my-2 grid grid-cols-[36px_minmax(0,1fr)] gap-3.5 rounded-[14px] bg-[#14254A] px-[22px] py-5 text-[#DDE3F0]">
            <span aria-hidden className="grid size-9 place-items-center rounded-full bg-[#D3B36B] text-[15px] font-bold text-[#14254A]">✓</span>
            <div>
              <p className="mb-1 font-mono text-[13px] font-semibold uppercase tracking-[.08em] text-[#D3B36B]">{section.title}</p>
              <div className="[&_a]:!text-white [&_a]:decoration-[#D3B36B] [&_div]:text-[16.5px] [&_div]:leading-[1.6] [&_p]:mb-0 [&_strong]:!text-white">
                <ArticleBody source={first} inverted />
              </div>
            </div>
          </aside>
        ) : null}
        {rest ? <ArticleBody source={rest} /> : null}
      </>
    )
  }

  if (section.kind === "sources") {
    return (
      <>
        {sources.length ? (
          <div className="mt-2 grid gap-2.5">
            {sources.map((source, index) => (
              <a
                key={`${source.url}-${index}`}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="grid grid-cols-[34px_minmax(0,1fr)_auto] items-center gap-3.5 rounded-xl border border-[rgba(20,37,74,.13)] bg-white px-4 py-3.5 no-underline transition-colors hover:border-[#D3B36B] hover:bg-[#F7F4EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14254A]/35"
              >
                <span className="font-mono text-[12px] font-semibold text-[#5F687B]">{String(index + 1).padStart(2, "0")}</span>
                <span className="min-w-0">
                  <strong className="block text-[15.5px] font-semibold text-[#14254A]">{source.title}</strong>
                  <span className="block truncate font-mono text-[12px] text-[#5F687B]">{source.host} · cited source</span>
                </span>
                <span aria-hidden className="font-mono text-[12px] font-semibold text-[#8E6F2E]">↗</span>
              </a>
            ))}
          </div>
        ) : null}
        {section.markdown ? <div className="mt-4"><ArticleBody source={section.markdown} /></div> : null}
      </>
    )
  }

  return <ArticleBody source={section.markdown} />
}

/** The exact reader-facing article layout shared by public posts and preview. */
export async function ArticlePresentation({
  title,
  description,
  tag,
  date,
  updated,
  readingMinutes,
  structure,
  automationAssisted,
  author,
  showGuidesLink = true,
  reviewed = true,
  relatedPosts = [],
}: ArticlePresentationProps) {
  const requestBrand = await getRequestBrand()
  const articleAuthor = author || `${requestBrand.name} editorial team`
  const displayedDate = formatDate(updated || date)
  const tocItems = structure.sections.map(({ id, title: sectionTitle }) => ({ id, title: sectionTitle }))
  const shortAnswer = structure.shortAnswer || description
  const shortAnswerLabel = structure.shortAnswerLabel || "In brief"
  const readingId = `article-reading-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`

  return (
    <article className="overflow-x-clip bg-white text-[#14254A]">
      <header className="border-b border-[rgba(20,37,74,.13)]">
        <div className="mx-auto max-w-[1200px] px-5 py-6 min-[760px]:px-10 min-[1024px]:pb-10 min-[1024px]:pt-[52px]">
          <p className="font-mono text-[12.5px] font-medium uppercase tracking-[.06em] text-[#5F687B]">
            {showGuidesLink ? <Link href="/blog" className="text-[#46526D] hover:text-[#14254A]">Guides</Link> : <span>Preview</span>} / {tag}
          </p>
          <h1 className="my-3.5 max-w-[900px] font-[family-name:var(--font-title)] text-[36px] font-medium not-italic leading-[1.04] tracking-[-.025em] text-[#14254A] min-[1024px]:my-5 min-[1024px]:text-[62px]">
            {title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-[22px] gap-y-2 text-[13.5px] text-[#46526D] min-[760px]:text-[14.5px]">
            <span className="rounded-md bg-[#14254A] px-2.5 py-1.5 font-mono text-[11.5px] font-semibold uppercase tracking-[.1em] text-[#D3B36B]">{tag}</span>
            <span>{updated ? "Updated" : "Published"} {displayedDate}</span>
            <span>{readingMinutes} min read</span>
            <span>By <strong className="font-bold text-[#14254A]">{articleAuthor}</strong></span>
            {reviewed && structure.sources.length > 0 ? (
              <span className="inline-flex items-center gap-2 font-semibold text-[#13795B]">✓ Checked against {structure.sources.length} primary {structure.sources.length === 1 ? "source" : "sources"}</span>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1200px] grid-cols-1 gap-6 px-5 pb-10 pt-6 min-[760px]:px-10 min-[1024px]:grid-cols-[240px_minmax(0,1fr)_260px] min-[1024px]:gap-14 min-[1024px]:pb-[70px] min-[1024px]:pt-12">
        <aside className="hidden min-[1024px]:sticky min-[1024px]:top-5 min-[1024px]:block min-[1024px]:self-start">
          <ArticleToc items={tocItems} readingId={readingId} />
        </aside>

        <main id={readingId} className="min-w-0">
          <section className="rounded-2xl border border-[rgba(20,37,74,.13)] bg-[#F7F4EE] p-5 min-[760px]:px-7 min-[760px]:py-[26px]" aria-label={shortAnswerLabel}>
            <p className="font-mono text-[12px] font-semibold uppercase tracking-[.12em] text-[#7B5F25]">{shortAnswerLabel}</p>
            <div className="mt-2.5 [&>div]:font-[family-name:var(--font-title)] [&>div]:text-[19px] [&>div]:font-medium [&>div]:not-italic [&>div]:leading-[1.45] [&>div]:text-[#14254A] min-[760px]:[&>div]:text-[22px] [&_p]:mb-0">
              <ArticleBody source={shortAnswer} />
            </div>
          </section>

          {tocItems.length ? (
            <details className="group mb-6 mt-4 rounded-xl border border-[rgba(20,37,74,.13)] min-[1024px]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3.5 font-mono text-[12.5px] font-semibold uppercase tracking-[.08em] text-[#14254A] outline-none marker:hidden focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14254A]/30 [&::-webkit-details-marker]:hidden">
                <span>In this guide · {tocItems.length} sections</span>
                <span aria-hidden><span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span>
              </summary>
              <nav aria-label="Article sections" className="border-t border-[rgba(20,37,74,.13)] px-4 py-3">
                {tocItems.map((item) => <a key={item.id} href={`#${item.id}`} className="block py-2 text-[14px] text-[#46526D] underline decoration-[#D3B36B] underline-offset-4">{item.title}</a>)}
              </nav>
            </details>
          ) : null}

          {structure.introMarkdown ? <div className="mt-7"><ArticleBody source={structure.introMarkdown} /></div> : null}

          {structure.sections.map((section) => (
            <section key={section.id} aria-labelledby={section.id}>
              <h2 id={section.id} className="mb-3.5 mt-11 scroll-mt-[90px] font-[family-name:var(--font-title)] text-[26px] font-medium not-italic leading-[1.15] tracking-[-.015em] text-[#14254A] min-[760px]:mt-14 min-[760px]:text-[32px]">
                {section.title}
              </h2>
              <SectionContent section={section} sources={structure.sources} />
            </section>
          ))}
        </main>

        <aside className="hidden min-[1024px]:sticky min-[1024px]:top-5 min-[1024px]:block min-[1024px]:self-start">
          <div className="grid gap-3.5">
            <EligibilityCard />
            <div className="rounded-[14px] border border-[rgba(20,37,74,.13)] p-5">
              <p className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[.12em] text-[#5F687B]">At a glance</p>
              <dl className="text-[14px] text-[#14254A]">
                {[["Topic", tag], ["Reading time", `${readingMinutes} min`], ["Sources", String(structure.sources.length)], ["Updated", displayedDate]].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-t border-[rgba(20,37,74,.13)] py-2 first:border-t-0">
                    <dt>{label}</dt><dd className="text-right font-mono text-[12px] text-[#5F687B]">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </aside>
      </div>

      <div className="mx-auto max-w-[1200px] px-5 pb-10 min-[760px]:px-10 min-[1024px]:pb-[70px]">
        <section className="relative flex flex-col items-start justify-between gap-6 overflow-hidden rounded-[20px] bg-[#14254A] px-[22px] py-[26px] text-white min-[760px]:flex-row min-[760px]:items-center min-[760px]:px-9 min-[760px]:py-[34px]">
          <span aria-hidden className="pointer-events-none absolute -right-[120px] -top-[120px] size-[300px] rounded-full border border-[#D3B36B]/30 shadow-[0_0_0_40px_rgba(211,179,107,.04)]" />
          <div className="relative z-10">
            <h2 className="font-[family-name:var(--font-title)] text-[28px] font-medium not-italic leading-[1.15]">Ready to begin?</h2>
            <p className="mt-1.5 text-[#B9C2D6]">Check your eligibility in two minutes. No payment, no commitment.</p>
          </div>
          <Link href="/eligibility" style={{ color: "#14254A" }} className="relative z-10 w-full whitespace-nowrap rounded-[10px] bg-[#D3B36B] px-[22px] py-[15px] text-center font-bold transition-colors hover:bg-[#E0C47F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 min-[760px]:w-auto">Check your eligibility →</Link>
        </section>

        <EligibilityCard className="mt-4 min-[1024px]:hidden" />

        {showGuidesLink && relatedPosts.length ? (
          <section className="mt-11" aria-labelledby="keep-reading-title">
            <h2 id="keep-reading-title" className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[.12em] text-[#5F687B]">Keep reading</h2>
            <div className="grid gap-3.5 min-[760px]:grid-cols-3">
              {relatedPosts.slice(0, 3).map((guide) => (
                <Link key={guide.slug} href={`/blog/${guide.slug}`} className="rounded-[14px] border border-[rgba(20,37,74,.13)] bg-white p-5 transition-colors hover:border-[#D3B36B] hover:bg-[#F7F4EE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14254A]/35">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-[.1em] text-[#8E6F2E]">{guide.tag}</span>
                  <strong className="my-2 block font-[family-name:var(--font-title)] text-[19px] font-medium not-italic leading-[1.25] text-[#14254A]">{guide.title}</strong>
                  <span className="font-mono text-[12px] text-[#5F687B]">{guide.readingMinutes} min read</span>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-7 space-y-2 text-[13px] leading-[1.6] text-[#5F687B]">
          <p>{reviewed ? "Reviewed against cited primary sources before publication." : "Private pre-publication preview; human review is still required."}</p>
          {automationAssisted ? <p>Automation assisted with research organization; a person reviewed the facts, sources and final wording.</p> : null}
          <p>{requestBrand.name} is a private document-preparation and case-management service, not a law firm, and not affiliated with the NYPD. This guide is general information, not legal advice.</p>
        </div>
      </div>
    </article>
  )
}
