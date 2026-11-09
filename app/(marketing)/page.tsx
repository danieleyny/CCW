import { buildMetadata } from "@/lib/seo"
import HomePage from "@/components/home/HomePage"

export const metadata = buildMetadata({
  title: "NYC Gun License Help — Concealed Carry",
  description:
    "Guidance for preparing a NYC gun-license application: documents, requirements and clear next steps. You review and submit it yourself.",
  path: "/",
  hreflang: "",
  ogTitle: "NYC gun license, handled — Gun License NYC",
})

/**
 * Homepage — marketing redesign v2 (redesign/homepage-visual-spec.html), scoped
 * under `.mkt2`. Copy and structure are ported from the spec; links point at real
 * routes; the Service JSON-LD stays wired to the live package data.
 * Entrances are CSS scroll-driven and start from a visible opacity (see
 * marketing-v2.css). The hero's live-map composition is isolated in its own module.
 */
export default function Home() { return <HomePage /> }
