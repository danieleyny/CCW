import { BRANDS, type BrandKey } from "@/config/brands"

function cleanOrigin(value: string): string {
  return value.replace(/\/$/, "")
}

export function brandOrigin(
  key: BrandKey,
  opts: { currentOrigin?: string; vercelEnv?: string; nodeEnv?: string } = {}
): string {
  const vercelEnv = opts.vercelEnv ?? process.env.VERCEL_ENV
  const nodeEnv = opts.nodeEnv ?? process.env.NODE_ENV
  const current = opts.currentOrigin?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim()

  if (vercelEnv !== "production" && nodeEnv !== "production" && current) {
    return cleanOrigin(current)
  }
  if (vercelEnv === "preview" && current) return cleanOrigin(current)
  return BRANDS[key].appOrigin
}

export function brandUrl(
  key: BrandKey,
  path: string,
  opts: { currentOrigin?: string; vercelEnv?: string; nodeEnv?: string } = {}
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  return new URL(normalizedPath, `${brandOrigin(key, opts)}/`).toString()
}
