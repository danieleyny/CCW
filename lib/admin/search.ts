import "server-only"

export interface AdminSearchableClient {
  fullName: string
  email: string | null
  phone: string | null
}

export function normalizeAdminSearch(input: string) {
  return input.trim().toLowerCase().slice(0, 80)
}

export function adminSearchPatterns(input: string) {
  const normalized = normalizeAdminSearch(input).replaceAll("%", "").replaceAll("_", "")
  const digits = normalized.replace(/\D/g, "")
  return {
    normalized,
    textPattern: `%${normalized}%`,
    phonePattern: digits ? `%${digits.split("").join("%")}%` : `%${normalized}%`,
  }
}

export function matchesAdminSearch(client: AdminSearchableClient, input: string) {
  const query = normalizeAdminSearch(input)
  if (!query) return true
  if (client.fullName.toLowerCase().includes(query)) return true
  if (client.email?.toLowerCase().includes(query)) return true
  const digits = query.replace(/\D/g, "")
  return !!digits && (client.phone ?? "").replace(/\D/g, "").includes(digits)
}
