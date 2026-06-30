/**
 * The public base URL of the app, used to build absolute links in emails (e.g.
 * the sign-up confirmation redirect). Set NEXT_PUBLIC_SITE_URL per environment;
 * falls back to the production domain so confirmation links never point at
 * localhost in deployed builds.
 */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (raw && !raw.includes("localhost") && !raw.includes("127.0.0.1")) return raw.replace(/\/$/, "")
  if (process.env.NODE_ENV === "production") return "https://ccw-eight.vercel.app"
  return raw?.replace(/\/$/, "") || "http://localhost:3000"
}
