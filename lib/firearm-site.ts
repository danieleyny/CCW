const FIREARM_APP_HOSTS = new Set([
  "app.firearmlicensenyc.com",
  "www.app.firearmlicensenyc.com",
])

/** Keep the paid Claude assistant exclusive to the Firearm License NYC app. */
export function isFirearmAppHost(value: string | null): boolean {
  if (!value) return process.env.NODE_ENV !== "production"
  const host = value.toLowerCase().split(":")[0]
  return FIREARM_APP_HOSTS.has(host) || (process.env.NODE_ENV !== "production" && host === "localhost")
}
