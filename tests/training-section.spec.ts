import { expect, test } from "@playwright/test"
import AxeBuilder from "@axe-core/playwright"
import path from "node:path"

const pages = ["/", "/V1", "/V2", "/V3", "/V4"]
const viewports = [
  { label: "mobile", width: 390, height: 844 },
  { label: "desktop", width: 1440, height: 900 },
]

const scheduledClass = {
  id: "00000000-0000-4000-8000-000000000010",
  slug: "preview-january-class",
  title: "January concealed-carry class",
  sessions: [{ date: "2027-01-16", start: "09:00", end: "18:00", label: "Saturday" }],
  locationPublic: "Manhattan",
  hoursCopy: "18 hours total",
  priceCents: 60000,
  capacity: 12,
  seatsLeft: 8,
  status: "open",
  nextAfter: null,
  instructorName: "Certified NYS instructor",
  checkoutAvailable: true,
  previewCheckout: false,
}

function isAllowedPreviewNoise(message: string) {
  return message.includes("vercel.live")
}

test.describe("training section", () => {
  for (const routePath of ["/", "/V2"]) {
    for (const viewport of viewports) {
      test(`${routePath} designed empty state stays contained and keeps the waitlist at ${viewport.label}`, async ({ page }) => {
        await page.route("**/api/training/next", async (route) => {
          await route.fulfill({ contentType: "application/json", body: JSON.stringify({ class: null }) })
        })
        await page.setViewportSize(viewport)
        await page.goto(routePath, { waitUntil: "networkidle" })

        const training = page.locator("#training")
        const card = page.locator("#training-form")
        await training.scrollIntoViewIfNeeded()
        await expect(training.getByText("Your next class, announced soon.")).toBeVisible()
        await expect(training.getByText("lining up the next session", { exact: false })).toBeVisible()
        await expect(training.getByText("TBA", { exact: true })).toHaveCount(3)
        await expect(training.getByText("The required NYS course")).toBeVisible()
        await expect(training.getByRole("link", { name: /start your application/i })).toHaveAttribute("href", "/eligibility")
        await expect(page.locator('a[href="#training"]').filter({ hasText: "Next class:" }).first()).toContainText("announced soon")

        const cardBox = await card.boundingBox()
        const mainBox = await card.locator('[data-empty="true"]').first().boundingBox()
        expect(cardBox).not.toBeNull()
        expect(mainBox).not.toBeNull()
        expect(mainBox!.y + mainBox!.height).toBeLessThanOrEqual(cardBox!.y + cardBox!.height + 2)

        await training.getByRole("button", { name: /get notified about the next class/i }).click()
        await expect(training.getByText("Get first notice.")).toBeVisible()
      })
    }
  }

  test("scheduled class keeps the normal booking state unchanged", async ({ page }) => {
    await page.route("**/api/training/next", async (route) => {
      await route.fulfill({ contentType: "application/json", body: JSON.stringify({ class: scheduledClass }) })
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/", { waitUntil: "networkidle" })

    const training = page.locator("#training")
    await training.scrollIntoViewIfNeeded()
    await expect(training.getByText("One day. One certificate.")).toBeVisible()
    await expect(training.getByText("JAN · SAT")).toBeVisible()
    await expect(training.getByText("lining up the next session", { exact: false })).toHaveCount(0)
    await expect(training.getByText("$600", { exact: true })).toBeVisible()
    await expect(training.getByRole("button", { name: /reserve my seat/i })).toBeEnabled()
    await expect(page.locator('a[href="#training"]').filter({ hasText: "Next class:" }).first()).toContainText("Jan 16")
  })

  for (const route of pages) {
    for (const viewport of viewports) {
      test(`${route} ticket is readable and contained at ${viewport.label}`, async ({ page }) => {
        const errors: string[] = []
        page.on("console", (message) => {
          if (message.type() === "error" && !isAllowedPreviewNoise(message.text())) errors.push(message.text())
        })
        page.on("pageerror", (error) => errors.push(error.message))
        await page.setViewportSize(viewport)
        await page.goto(route, { waitUntil: "networkidle" })
        const training = page.locator("#training")
        const card = page.locator("#training-form")
        await training.scrollIntoViewIfNeeded()
        await expect(card).toBeVisible()
        await expect(card.getByText("NYS CCW Licensing Class")).toBeVisible()

        const axe = await new AxeBuilder({ page }).include("#training").withRules(["color-contrast"]).analyze()
        expect(axe.violations, `${route} ${viewport.label} contrast`).toEqual([])

        const bleed = await card.evaluate((element) => {
          const cardBox = element.getBoundingClientRect()
          return [...element.querySelectorAll<HTMLElement>("*")]
            .filter((node) => !node.closest("[data-allow-overflow]"))
            .map((node) => ({ node: node.tagName, box: node.getBoundingClientRect() }))
            .filter(({ box }) => box.width > 0 && box.height > 0)
            .filter(({ box }) => box.left < cardBox.left - 2 || box.right > cardBox.right + 2 || box.top < cardBox.top - 2 || box.bottom > cardBox.bottom + 2)
        })
        expect(bleed, `${route} ${viewport.label} card bleed`).toEqual([])

        const text = await training.innerText()
        expect(text).not.toMatch(/\b(null|undefined|NaN)\b/i)
        expect(text).not.toMatch(/\b(1[3-9]|2[0-3])[–-]\d+\s?PM/)
        expect(errors, `${route} ${viewport.label} console errors`).toEqual([])
        await card.screenshot({ path: path.join("test-results", "training", `${route === "/" ? "home" : route.slice(1).toLowerCase()}-${viewport.label}-ticket.png`) })
      })
    }
  }

  test("preview checkout form and Stripe element mount without CSP errors", async ({ page }, testInfo) => {
    test.skip(!process.env.PLAYWRIGHT_TRAINING_STRIPE_TEST, "requires preview Stripe test keys and an isolated test registration")
    const errors: string[] = []
    page.on("console", (message) => {
      if (message.type() === "error" && !isAllowedPreviewNoise(message.text())) errors.push(message.text())
    })
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto("/", { waitUntil: "networkidle" })
    const card = page.locator("#training-form")
    await card.scrollIntoViewIfNeeded()
    await card.getByRole("button", { name: /reserve my seat/i }).click()
    const form = page.getByRole("region", { name: "Reserve your seat" })
    await expect(form).toBeVisible()
    await form.screenshot({ path: path.join("test-results", "training", "desktop-form-step-1.png") })

    const values: Record<string, string> = {
      "First name": "Preview", "Last name": "Tester", "Date of birth": "1990-01-01", "Mobile": "2125550100",
      "Email": "training-preview@example.test", "Street address": "214 West 102nd Street", "City": "New York", "State": "NY", "ZIP": "10025",
    }
    for (const [label, value] of Object.entries(values)) await form.getByLabel(label).fill(value)
    await form.getByLabel("Gender").selectOption("na")
    await form.getByRole("button", { name: /continue/i }).click()
    await expect(form.getByLabel("U.S. citizen?")).toBeVisible()
    await form.screenshot({ path: path.join("test-results", "training", "desktop-form-step-2.png") })

    await form.getByLabel("U.S. citizen?").selectOption("yes")
    await form.getByLabel("Firearms experience").selectOption("none")
    await form.getByLabel("Background").selectOption("civilian")
    await form.getByLabel("Emergency contact").fill("Preview Contact")
    await form.getByLabel("Their phone").fill("2125550101")
    await form.locator('input[type="file"]').setInputFiles({ name: "id.png", mimeType: "image/png", buffer: Buffer.from("preview-test") })
    await form.getByRole("button", { name: /review & pay/i }).click()
    await expect(form.locator("iframe")).toBeVisible()
    await form.screenshot({ path: path.join("test-results", "training", "desktop-form-step-3.png") })
    expect(errors.filter((message) => /content security policy|stripe/i.test(message))).toEqual([])
    expect(errors).toEqual([])
    await testInfo.attach("stripe-payment-element", { path: path.join("test-results", "training", "desktop-form-step-3.png"), contentType: "image/png" })
  })

  for (const viewport of viewports) {
    test(`preview form steps render at ${viewport.label}`, async ({ page }) => {
      await page.route("**/api/training/id-upload-url", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ signedUrl: "/training-test-upload", fileKey: "pending/00000000-0000-4000-8000-000000000001/test-id.png" }) })
      })
      await page.route("**/training-test-upload", async (route) => { await route.fulfill({ status: 200 }) })
      await page.route("**/api/training/register", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify({ registrationId: "00000000-0000-4000-8000-000000000002", clientSecret: "pi_preview_secret" }) })
      })
      await page.setViewportSize(viewport)
      await page.goto("/", { waitUntil: "networkidle" })
      const card = page.locator("#training-form")
      await card.scrollIntoViewIfNeeded()
      await card.getByRole("button", { name: /reserve my seat/i }).click()
      const form = page.getByRole("region", { name: "Reserve your seat" })
      await expect(form).toBeVisible()
      const name = viewport.label
      await form.screenshot({ path: path.join("test-results", "training", `${name}-form-step-1.png`) })
      const values: Record<string, string> = {
        "First name": "Preview", "Last name": "Tester", "Date of birth": "1990-01-01", "Mobile": "2125550100",
        "Email": "training-preview@example.test", "Street address": "214 West 102nd Street", "City": "New York", "State": "NY", "ZIP": "10025",
      }
      for (const [label, value] of Object.entries(values)) await form.getByLabel(label).fill(value)
      await form.getByLabel("Gender").selectOption("na")
      await form.getByRole("button", { name: /continue/i }).click()
      await expect(form.getByLabel("U.S. citizen?")).toBeVisible()
      await form.screenshot({ path: path.join("test-results", "training", `${name}-form-step-2.png`) })
      await form.getByLabel("U.S. citizen?").selectOption("yes")
      await form.getByLabel("Firearms experience").selectOption("none")
      await form.getByLabel("Background").selectOption("civilian")
      await form.getByLabel("Emergency contact").fill("Preview Contact")
      await form.getByLabel("Their phone").fill("2125550101")
      await form.locator('input[type="file"]').setInputFiles({ name: "id.png", mimeType: "image/png", buffer: Buffer.from("preview-test") })
      await form.getByRole("button", { name: /review & pay/i }).click()
      await expect(form.getByText("Total today")).toBeVisible()
      await form.screenshot({ path: path.join("test-results", "training", `${name}-form-step-3.png`) })
    })
  }
})
