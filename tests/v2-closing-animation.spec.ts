import { expect, test } from "@playwright/test"

test.describe("V2 closing call-to-action", () => {
  test.beforeEach(({ browserName }, testInfo) => {
    const baseURL = String(testInfo.project.use.baseURL ?? "")
    test.skip(
      browserName === "webkit" && /^http:\/\/(localhost|127\.0\.0\.1)/.test(baseURL),
      "The local CSP upgrades WebKit subresources to HTTPS; the deployed HTTPS check still runs.",
    )
  })

  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name} completes and repeats the arrival celebration`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/V2", { waitUntil: "domcontentloaded" })
      const closing = page.locator("#closing")
      const anchor = closing.locator('[data-path-mode="v2"]')
      await closing.scrollIntoViewIfNeeded()
      await expect(anchor).toHaveAttribute("data-celebrate", "v2-0", { timeout: 6_000 })
      await closing.screenshot({ path: testInfo.outputPath(`v2-closing-celebration-${viewport.name}.png`) })
      await expect(anchor).not.toHaveAttribute("data-celebrate", /v2-/, { timeout: 2_000 })
      await expect(anchor).toHaveAttribute("data-celebrate", "v2-1", { timeout: 8_000 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    })
  }

  test("reduced motion holds a completed route without celebrating", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/V2", { waitUntil: "domcontentloaded" })
    const closing = page.locator("#closing")
    const anchor = closing.locator('[data-path-mode="v2"]')
    await closing.scrollIntoViewIfNeeded()
    await expect(anchor).toBeVisible()
    await page.waitForTimeout(1_500)
    await expect(anchor).not.toHaveAttribute("data-celebrate", /v2-/)
  })
})
