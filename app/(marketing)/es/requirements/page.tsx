import { buildMetadata } from "@/lib/seo"
import { FACTS } from "@/content/facts"
import { ES_REQUIREMENTS } from "@/content/es"
import { EsPageShell } from "@/components/marketing/es-page-shell"

export const metadata = buildMetadata({
  title: ES_REQUIREMENTS.metaTitle,
  description: ES_REQUIREMENTS.metaDescription,
  path: "/es/requirements",
  hreflang: "/requirements",
  locale: "es_ES",
})

export default function EsRequirementsPage() {
  return (
    <EsPageShell
      page={ES_REQUIREMENTS}
      breadcrumbLabel="Requisitos"
      facts={[FACTS.age, FACTS.training, FACTS.references, FACTS.cohabitants, FACTS.disclosure, FACTS.youFile]}
    />
  )
}
