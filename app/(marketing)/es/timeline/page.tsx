import { buildMetadata } from "@/lib/seo"
import { FACTS } from "@/content/facts"
import { ES_TIMELINE } from "@/content/es"
import { EsPageShell } from "@/components/marketing/es-page-shell"

export const metadata = buildMetadata({
  title: ES_TIMELINE.metaTitle,
  description: ES_TIMELINE.metaDescription,
  path: "/es/timeline",
  hreflang: "/timeline",
  locale: "es_ES",
})

export default function EsTimelinePage() {
  return (
    <EsPageShell
      page={ES_TIMELINE}
      breadcrumbLabel="Duración"
      facts={[FACTS.timeline, FACTS.trainingClock, FACTS.discretion]}
    />
  )
}
