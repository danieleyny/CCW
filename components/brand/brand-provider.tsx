"use client"

import { createContext, useContext } from "react"
import { BRANDS, type BrandConfig, type BrandKey } from "@/config/brands"

const BrandContext = createContext<{ key: BrandKey; brand: BrandConfig }>({
  key: "gln",
  brand: BRANDS.gln,
})

export function BrandProvider({
  brandKey,
  children,
}: {
  brandKey: BrandKey
  children: React.ReactNode
}) {
  return (
    <BrandContext.Provider value={{ key: brandKey, brand: BRANDS[brandKey] }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  return useContext(BrandContext)
}
