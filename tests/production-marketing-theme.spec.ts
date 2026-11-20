import { expect, test } from "@playwright/test"

test.describe("production marketing theme", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name} serves Navy & Champagne V2 at the main route`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/", { waitUntil: "domcontentloaded" })

      const theme = page.locator('[data-theme="v2"]')
      await expect(theme).toHaveCount(1)
      await expect(theme).toHaveCSS("--gold", "#D9B25F")
      await expect(page.getByLabel(/choose colorway/i)).toHaveCount(0)

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    })
  }
})
