import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { JsonLd, breadcrumbSchema } from "@/components/marketing/json-ld"

/**
 * Visible breadcrumbs + BreadcrumbList schema from ONE array, so the trail a
 * person sees and the trail a crawler reads can't disagree. Render on every
 * non-home page. The last crumb is the current page and isn't a link.
 */
export function Breadcrumbs({ items }: { items: { name: string; path: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <JsonLd data={breadcrumbSchema(items)} />
      <ol className="flex flex-wrap items-center gap-1 text-xs text-text-low">
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <li key={item.path} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-text-mid">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link href={item.path} className="hover:text-signal">
                    {item.name}
                  </Link>
                  <ChevronRight className="size-3" aria-hidden />
                </>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
