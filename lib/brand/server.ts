import "server-only"

import { headers } from "next/headers"
import { BRANDS, isBrandKey, type BrandConfig, type BrandKey } from "@/config/brands"

export async function getRequestBrandKey(): Promise<BrandKey> {
  const value = (await headers()).get("x-brand")
  return isBrandKey(value) ? value : "gln"
}

export async function getRequestBrand(): Promise<BrandConfig> {
  return BRANDS[await getRequestBrandKey()]
}
