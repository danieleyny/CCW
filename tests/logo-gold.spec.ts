import { expect, test } from "@playwright/test"

const GOLD = "rgb(211, 179, 107)"

async function readMark(page: import("@playwright/test").Page) {
  const edge = page.locator('g[class*="edge"]').first()
  await expect(edge).toBeVisible()

  return edge.evaluate((node) => {
    const svg = node.closest("svg")!
    const arcs = [...svg.querySelectorAll('path[stroke*="logo-arc"]')]

    return {
      edgePaths: node.querySelectorAll(":scope > path").length,
      arcStrokes: arcs.map((arc) => getComputedStyle(arc).stroke),
    }
  })
}

test.describe("solid-frame gold brand mark", () => {
  for (const path of ["/admin", "/portal", "/auth/login"]) {
    test(`${path} renders the shared gold mark`, async ({ page }) => {
      await page.goto(path, { waitUntil: "networkidle" })
      const mark = await readMark(page)

      expect(mark.edgePaths).toBe(2)
      expect(mark.arcStrokes).toEqual(Array(5).fill(GOLD))
    })
  }

  test("V3 keeps its own comparison colorway", async ({ page }) => {
    await page.goto("/V3", { waitUntil: "networkidle" })
    const mark = await readMark(page)

    expect(mark.edgePaths).toBe(2)
    expect(mark.arcStrokes).toEqual([
      "rgb(47, 93, 80)",
      "rgb(63, 110, 90)",
      "rgb(102, 123, 87)",
      "rgb(149, 127, 82)",
      "rgb(176, 141, 87)",
    ])
  })

  test("V2 gold ring completes its 40-second turn without wobble", async ({ page }) => {
    test.setTimeout(55_000)
    await page.goto("/V2", { waitUntil: "networkidle" })

    const arcs = page.locator('g[class*="arcs"]').first()
    await expect(arcs).toBeVisible()
    const startingCenter = await arcs.evaluate((node) => {
      const box = node.getBoundingClientRect()
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    })

    for (let step = 0; step < 5; step += 1) {
      await page.waitForTimeout(8_000)
      const frame = await arcs.evaluate((node) => {
        const box = node.getBoundingClientRect()
        return {
          x: box.x + box.width / 2,
          y: box.y + box.height / 2,
          stroke: getComputedStyle(node.querySelector("path")!).stroke,
        }
      })
      expect(frame.stroke).toBe(GOLD)
      expect(Math.abs(frame.x - startingCenter.x)).toBeLessThan(0.75)
      expect(Math.abs(frame.y - startingCenter.y)).toBeLessThan(0.75)
    }
  })

  test("reduced motion disables every logo animation", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    await page.goto("/V2", { waitUntil: "networkidle" })

    const animations = await page.locator('svg:has(g[class*="arcs"])').first().evaluate((svg) =>
      ["edge", "arcs", "ticks", "ring", "dot", "ping"].map((hook) => {
        const node = svg.querySelector(`[class*="${hook}"]`)
        return node ? getComputedStyle(node).animationName : null
      })
    )
    expect(animations).toEqual(Array(6).fill("none"))
  })
})
