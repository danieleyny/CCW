import { brandCss } from "@/config/brand"

/**
 * Injects the brand color palette (from config/brand.ts) as CSS variables.
 * Rendered in the root layout <head> so it is present at SSR — no flash, and
 * brand.ts stays the single source of truth for the live theme.
 */
export function BrandStyle() {
  return (
    <style
      id="carrypath-brand-tokens"
      dangerouslySetInnerHTML={{ __html: brandCss() }}
    />
  )
}
