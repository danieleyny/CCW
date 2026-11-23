import { expect, test } from "@playwright/test"

test.describe("production marketing theme", () => {
  for (const viewport of [
    { name: "desktop", width: 1440, height: 900 },
    { name: "mobile", width: 390, height: 844 },
  ] as const) {
    test(`${viewport.name} serves Navy & Champagne V2 at the main route`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto("/", { waitUntil: "networkidle" })

      const theme = page.locator('[data-theme="v2"]')
      await expect(theme).toHaveCount(1)
      await expect(page.getByLabel(/choose colorway/i)).toHaveCount(0)

      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
    })
  }

  test("mobile eligibility nudge stays on the bottom edge and changes state without flicker", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/", { waitUntil: "networkidle" })

    const nudge = page.locator('a[aria-label="Check if you\'re eligible. Takes about 2 minutes."]')
    await expect(nudge).toHaveAttribute("data-visible", "false")

    await page.evaluate(() => window.scrollTo(0, 1300))
    await expect(nudge).toHaveAttribute("data-visible", "true")
    await expect(nudge).toHaveAttribute("data-compact", "false")
    await expect.poll(async () => (await nudge.boundingBox())?.width ?? 0).toBeGreaterThan(280)

    await expect.poll(async () => {
      const box = await nudge.boundingBox()
      return box ? Math.abs((box.x + box.width / 2) - 195) : 999
    }).toBeLessThanOrEqual(2)
    const expandedBox = await nudge.boundingBox()
    expect(expandedBox).not.toBeNull()
    expect(expandedBox!.y + expandedBox!.height).toBeGreaterThan(750)
    expect(expandedBox!.y + expandedBox!.height).toBeLessThanOrEqual(830)

    await page.mouse.wheel(0, 360)
    await expect(nudge).toHaveAttribute("data-compact", "true")
    await page.waitForTimeout(900)
    await expect(nudge).toHaveAttribute("data-compact", "true")

    const compactBox = await nudge.boundingBox()
    expect(compactBox).not.toBeNull()
    expect(compactBox!.width).toBeGreaterThanOrEqual(50)
    expect(compactBox!.width).toBeLessThanOrEqual(54)
    expect(compactBox!.x + compactBox!.width).toBeGreaterThanOrEqual(376)
    expect(compactBox!.x + compactBox!.width).toBeLessThanOrEqual(378)
    expect(compactBox!.y + compactBox!.height).toBeGreaterThan(750)

    await page.mouse.wheel(0, -180)
    await expect(nudge).toHaveAttribute("data-compact", "false")
    await expect.poll(async () => {
      const box = await nudge.boundingBox()
      return box ? Math.abs((box.x + box.width / 2) - 195) : 999
    }).toBeLessThanOrEqual(2)
  })

  test("desktop eligibility nudge opens from the right edge on the main site", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/", { waitUntil: "networkidle" })
    await page.evaluate(() => window.scrollTo(0, 1300))

    const tab = page.locator('button[aria-controls="eligibility-nudge-dialog"]')
    await expect(tab).toBeVisible()
    const tabBox = await tab.boundingBox()
    expect(tabBox).not.toBeNull()
    expect(tabBox!.x + tabBox!.width).toBeGreaterThanOrEqual(1438)

    await tab.click()
    await expect(page.getByRole("dialog", { name: "Find out if you qualify" })).toBeVisible()
  })

  test("eligibility nudge never mounts inside the eligibility flow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/eligibility", { waitUntil: "networkidle" })
    await expect(page.getByRole("link", { name: /check if you're eligible/i })).toHaveCount(0)
  })
})
