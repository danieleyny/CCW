import type { BrandKey } from "@/config/brands"

type ResolveBrandOptions = {
  enabled: boolean
  vercelEnv?: string
  override?: string | null
}

function normalizeHost(host: string | null): string {
  if (!host) return ""
  const normalized = host.trim().toLowerCase()
  if (normalized.startsWith("[")) {
    const end = normalized.indexOf("]")
    return end >= 0 ? normalized.slice(1, end) : normalized
  }
  return normalized.split(":", 1)[0]
}

/** Edge-safe and deliberately exact: unknown hosts always remain GLN. */
export function resolveBrandFromHost(
  host: string | null,
  opts: ResolveBrandOptions
): BrandKey {
  if (!opts.enabled) return "gln"

  const normalized = normalizeHost(host)
  if (normalized === "app.firearmlicensenyc.com" || normalized === "fl.localhost") {
    return "fl"
  }

  if (opts.vercelEnv !== "production" && opts.override === "fl") return "fl"
  return "gln"
}
