import AxeBuilder from "@axe-core/playwright"
import { devices, expect, test } from "@playwright/test"

const homeRoutes = ["/", "/V1", "/V2", "/V3", "/V4"]
const innerRoutes = [
  "/about", "/book", "/checklist", "/contact", "/cost", "/denied-appeal",
  "/disqualifiers", "/do-i-need-a-lawyer", "/eligibility", "/faq", "/fees",
  "/glossary", "/gun-license", "/gun-license/bronx", "/gun-license/brooklyn",
  "/gun-license/manhattan", "/gun-license/queens", "/gun-license/staten-island",
  "/how-it-works", "/instructors", "/non-resident-business", "/partners",
  "/premises-vs-carry", "/pricing", "/privacy", "/reciprocity", "/renewal",
  "/requirements", "/resources", "/retired-leo", "/timeline", "/yarivbenari",
  "/auth/login",
]
const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
] as const
// Use iPhone's viewport, touch, and user-agent in both configured engines.
// defaultBrowserType belongs to the Playwright project, not a nested describe.
const iPhone14 = Object.fromEntries(Object.entries(devices["iPhone 14"]).filter(([key]) => key !== "defaultBrowserType"))

async function auditPage(page: import("@playwright/test").Page, path: string) {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("vercel.live")) errors.push(message.text())
  })
  await page.goto(path, { waitUntil: "networkidle" })
  await page.evaluate(() => document.fonts.ready)
  // Marketing hero copy has a calm client-side first-load reveal. Baselines
  // capture the settled page, never the intentionally blank first animation frame.
  await page.waitForFunction(() => {
    const heading = document.querySelector("h1")
    return !heading || getComputedStyle(heading).opacity !== "0"
  })

  // next/font scopes the physical families with a build hash. Verify the real
  // face is available and headings resolve to that face rather than a fallback.
  const type = await page.evaluate(async () => ({
    faces: [...document.fonts].map((face) => face.family),
    headings: [...document.querySelectorAll("h1,h2,h3")].map((heading) => getComputedStyle(heading).fontFamily),
    loaded: await document.fonts.ready.then(() => [
      document.fonts.check('16px "Hanken Grotesk"'),
      document.fonts.check('40px "Bodoni Moda"'),
      document.fonts.check('12px "IBM Plex Mono"'),
    ]),
  }))
  expect(type.faces.join(" ")).toMatch(/Hanken Grotesk/)
  expect(type.faces.join(" ")).toMatch(/Bodoni Moda/)
  expect(type.faces.join(" ")).toMatch(/IBM Plex Mono/)
  expect(type.loaded).toEqual([true, true, true])
  expect(type.headings.some((family) => /^(Georgia|ui-)/.test(family))).toBeFalsy()

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  // Cards use semantic buttons for their full surface; these are the actual
  // compact controls whose labels must never wrap.
  expect(await page.locator("a[class*=btn], button.reserve, button.continue, button[type=submit]").evaluateAll((nodes) => nodes.filter((node) => getComputedStyle(node).display !== "none").every((node) => node.getBoundingClientRect().height <= 56.5))).toBeTruthy()
  expect(await page.locator("main p strong").evaluateAll((nodes) => nodes.every((node) => getComputedStyle(node).display !== "block"))).toBeTruthy()
  expect(errors).toEqual([])
}

for (const viewport of viewports) {
  test.describe(`site polish · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    for (const path of homeRoutes) {
      test(`home ${path}`, async ({ page }, testInfo) => {
        await auditPage(page, path)
        await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}-${viewport.name}.png`), fullPage: true })
        // The audit is retained for every route/viewport. Colorway-specific
        // decorative canvases are excluded because canvas raster blends cannot
        // be evaluated by axe as text foreground/background pairs.
        const contrast = await new AxeBuilder({ page })
          .withTags(["wcag2aa"])
          .exclude("canvas, [aria-hidden='true'], [data-wyg-vignette]")
          .analyze()
        expect(contrast.violations.filter((violation) => violation.id === "color-contrast")).toEqual([])
      })
    }

    for (const path of innerRoutes) {
      test(`inner ${path}`, async ({ page }, testInfo) => {
        await auditPage(page, path)
        await page.screenshot({ path: testInfo.outputPath(`${path.replaceAll("/", "-").replace(/^-/, "")}-${viewport.name}.png`), fullPage: true })
        const contrast = await new AxeBuilder({ page }).withTags(["wcag2aa"]).exclude("canvas, [aria-hidden='true'], [data-wyg-vignette]").analyze()
        expect(contrast.violations.filter((violation) => violation.id === "color-contrast")).toEqual([])
      })
    }
  })
}

test.describe("V2 repair master · iPhone 14", () => {
  test.use(iPhone14)

  test("draws the closing route and completes a CTA pulse", async ({ page }) => {
    await page.goto("/V2", { waitUntil: "networkidle" })
    const closing = page.locator("#closing")
    await closing.scrollIntoViewIfNeeded()
    await page.waitForTimeout(2_600)
    const canvas = closing.locator("canvas[class*=path]")
    expect(await canvas.evaluate((node) => (node as HTMLCanvasElement).width)).toBeGreaterThan(0)
    expect(await canvas.evaluate((node) => {
      const c = node as HTMLCanvasElement
      const pixels = c.getContext("2d")!.getImageData(0, 0, c.width, c.height).data
      return pixels.some((_, index) => index % 4 === 3 && pixels[index] > 0)
    })).toBeTruthy()
    await page.waitForTimeout(5_100)
    await expect(closing.locator("[data-pulsed=true]")).toHaveCount(1)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  })
})

test("P0 content wiring", async ({ page }) => {
  await page.goto("/pricing", { waitUntil: "networkidle" })
  await expect(page.getByTestId("pricing-plan")).toHaveCount(2)
  await expect(page.getByTestId("pricing-plan").filter({ hasText: /\$/ })).toHaveCount(2)

  await page.goto("/checklist", { waitUntil: "networkidle" })
  for (const track of ["I live in NYC", "I run a business in NYC", "Outside NYC (Special Carry)"]) {
    await page.getByRole("button", { name: track }).click()
    const count = await page.getByTestId("checklist-count").innerText()
    await expect(page.getByTestId("checklist-item")).toHaveCount(Number(count))
    expect(Number(count)).toBeGreaterThan(0)
  }
})

const mapSamples: [number, number][] = [
  // Five samples along the first completed leg. At six seconds this leg has
  // settled in every loop, while later legs can intentionally still be moving.
  [0.144, 0.757], [0.1483, 0.754], [0.1527, 0.751], [0.1571, 0.7487], [0.1616, 0.746],
]

function toLab([red, green, blue]: [number, number, number]) {
  const channel = (value: number) => (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  const r = channel(red / 255), g = channel(green / 255), b = channel(blue / 255)
  const x = (r * 0.4124 + g * 0.3576 + b * 0.1805) / 0.95047
  const y = r * 0.2126 + g * 0.7152 + b * 0.0722
  const z = (r * 0.0193 + g * 0.1192 + b * 0.9505) / 1.08883
  const pivot = (value: number) => value > 0.008856 ? Math.cbrt(value) : 7.787 * value + 16 / 116
  const px = pivot(x), py = pivot(y), pz = pivot(z)
  return [116 * py - 16, 500 * (px - py), 200 * (py - pz)]
}

function deltaE(a: [number, number, number], b: [number, number, number]) {
  const one = toLab(a), two = toLab(b)
  return Math.hypot(one[0] - two[0], one[1] - two[1], one[2] - two[2])
}

async function mapPatches(page: import("@playwright/test").Page, overlay: Buffer, base: Buffer, points: [number, number][]) {
  return page.evaluate(async ({ overlay, base, points }) => {
    const load = async (src: string) => {
      const image = new Image()
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error("Could not read map screenshot")); image.src = src })
      const canvas = document.createElement("canvas")
      canvas.width = image.width; canvas.height = image.height
      const context = canvas.getContext("2d")!
      context.drawImage(image, 0, 0)
      return context
    }
    const [withRoute, withoutRoute] = await Promise.all([load(overlay), load(base)])
    return points.map(([x, y]) => {
      const centerX = Math.round(x * (withRoute.canvas.width - 1)), centerY = Math.round(y * (withRoute.canvas.height - 1))
      const patch: [number[], number[]][] = []
      // Fractional line rasterization varies by engine/device scale. Sample a
      // tiny physical-pixel neighborhood centered on each route anchor.
      for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
        const px = Math.max(0, Math.min(withRoute.canvas.width - 1, centerX + dx)), py = Math.max(0, Math.min(withRoute.canvas.height - 1, centerY + dy))
        patch.push([
          [...withRoute.getImageData(px, py, 1, 1).data.slice(0, 3)],
          [...withoutRoute.getImageData(px, py, 1, 1).data.slice(0, 3)],
        ])
      }
      return patch
    })
  }, { overlay: `data:image/png;base64,${overlay.toString("base64")}`, base: `data:image/png;base64,${base.toString("base64")}`, points })
}

test.describe("booking form and colorway map · iPhone 14", () => {
  test.use(iPhone14)

  for (const path of homeRoutes) {
    test(`${path} keeps the booking form contained and its map route visible`, async ({ page }, testInfo) => {
      await page.goto(path, { waitUntil: "networkidle" })
      await page.locator("#training").scrollIntoViewIfNeeded()
      const reserve = page.getByRole("button", { name: /reserve my seat/i })
      await expect(reserve).toBeEnabled()
      await reserve.click()
      const form = page.locator('[role="region"][aria-label="Reserve your seat"]')
      await expect(form).toBeVisible()
      // Let the intentional focus/scroll handoff settle before comparing the
      // sticky header's geometry on both browser engines.
      await page.waitForTimeout(900)
      const card = page.locator("#training-form")
      const cardBox = await card.boundingBox()
      expect(cardBox).not.toBeNull()
      const boxes = await form.locator("input, select, textarea").evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect()
        return { left: rect.left, right: rect.right }
      }))
      for (const rect of boxes) {
        expect(rect.left).toBeGreaterThanOrEqual(cardBox!.x + 16)
        expect(rect.right).toBeLessThanOrEqual(cardBox!.x + cardBox!.width - 16)
      }
      for (const height of await form.locator('[class*="label"]').evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height))) expect(height).toBeLessThanOrEqual(22)
      const title = await form.locator('[class*="bookingTitleRow"] h3').boundingBox()
      const price = await form.locator('[class*="bookingTitleRow"] > p > strong').boundingBox()
      expect(Math.abs(title!.y - price!.y)).toBeLessThanOrEqual(4)
      expect(await form.evaluate((node) => {
        const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT)
        while (walker.nextNode()) if (walker.currentNode.textContent?.trimStart().startsWith("·")) return false
        return true
      })).toBeTruthy()
      const switcher = page.locator(".colorway-switcher")
      if (await switcher.count()) await expect(switcher).toHaveCSS("display", "none")
      const fontSize = await form.locator('input[name="firstName"], input').first().evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize))
      expect(fontSize).toBeGreaterThanOrEqual(16)
      await form.locator("input").first().fill("Alex")
      expect(await page.evaluate(() => window.visualViewport?.scale ?? 1)).toBe(1)
      await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}-form-mobile.png`), fullPage: false })

      await form.getByRole("button", { name: /close sign-up/i }).click()
      await page.locator('[data-testid="hero-map"]').scrollIntoViewIfNeeded()
      await page.waitForTimeout(6_000)
      const map = page.getByTestId("hero-map")
      const withOverlay = await map.screenshot()
      await page.getByTestId("hero-map-overlay").evaluate((node) => { (node as HTMLElement).style.visibility = "hidden" })
      const withoutOverlay = await map.screenshot()
      const patches = await mapPatches(page, withOverlay, withoutOverlay, mapSamples)
      const contrasts = patches.map((patch) => Math.max(...patch.map(([value, base]) => deltaE(value as [number, number, number], base as [number, number, number]))))
      expect(Math.min(...contrasts), `map ΔE values: ${contrasts.map((value) => value.toFixed(1)).join(", ")}`).toBeGreaterThan(25)
      await page.screenshot({ path: testInfo.outputPath(`${path === "/" ? "home" : path.slice(1)}-map-mobile.png`), fullPage: false })
    })
  }
})

const v2StationPoints: [number, number][] = [[205,822],[475,675],[722,571],[835,449],[1048,386],[1165,275]]

function hslHue(red: number, green: number, blue: number) {
  const r = red / 255, g = green / 255, b = blue / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min
  if (!delta) return -1
  const hue = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4
  return ((hue * 60) + 360) % 360
}

for (const viewport of viewports) {
  test.describe(`V2 navy and champagne · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test("keeps the accent system constrained and the map path gold", async ({ page }) => {
      const errors: string[] = []
      page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("vercel.live")) errors.push(message.text()) })
      await page.goto("/V2?heroGoldTime=10.7", { waitUntil: "networkidle" })
      await page.waitForTimeout(500)

      const logoArcs = await page.locator('[data-theme="v2"]').evaluate((scope) => [...scope.querySelectorAll('path[stroke*="logo-arc"]')].slice(0, 5).map((path) => getComputedStyle(path).stroke))
      expect(logoArcs).toEqual(["rgb(47, 168, 238)", "rgb(91, 108, 255)", "rgb(138, 91, 234)", "rgb(194, 79, 201)", "rgb(238, 94, 140)"])

      const stations = await page.getByTestId("hero-map-overlay").evaluate((canvas, points) => {
        const c = canvas as HTMLCanvasElement
        const ctx = c.getContext("2d")!
        return points.map(([x, y]) => {
          const rect = c.getBoundingClientRect()
          const image = c.parentElement!.querySelector("img")!.getBoundingClientRect()
          const cx = Math.round((image.left - rect.left + x / 1448 * image.width) * c.width / rect.width), cy = Math.round((image.top - rect.top + y / 1086 * image.height) * c.height / rect.height)
          const swatches: number[][] = []
          for (let dy = -14; dy <= 14; dy++) for (let dx = -14; dx <= 14; dx++) {
            const px = Math.max(0, Math.min(c.width - 1, cx + dx)), py = Math.max(0, Math.min(c.height - 1, cy + dy))
            swatches.push([...ctx.getImageData(px, py, 1, 1).data])
          }
          return swatches
        })
      }, v2StationPoints)
      const matchedStations = stations.filter((swatches) => swatches.some(([red, green, blue, alpha]) => alpha > 25 && hslHue(red, green, blue) >= 30 && hslHue(red, green, blue) <= 50))
      // The supplied route traverses the full-resolution image within an
      // independently scaled content box. Assert several anchors visibly land
      // on gold without creating synthetic station circles.
      expect(matchedStations.length).toBeGreaterThanOrEqual(3)

      const v2State = await page.evaluate(() => {
        const goldButtons = [...document.querySelectorAll("a,button")].filter((element) => {
          const style = getComputedStyle(element)
          return element.getClientRects().length > 0 && style.visibility !== "hidden" && /217, 178, 95|243, 220, 156|196, 154, 71/.test(style.backgroundImage)
        })
        const legal = getComputedStyle(document.querySelector("#legal")!, "::before").content
        const promise = getComputedStyle(document.querySelector(".promise")!, "::before").content
        const chip = document.querySelector("[class*=chipBad]")
        return {
          overflow: document.documentElement.scrollWidth > window.innerWidth,
          goldButtons: goldButtons.length,
          legal,
          promise,
          mismatchHeight: chip?.getBoundingClientRect().height ?? 0,
        }
      })
      expect(v2State.goldButtons).toBe(1)
      expect(v2State.legal).not.toContain("CANDOR")
      expect(v2State.promise).not.toContain("OWN THE WORK")
      expect(v2State.overflow).toBeFalsy()
      if (viewport.name === "mobile") expect(v2State.mismatchHeight).toBeLessThanOrEqual(22)

      const contrast = await new AxeBuilder({ page }).withTags(["wcag2aa"]).exclude("canvas, [aria-hidden='true'], [data-wyg-vignette]").analyze()
      expect(contrast.violations.filter((violation) => violation.id === "color-contrast")).toEqual([])
      expect(errors).toEqual([])
    })

    test("uses static V2 glint and sparkle frames when reduced motion is requested", async ({ page }) => {
      await page.emulateMedia({ reducedMotion: "reduce" })
      await page.goto("/V2", { waitUntil: "networkidle" })
      const state = await page.evaluate(() => {
        const ink = document.querySelector('[class*=inkText]')!
        const canvas = document.querySelector('[data-testid="hero-map-overlay"]') as HTMLCanvasElement
        return { animation: getComputedStyle(ink).animationName, alpha: canvas.getContext("2d")!.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data[3] }
      })
      expect(state.animation).toBe("none")
      expect(state.alpha).toBeGreaterThanOrEqual(0)
    })
  })
}

for (const viewport of viewports) {
  test.describe(`V2 repair master · ${viewport.name}`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } })

    test("keeps one calibrated hero road and an alive closing path", async ({ page }, testInfo) => {
      const warnings: string[] = []
      page.on("console", (message) => { if (message.type() === "warning") warnings.push(message.text()) })
      await page.goto("/V2", { waitUntil: "networkidle" })
      const hero = page.getByTestId("hero-map")
      const heroCanvas = page.getByTestId("hero-map-overlay")
      await expect(hero).toHaveAttribute("data-hero-stage", "6", { timeout: 15_000 })
      const road = await heroCanvas.evaluate((canvas, points) => {
        const c = canvas as HTMLCanvasElement
        const ctx = c.getContext("2d")!
        const rect = c.getBoundingClientRect()
        const image = c.parentElement!.querySelector("img")!.getBoundingClientRect()
        return points.map(([x, y]) => {
          const cx = Math.round((image.left - rect.left + x / 1448 * image.width) * c.width / rect.width)
          const cy = Math.round((image.top - rect.top + y / 1086 * image.height) * c.height / rect.height)
          let gold = 0
          for (let dy = -8; dy <= 8; dy++) for (let dx = -8; dx <= 8; dx++) {
            const [r, g, b, a] = ctx.getImageData(Math.max(0, cx + dx), Math.max(0, cy + dy), 1, 1).data
            if (a > 125 && r > 150 && g > 105 && b < 125) gold++
          }
          return gold
        })
      }, v2StationPoints)
      expect(road.filter((sample) => sample > 8).length, `gold samples: ${road.join(", ")}`).toBeGreaterThanOrEqual(5)
      await expect(page.getByTestId("hero-map-finale")).toHaveAttribute("data-on", "true")
      await hero.screenshot({ path: testInfo.outputPath(`hero-${viewport.name}.png`) })

      const closing = page.locator("#closing")
      await closing.scrollIntoViewIfNeeded()
      await page.waitForTimeout(2_600)
      await expect(closing.locator("[data-path-mode=v2]")).toHaveCount(1)
      const alive = await closing.evaluate((node) => {
        const canvas = node.querySelector("canvas[class*=path]") as HTMLCanvasElement
        const heading = node.querySelector("h2")!.getBoundingClientRect()
        const lede = node.querySelector("[data-closing-lede]")!.getBoundingClientRect()
        const rect = canvas.getBoundingClientRect()
        const data = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data
        let alpha = 0
        for (let index = 3; index < data.length; index += 4) alpha += data[index]
        return { width: canvas.width, height: canvas.height, alpha, heading, lede, rect }
      })
      expect(alive.width).toBeGreaterThan(0)
      expect(alive.height).toBeGreaterThan(0)
      expect(alive.alpha).toBeGreaterThan(0)
      await page.waitForTimeout(5_100)
      await expect(closing.locator("[data-pulsed=true]")).toHaveCount(1)
      await closing.screenshot({ path: testInfo.outputPath(`closing-${viewport.name}.png`) })
      expect(warnings.filter((warning) => /canvas.*0/i.test(warning))).toEqual([])
    })
  })
}
