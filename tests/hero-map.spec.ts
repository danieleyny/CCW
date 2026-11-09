import { devices, expect, test } from "@playwright/test"

const V2_ROAD_POINTS: [number, number][] = [
  [232, 792], [263, 747], [312, 710], [375, 698], [430, 687], [521, 651],
  [568, 616], [619, 588], [670, 577], [753, 549], [782, 507], [808, 478],
  [888, 426], [949, 411], [1004, 397], [1048, 386], [1086, 367], [1122, 325],
  [1147, 296], [1156, 285],
]
const V2_RINGS: [number, number][] = [[205, 817], [475, 672], [721, 570.5], [834, 447.5], [1051, 388], [1161.5, 272.5]]
const iPhone14 = Object.fromEntries(Object.entries(devices["iPhone 14"]).filter(([key]) => key !== "defaultBrowserType"))

async function waitForV2Ready(page: import("@playwright/test").Page) {
  await expect(page.getByTestId("hero-map-overlay")).toHaveAttribute("data-gold-ready", "true", { timeout: 8_000 })
}

async function swapMetrics(page: import("@playwright/test").Page) {
  return page.evaluate(async ({ roadPoints, rings }) => {
    const canvas = document.querySelector('[data-testid="hero-map-overlay"]') as HTMLCanvasElement
    const image = canvas.parentElement!.querySelector("img") as HTMLImageElement
    const load = async (src: string) => {
      const asset = new Image()
      asset.src = src
      await asset.decode()
      return asset
    }
    const read = (asset: HTMLImageElement) => {
      const source = document.createElement("canvas")
      source.width = 1448; source.height = 1086
      const context = source.getContext("2d")!
      context.drawImage(asset, 0, 0)
      return context.getImageData(0, 0, source.width, source.height).data
    }
    const goldImage = await load("/images/marketing/v2/hero-v2-gold.webp")
    const baseImage = await load("/images/marketing/v2/hero-v2-base.webp")
    const gold = read(goldImage)
    const base = read(baseImage)
    const pixels = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height).data
    const canvasRect = canvas.getBoundingClientRect()
    const imageRect = image.getBoundingClientRect()
    const toCanvas = (x: number, y: number) => [
      Math.round((imageRect.left - canvasRect.left + x / 1448 * imageRect.width) * canvas.width / canvasRect.width),
      Math.round((imageRect.top - canvasRect.top + y / 1086 * imageRect.height) * canvas.height / canvasRect.height),
    ] as const
    const expectedCanvas = document.createElement("canvas")
    expectedCanvas.width = canvas.width; expectedCanvas.height = canvas.height
    const expectedContext = expectedCanvas.getContext("2d")!
    const scale = canvas.width / canvasRect.width
    expectedContext.drawImage(
      goldImage,
      (imageRect.left - canvasRect.left) * scale,
      (imageRect.top - canvasRect.top) * scale,
      imageRect.width * scale,
      imageRect.height * scale,
    )
    const expectedPixels = expectedContext.getImageData(0, 0, expectedCanvas.width, expectedCanvas.height).data
    const rgba = (buffer: Uint8ClampedArray, width: number, x: number, y: number) => {
      const offset = (Math.max(0, Math.min(width - 1, y)) * width + Math.max(0, Math.min(width - 1, x))) * 4
      return [buffer[offset], buffer[offset + 1], buffer[offset + 2], buffer[offset + 3]] as const
    }
    const delta = (first: readonly number[], second: readonly number[]) => Math.hypot(first[0] - second[0], first[1] - second[1], first[2] - second[2])
    const roadDeltas = roadPoints.map(([x, y]) => {
      const [cx, cy] = toCanvas(x, y)
      let best = Number.POSITIVE_INFINITY
      // The spline and its source artwork were measured independently. A
      // small nearest-pixel window makes the assertion tolerant of browser
      // subpixel resampling, while still requiring a raw gold-map pixel.
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        best = Math.min(best, delta(rgba(pixels, canvas.width, cx + dx, cy + dy), rgba(expectedPixels, canvas.width, cx + dx, cy + dy)))
      }
      return best
    })
    const ringAlpha = rings.map(([x, y]) => {
      const [cx, cy] = toCanvas(x, y)
      let max = 0
      for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) max = Math.max(max, rgba(pixels, canvas.width, cx + dx, cy + dy)[3])
      return max
    })
    const offRoad = [[86, 96], [199, 160], [342, 225], [550, 120], [695, 190], [905, 100], [1060, 170], [1280, 120], [1200, 700], [930, 805]]
    const offRoadAlpha = offRoad.map(([x, y]) => {
      const [cx, cy] = toCanvas(x, y)
      return rgba(pixels, canvas.width, cx, cy)[3]
    })
    const picture = image.parentElement!
    return {
      imageSrc: image.currentSrc,
      filter: getComputedStyle(image).filter,
      tintDisplay: getComputedStyle(picture, "::after").display,
      roadDelta: Math.max(...roadDeltas),
      ringAlpha,
      offRoadAlpha: Math.max(...offRoadAlpha),
      baseGoldDifference: delta(rgba(base, 1448, 86, 96), rgba(gold, 1448, 86, 96)),
    }
  }, { roadPoints: V2_ROAD_POINTS, rings: V2_RINGS })
}

test.describe("V2 hero gold swap", () => {
  for (const viewport of [{ name: "desktop", width: 1440, height: 900 }, { name: "mobile", width: 390, height: 844 }] as const) {
    test.describe(viewport.name, () => {
      test.use({ viewport: { width: viewport.width, height: viewport.height } })

      test("uses the baked base without an extra tint", async ({ page }) => {
        await page.goto("/V2?heroGoldTime=0&heroGoldDecor=off", { waitUntil: "domcontentloaded" })
        await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
        await waitForV2Ready(page)
        const metrics = await swapMetrics(page)
        expect(metrics.imageSrc).toContain("hero-v2-base.webp")
        expect(metrics.filter).toBe("none")
        expect(metrics.tintDisplay).toBe("none")
        expect(metrics.offRoadAlpha).toBeLessThanOrEqual(1)
      })

      test("reveals gold-map pixels only along the completed road", async ({ page }, testInfo) => {
        await page.goto("/V2?heroGoldTime=10.7&heroGoldDecor=off", { waitUntil: "domcontentloaded" })
        await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
        await waitForV2Ready(page)
        await expect(page.getByTestId("hero-map")).toHaveAttribute("data-hero-stage", "6")
        const metrics = await swapMetrics(page)
        // Nearest-pixel sampling allows DPR resampling while requiring the
        // rendered canvas to be indistinguishable from the supplied gold image.
        expect(metrics.roadDelta, JSON.stringify(metrics)).toBeLessThan(7)
        expect(metrics.offRoadAlpha).toBeLessThanOrEqual(1)
        expect(metrics.ringAlpha.every((alpha) => alpha > 10)).toBeTruthy()
        await page.getByTestId("hero-map").screenshot({ path: testInfo.outputPath(`v2-gold-swap-${viewport.name}.png`) })
      })

      test("does not reveal a future ring early", async ({ page }) => {
        await page.goto("/V2?heroGoldTime=2.3&heroGoldDecor=off", { waitUntil: "domcontentloaded" })
        await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
        await waitForV2Ready(page)
        const metrics = await swapMetrics(page)
        expect(metrics.ringAlpha[2]).toBeLessThanOrEqual(1)
      })
    })
  }

  test("moves through chips 01–06 at the specified pace", async ({ page }) => {
    await page.goto("/V2", { waitUntil: "domcontentloaded" })
    await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
    await waitForV2Ready(page)
    const transitions: { stage: number; at: number }[] = []
    let previous = -1
    const started = Date.now()
    while (Date.now() - started < 12_000) {
      const stage = Number(await page.getByTestId("hero-map").getAttribute("data-hero-stage"))
      if (stage > 0 && stage !== previous) transitions.push({ stage, at: Date.now() - started })
      previous = stage
      await page.waitForTimeout(180)
    }
    expect(transitions.map(({ stage }) => stage)).toEqual(expect.arrayContaining([1, 2, 3, 4, 5, 6]))
    for (let index = 1; index < transitions.length; index++) expect(transitions[index].at - transitions[index - 1].at).toBeGreaterThanOrEqual(1_600)
  })

  test("renders the complete static gold state on iPhone 14 without overflow", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto("/V2", { waitUntil: "domcontentloaded" })
    await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
    await waitForV2Ready(page)
    await expect(page.getByTestId("hero-map")).toHaveAttribute("data-hero-stage", "6")
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy()
  })
})

test.describe("V2 hero gold swap · iPhone 14 WebKit profile", () => {
  test.use(iPhone14)
  test("holds the pixel-matched route in its mobile map", async ({ page }) => {
    await page.goto("/V2?heroGoldTime=10.7&heroGoldDecor=off", { waitUntil: "domcontentloaded" })
    await page.getByTestId("hero-map").scrollIntoViewIfNeeded()
    await waitForV2Ready(page)
    const metrics = await swapMetrics(page)
    expect(metrics.roadDelta).toBeLessThan(8)
    expect(metrics.offRoadAlpha).toBeLessThanOrEqual(1)
  })
})
