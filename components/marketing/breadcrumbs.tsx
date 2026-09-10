import Link from "next/link"
import { JsonLd, breadcrumbSchema } from "@/components/marketing/json-ld"

/**
 * Visible breadcrumbs + BreadcrumbList schema from ONE array, so the trail a
 * person sees and the trail a crawler reads can't disagree. Render on every
 * non-home page. The last crumb is the current page and isn't a link.
 *
 * Restyled to marketing v2: the `.breadcrumb` mono-caps trail, tuned to read on
 * the light `.guide-page` surface (it sits above the dark hero, so it uses the
 * ink tokens rather than the hero's light-on-dark ones). API unchanged.
 */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav
      className="breadcrumb"
      aria-label="Breadcrumb"
      style={{ margin: 0, padding: "24px clamp(28px,6vw,84px) 0", color: "var(--ink-muted)" }}
    >
      <JsonLd data={breadcrumbSchema(items)} />
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <span key={item.path} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
            {last ? (
              <span aria-current="page" style={{ color: "var(--ink-soft)" }}>
                {item.name}
              </span>
            ) : (
              <>
                <Link href={item.path} style={{ textDecoration: "none" }}>
                  {item.name}
                </Link>
                <span aria-hidden="true">/</span>
              </>
            )}
          </span>
        )
      })}
    </nav>
  )
}
