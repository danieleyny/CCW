import { buildMetadata } from "@/lib/seo"
import { FACTS } from "@/content/facts"
import { ES_COST } from "@/content/es"
import { EsPageShell } from "@/components/marketing/es-page-shell"

export const metadata = buildMetadata({
  title: ES_COST.metaTitle,
  description: ES_COST.metaDescription,
  path: "/es/cost",
  hreflang: "/cost",
  locale: "es_ES",
})

export default function EsCostPage() {
  return (
    <EsPageShell
      page={ES_COST}
      breadcrumbLabel="Costo"
      facts={[FACTS.applicationFee, FACTS.fingerprintFee]}
    />
  )
}
