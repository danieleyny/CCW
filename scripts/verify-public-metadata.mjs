/**
 * Crawl every canonical URL in the public sitemap and fail when the search
 * metadata contract drifts. Run against a local production build before a
 * release, or set BASE_URL to audit the live site after deployment.
 */

const BASE_URL = (process.env.BASE_URL || "http://localhost:3200").replace(/\/$/, "")
const CANONICAL_ORIGIN = "https://gunlicensenyc.com"

function decode(value = "") {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function first(html, pattern) {
  const match = html.match(pattern)
  return decode(match?.[1]?.trim() || "")
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function meta(html, attribute, value, contentAttribute = "content") {
  const escaped = escapeRegExp(value)
  const tag = html.match(new RegExp(`<meta\\s+[^>]*${attribute}=["']${escaped}["'][^>]*>`, "i"))?.[0]
  if (!tag) return ""
  return first(tag, new RegExp(`${contentAttribute}=["']([^"']*)["']`, "i"))
}

function link(html, rel) {
  const escaped = escapeRegExp(rel)
  const tag = html.match(new RegExp(`<link\\s+[^>]*rel=["']${escaped}["'][^>]*>`, "i"))?.[0]
  if (!tag) return ""
  return first(tag, /href=["']([^"']*)["']/i)
}

function fail(errors, path, message) {
  errors.push(`${path}: ${message}`)
}

const sitemapResponse = await fetch(`${BASE_URL}/sitemap.xml`)
if (!sitemapResponse.ok) throw new Error(`sitemap.xml returned ${sitemapResponse.status}`)
const sitemap = await sitemapResponse.text()
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decode(match[1]))
if (!urls.length) throw new Error("sitemap.xml contains no canonical URLs")

const errors = []
const descriptions = new Map()
const titles = new Map()

for (const canonicalUrl of urls) {
  const url = new URL(canonicalUrl)
  const path = `${url.pathname}${url.search}`
  const response = await fetch(`${BASE_URL}${path}`, { redirect: "manual" })
  if (response.status !== 200) {
    fail(errors, path, `expected 200, received ${response.status}`)
    continue
  }

  const html = await response.text()
  const title = first(html, /<title>([^<]*)<\/title>/i)
  const description = meta(html, "name", "description")
  const canonical = link(html, "canonical")
  const robots = meta(html, "name", "robots")
  const ogTitle = meta(html, "property", "og:title")
  const ogDescription = meta(html, "property", "og:description")
  const ogUrl = meta(html, "property", "og:url")
  const ogImage = meta(html, "property", "og:image")
  const twitterCard = meta(html, "name", "twitter:card")
  const h1Count = (html.match(/<h1(?:\s|>)/gi) || []).length

  if (!title) fail(errors, path, "missing title")
  else if (title.length > 70) fail(errors, path, `title is ${title.length} characters (maximum 70)`)
  if (!description) fail(errors, path, "missing meta description")
  else if (description.length < 50 || description.length > 170) {
    fail(errors, path, `description is ${description.length} characters (expected 50-170)`)
  }
  if (canonical !== canonicalUrl) fail(errors, path, `canonical mismatch: ${canonical || "missing"}`)
  if (/noindex/i.test(robots)) fail(errors, path, "canonical sitemap page is noindex")
  if (!ogTitle) fail(errors, path, "missing og:title")
  if (!ogDescription) fail(errors, path, "missing og:description")
  if (ogUrl !== canonicalUrl) fail(errors, path, `og:url mismatch: ${ogUrl || "missing"}`)
  if (!ogImage.startsWith(`${CANONICAL_ORIGIN}/`)) fail(errors, path, "missing canonical og:image")
  if (twitterCard !== "summary_large_image") fail(errors, path, "missing summary_large_image Twitter card")
  if (h1Count !== 1) fail(errors, path, `expected one H1, found ${h1Count}`)

  if (title) {
    if (titles.has(title)) fail(errors, path, `duplicate title also used by ${titles.get(title)}`)
    else titles.set(title, path)
  }
  if (description) {
    if (descriptions.has(description)) {
      fail(errors, path, `duplicate description also used by ${descriptions.get(description)}`)
    } else descriptions.set(description, path)
  }
}

const home = await (await fetch(`${BASE_URL}/`)).text()
if (!home.includes('href="/icon-512.png"')) {
  fail(errors, "/", "new 512px favicon is not linked from the homepage")
}

if (errors.length) {
  console.error(`Public metadata audit failed with ${errors.length} issue(s):`)
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}

console.log(`Public metadata audit passed for ${urls.length} canonical sitemap URLs.`)
