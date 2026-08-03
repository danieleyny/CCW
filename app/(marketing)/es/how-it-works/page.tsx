import { buildMetadata } from "@/lib/seo"
import { FACTS } from "@/content/facts"
import { ES_HOW } from "@/content/es"
import { EsPageShell } from "@/components/marketing/es-page-shell"

export const metadata = buildMetadata({
  title: ES_HOW.metaTitle,
  description: ES_HOW.metaDescription,
  path: "/es/how-it-works",
  hreflang: "/how-it-works",
  locale: "es_ES",
})

export default function EsHowItWorksPage() {
  return (
    <EsPageShell
      page={ES_HOW}
      breadcrumbLabel="Cómo funciona"
      facts={[FACTS.youFile, FACTS.discretion]}
    />
  )
}
