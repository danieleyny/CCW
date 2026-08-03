import { buildMetadata } from "@/lib/seo"
import { FACTS } from "@/content/facts"
import { ES_HOME } from "@/content/es"
import { EsPageShell } from "@/components/marketing/es-page-shell"

export const metadata = buildMetadata({
  title: ES_HOME.metaTitle,
  description: ES_HOME.metaDescription,
  path: "/es",
  hreflang: "",
  locale: "es_ES",
})

export default function EsHomePage() {
  return <EsPageShell page={ES_HOME} breadcrumbLabel="Inicio" facts={[FACTS.youFile, FACTS.discretion]} />
}
