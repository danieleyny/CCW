import AxeBuilder from "@axe-core/playwright"
import { expect, test, type Page } from "@playwright/test"

const quizKey = "carry_eligibility_quiz"

async function openFresh(page: Page, width = 1440) {
  await page.setViewportSize({ width, height: width < 600 ? 844 : 1000 })
  await page.goto("/eligibility")
  await page.evaluate((key) => localStorage.removeItem(key), quizKey)
  await page.reload()
  await expect(page.getByRole("heading", { name: "Do you qualify?" })).toBeVisible()
}

async function answer(page: Page, label: RegExp) {
  await page.getByRole("button", { name: label }).click()
}

async function answerLikelyPath(page: Page) {
  await answer(page, /Yes, I'm 21 or older/)
  await answer(page, /I live in one of the five boroughs/)
  await answer(page, /Yes, I’ve completed it/)
  await answer(page, /No, nothing that disqualifies me/)
  await answer(page, /No, none that applies/)
  await answer(page, /Yes, I have a safe/)
}

test.describe("eligibility experience", () => {
  for (const width of [1440, 390]) {
    test(`likely path is complete and contained at ${width}px`, async ({ page }) => {
      await openFresh(page, width)
      await answerLikelyPath(page)

      await expect(page.getByRole("heading", { name: "Here’s where you stand." })).toBeVisible()
      await expect(page.getByRole("heading", { name: "You likely qualify" })).toBeVisible()
      await expect(page.getByRole("heading", { name: "Start your application" })).toBeVisible()
      await expect(page.locator('input[name="track"]')).toHaveValue("resident")
      await expect(page.locator('input[name="eligibility"]')).toHaveValue(
        JSON.stringify({
          age: "yes",
          location: "resident",
          training: "done",
          convictions: "none",
          history: "none",
          storage: "yes",
        })
      )
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
      await page.waitForTimeout(600)

      const accessibility = await new AxeBuilder({ page })
        .include("main")
        .exclude("canvas, [aria-hidden='true']")
        .withTags(["wcag2aa"])
        .analyze()
      expect(accessibility.violations.filter((violation) => violation.id === "color-contrast")).toEqual([])
    })
  }

  test("age under 21 exits early without a form and can start over", async ({ page }) => {
    await openFresh(page)
    await answer(page, /No, I'm under 21/)
    await expect(page.getByRole("heading", { name: "You must be 21 to apply" })).toBeVisible()
    await expect(page.locator('form[data-lead-form="form"]')).toHaveCount(0)
    await page.locator("dl > div").getByRole("button", { name: "Change" }).click()
    await expect(page.getByRole("heading", { name: "Are you 21 years of age or older?" })).toBeVisible()
    await answer(page, /No, I'm under 21/)
    await page.getByRole("button", { name: "Start over" }).click()
    await expect(page.getByRole("heading", { name: "Are you 21 years of age or older?" })).toBeVisible()
    expect(await page.evaluate((key) => localStorage.getItem(key), quizKey)).toBeNull()
  })

  test("conviction routes to confidential attorney review", async ({ page }) => {
    await openFresh(page)
    await answer(page, /Yes, I'm 21 or older/)
    await answer(page, /I live in one of the five boroughs/)
    await answer(page, /Yes, I’ve completed it/)
    await answer(page, /Yes, I have a conviction/)
    await expect(page.getByRole("heading", { name: "This is a question for a lawyer" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Request a confidential review" })).toBeVisible()
    await expect(page.getByRole("link", { name: /Do I need a lawyer/i })).toHaveAttribute(
      "href",
      "/do-i-need-a-lawyer"
    )
  })

  test("mental-health or restraining-order history routes to review", async ({ page }) => {
    await openFresh(page)
    await answer(page, /Yes, I'm 21 or older/)
    await answer(page, /I live in one of the five boroughs/)
    await answer(page, /Yes, I’ve completed it/)
    await answer(page, /No, nothing that disqualifies me/)
    await answer(page, /Yes, I have history to discuss/)
    await expect(page.getByRole("heading", { name: "Let's talk this through first" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Request a confidential review" })).toBeVisible()
  })

  test("change returns to that answer and refresh resumes in progress", async ({ page }) => {
    await openFresh(page)
    await answerLikelyPath(page)
    const locationRow = page.locator("dl > div").filter({ hasText: "Location" })
    await locationRow.getByRole("button", { name: "Change" }).click()
    await expect(page.getByRole("heading", { name: "Where are you based?" })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { name: "Where are you based?" })).toBeVisible()
    await expect(page.getByRole("button", { name: /I live in one of the five boroughs/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  test("mid-quiz refresh resumes and checklist reuses the saved track", async ({ page }) => {
    await openFresh(page)
    await answer(page, /Yes, I'm 21 or older/)
    await answer(page, /I live outside NYC \(Special Carry\)/)
    await expect(page.getByRole("heading", { name: /Have you completed/ })).toBeVisible()
    await page.reload()
    await expect(page.getByRole("heading", { name: /Have you completed/ })).toBeVisible()

    await page.goto("/checklist")
    await expect(page.getByRole("button", { name: "Outside NYC (Special Carry)" })).toHaveAttribute(
      "aria-pressed",
      "true"
    )
  })

  test("keyboard answers and Backspace returns to the prior question", async ({ page }) => {
    await openFresh(page)
    await page.keyboard.press("1")
    await expect(page.getByRole("heading", { name: "Where are you based?" })).toBeVisible()
    await page.keyboard.press("Backspace")
    await expect(page.getByRole("heading", { name: "Are you 21 years of age or older?" })).toBeVisible()
  })
})
