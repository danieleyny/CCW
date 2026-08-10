import type { MetadataRoute } from "next"
import { FIREARM_PATHS, firearmUrl } from "@/lib/firearm-license-site"

export default function sitemap(): MetadataRoute.Sitemap {
  return FIREARM_PATHS.map((path) => ({ url: firearmUrl(path), lastModified: new Date(), changeFrequency: path === "" ? "weekly" : "monthly", priority: path === "" ? 1 : path.startsWith("/boroughs") ? .75 : .85 }))
}
