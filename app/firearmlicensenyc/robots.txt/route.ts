import { FIREARM_SITE } from "@/lib/firearm-license-site"

export function GET() {
  return new Response(
    `User-agent: *\nAllow: /\nDisallow: /firearmlicensenyc\nSitemap: ${FIREARM_SITE.origin}/sitemap.xml\nHost: ${FIREARM_SITE.origin}\n`,
    { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } }
  )
}
