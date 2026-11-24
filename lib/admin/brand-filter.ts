import "server-only"

import { cookies } from "next/headers"
import type { BrandKey } from "@/config/brands"

export type AdminBrandFilter = "all" | BrandKey

const COOKIE = "admin_brand_filter"

export function isAdminBrandFilter(value: string | null | undefined): value is AdminBrandFilter {
  return value === "all" || value === "gln" || value === "fl"
}

export async function resolveAdminBrandFilter(value: string | null | undefined): Promise<AdminBrandFilter> {
  if (isAdminBrandFilter(value)) return value
  const saved = (await cookies()).get(COOKIE)?.value
  return isAdminBrandFilter(saved) ? saved : "all"
}

export const ADMIN_BRAND_FILTER_COOKIE = COOKIE
