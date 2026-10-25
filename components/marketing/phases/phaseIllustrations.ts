// Five story animations, one per phase. Each draws one frame for loop position u ∈ [0,1).

export type IlloFrame = {
  c: CanvasRenderingContext2D
  w: number
  h: number
  u: number
  vis: number
  col: string
  compact: boolean
}

// The site loads JetBrains Mono through next/font in app/layout.tsx.
const MONO = '"Azeret Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
const AMB = "#E8B07A"
const DIM = "#3A4A5A"
const MID = "#5E6B78"
const BRIGHT = "#F4F7F9"
const LABEL = "#8A99A6"
const CARD = "#132435"
const TAU = Math.PI * 2

const ez = (u: number) => {
  const x = Math.max(0, Math.min(1, u))
  return x * x * (3 - 2 * x)
}
const seg = (u: number, a: number, b: number) => Math.max(0, Math.min(1, (u - a) / (b - a)))
const bez = (p0: number[], p1: number[], p2: number[], p3: number[], u: number) => {
  const m = 1 - u
  return [
    m * m * m * p0[0] + 3 * m * m * u * p1[0] + 3 * m * u * u * p2[0] + u * u * u * p3[0],
    m * m * m * p0[1] + 3 * m * m * u * p1[1] + 3 * m * u * u * p2[1] + u * u * u * p3[1],
  ]
}

function kit(f: IlloFrame) {
  const { c, vis } = f
  const fs = f.compact ? 8.5 : 10
  const dot = (x: number, y: number, r: number, col: string, a: number) => {
    const al = a * vis
    if (al <= 0.01) return
    c.globalAlpha = Math.min(1, al)
    c.fillStyle = col
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
  }
  const rr = (x: number, y: number, w: number, h: number, r: number) => {
    c.beginPath()
    c.moveTo(x + r, y)
    c.arcTo(x + w, y, x + w, y + h, r)
    c.arcTo(x + w, y + h, x, y + h, r)
    c.arcTo(x, y + h, x, y, r)
    c.arcTo(x, y, x + w, y, r)
    c.closePath()
  }
  const txt = (
    s: string,
    x: number,
    y: number,
    col: string,
    a: number,
    size = fs,
    align: CanvasTextAlign = "left",
    weight = 500
  ) => {
    c.globalAlpha = a * vis
    c.fillStyle = col
    c.font = `${weight} ${size}px ${MONO}`
    c.textAlign = align
    c.textBaseline = "middle"
    c.fillText(s, x, y)
  }
  const tick = (x: number, y: number, s: number, col: string, a = 1) => {
    c.globalAlpha = a * vis
    c.strokeStyle = col
    c.lineWidth = 1.8
    c.lineCap = "round"
    c.lineJoin = "round"
    c.beginPath()
    c.moveTo(x - s * 0.5, y)
    c.lineTo(x - s * 0.12, y + s * 0.38)
    c.lineTo(x + s * 0.55, y - s * 0.4)
    c.stroke()
  }
  const ring = (x: number, y: number, r: number, stroke: string, fill = "#0F1D2B") => {
    c.globalAlpha = vis
    c.fillStyle = fill
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.fill()
    c.strokeStyle = stroke
    c.lineWidth = 1.4
    c.beginPath()
    c.arc(x, y, r, 0, TAU)
    c.stroke()
  }
  return { dot, rr, txt, tick, ring, fs }
}

// 01 QUALIFY: intake routes you onto the right track; legal questions are flagged for an attorney.
function qualify(f: IlloFrame) {
  const { w, h, u, col, compact } = f
  const { dot, txt, tick, ring, fs } = kit(f)
  const y0 = h * 0.5
  const x0 = 22
  const xf = w * 0.34
  const xe = w - (compact ? 96 : 130)
  const ends = [
    [xe, h * 0.2],
    [xe, h * 0.5],
    [xe, h * 0.8],
  ]
  const labels = ["CARRY TRACK", "PREMISES TRACK", "ATTORNEY REVIEW"]

  for (let x = x0; x <= xf; x += 6) dot(x, y0, 1.1, MID, 0.4)
  for (let q = 0; q < 4; q++) {
    const qx = x0 + 10 + (q * (xf - x0 - 20)) / 3
    const on = u > 0.05 + q * 0.07
    dot(qx, y0, on ? 3.4 : 2.6, on ? col : MID, on ? 1 : 0.5)
  }
  txt("INTAKE", x0, y0 - 16, LABEL, 1)

  const pick = ez(seg(u, 0.36, 0.62))
  const flag = ez(seg(u, 0.5, 0.78))
  const ctrl = (e: number[]) => [
    [xf, y0],
    [xf + (e[0] - xf) * 0.45, y0],
    [xf + (e[0] - xf) * 0.45, e[1]],
    e,
  ]

  ends.forEach((e, b) => {
    const [p0, p1, p2, p3] = ctrl(e)
    for (let k = 0; k <= 40; k++) {
      const pt = bez(p0, p1, p2, p3, k / 40)
      const lit = (b === 0 && k / 40 <= pick) || (b === 2 && k / 40 <= flag)
      dot(pt[0], pt[1], lit ? 1.6 : 1, lit ? (b === 2 ? AMB : col) : MID, lit ? 0.9 : 0.3)
    }
    const reached = (b === 0 && pick >= 1) || (b === 2 && flag >= 1)
    ring(e[0], e[1], 7, reached ? (b === 2 ? AMB : col) : MID)
    const lc = b === 0 ? (pick >= 1 ? BRIGHT : LABEL) : b === 2 ? (flag >= 1 ? AMB : LABEL) : MID
    txt(labels[b], e[0] + 14, e[1], lc, 1, fs, "left", 600)
  })

  if (pick > 0 && pick < 1) {
    const [p0, p1, p2, p3] = ctrl(ends[0])
    const hp = bez(p0, p1, p2, p3, pick)
    dot(hp[0], hp[1], 4, "#FFFFFF", 1)
  }
  if (flag > 0 && flag < 1) {
    const [p0, p1, p2, p3] = ctrl(ends[2])
    const fp = bez(p0, p1, p2, p3, flag)
    dot(fp[0], fp[1], 3.4, AMB, 1)
  }
  if (pick >= 1) tick(ends[0][0], ends[0][1], 8, col)
  if (flag >= 1) txt("!", ends[2][0], ends[2][1] + 0.5, AMB, 1, 10, "center", 700)
}

// 02 TRAIN: finish the 18-hour course, then file inside the six-month certificate window.
function train(f: IlloFrame) {
  const { c, w, h, u, col, compact, vis } = f
  const { dot, rr, txt, tick, fs } = kit(f)
  const x0 = 22
  const x1 = w - 22
  const ty = h * 0.7
  const lit = Math.floor(seg(u, 0.02, 0.32) * 18 + 0.0001)
  const gy0 = compact ? 22 : 26
  const gs = compact ? 9 : 11

  for (let k = 0; k < 18; k++) {
    const on = k < lit
    dot(x0 + (k % 9) * gs, gy0 + Math.floor(k / 9) * gs, on ? 3 : 2.4, on ? col : MID, on ? 1 : 0.5)
  }
  txt(
    lit >= 18 ? "18-HOUR COURSE  ✓" : `18-HOUR COURSE · ${lit}H`,
    x0 + 9 * gs + 10,
    gy0 + gs * 0.5,
    lit >= 18 ? BRIGHT : LABEL,
    1,
    fs,
    "left",
    600
  )

  const xc = x0 + (x1 - x0) * 0.06
  for (let x = x0; x <= x1; x += 6) dot(x, ty, 1.1, MID, 0.4)
  for (let m = 0; m <= 6; m++) {
    const mx = xc + ((x1 - xc) * m) / 6
    c.globalAlpha = vis * 0.5
    c.strokeStyle = MID
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(mx, ty - 4)
    c.lineTo(mx, ty + 4)
    c.stroke()
    if (m > 0) txt(`M${m}`, mx, ty + 15, MID, 1, fs - 1, "center")
  }

  const win = ez(seg(u, 0.32, 0.42))
  if (win > 0) {
    const bw = (x1 - xc) * win
    const by = ty - (compact ? 26 : 30)
    const bh = compact ? 14 : 16
    c.globalAlpha = vis * 0.18
    c.fillStyle = col
    rr(xc, by, bw, bh, 6)
    c.fill()
    c.globalAlpha = vis * 0.7
    c.strokeStyle = col
    c.lineWidth = 1
    rr(xc, by, bw, bh, 6)
    c.stroke()
    if (win >= 1) txt("CERTIFICATE WINDOW · 6 MONTHS", xc + 10, by + bh / 2, BRIGHT, 1, fs - 0.5, "left", 600)
  }

  const go = ez(seg(u, 0.44, 0.74))
  const fx = xc + (x1 - xc) * 0.55
  if (go > 0) {
    const xt = xc + (fx - xc) * go
    dot(xt, ty, 4, "#FFFFFF", 1)
    c.globalAlpha = vis * 0.25
    c.fillStyle = col
    c.beginPath()
    c.arc(xt, ty, 10, 0, TAU)
    c.fill()
  }
  if (u > 0.76) {
    c.globalAlpha = vis
    c.fillStyle = col
    c.beginPath()
    c.arc(fx, ty, 9, 0, TAU)
    c.fill()
    tick(fx, ty, 9, "#0A1520")
    txt("FILED INSIDE THE WINDOW", fx, ty - (compact ? 40 : 48), BRIGHT, seg(u, 0.76, 0.84), fs, "center", 600)
  }
  dot(xc, ty, 3.4, col, 1)
}

// 03 ASSEMBLE: every required piece is gathered and tracked into one case file.
function assemble(f: IlloFrame) {
  const { c, w, h, u, col, compact, vis } = f
  const { dot, rr, txt, fs } = kit(f)
  const items: [string, number][] = [
    ["REFERENCES", 4],
    ["HOUSEHOLD STATEMENTS", 3],
    ["RECORDS", 3],
    ["IDS", 2],
    ["DISCLOSURES", 3],
  ]
  const lx = 22
  const fxx = w - (compact ? 44 : 64)
  const fyy = h * 0.5
  const rowH = (h - 30) / 5
  const step = compact ? 9 : 11
  let done = 0

  items.forEach(([label, n], k) => {
    const y = 15 + rowH * (k + 0.5)
    const p = seg(u, 0.04 + k * 0.13, 0.15 + k * 0.13)
    rr(lx, y - 7, 11, 14, 2)
    c.globalAlpha = vis * (p > 0 ? 1 : 0.5)
    c.strokeStyle = p >= 1 ? col : MID
    c.lineWidth = 1.2
    c.stroke()
    txt(label, lx + 20, y, p >= 1 ? BRIGHT : LABEL, 1, fs, "left", 600)
    const dx0 = fxx - (compact ? 74 : 110)
    for (let j = 0; j < n; j++) {
      const on = p * n > j + 0.2
      dot(dx0 + j * step, y, on ? 3 : 2.4, on ? col : MID, on ? 1 : 0.45)
    }
    if (p >= 1) {
      done++
      const fly = seg(u, 0.15 + k * 0.13, 0.22 + k * 0.13)
      if (fly < 1) {
        const sx = dx0 + n * step
        const q = ez(fly)
        dot(sx + (fxx - sx) * q, y + (fyy - y) * q - Math.sin(q * Math.PI) * 14, 3, col, 1)
      }
    }
  })

  const fw = compact ? 30 : 40
  const fh = fw * 0.78
  c.globalAlpha = vis
  c.fillStyle = CARD
  c.strokeStyle = done >= 5 ? col : LABEL
  c.lineWidth = 1.5
  c.beginPath()
  c.moveTo(fxx - fw / 2, fyy - fh / 2 + 6)
  c.lineTo(fxx - fw / 2 + fw * 0.36, fyy - fh / 2 + 6)
  c.lineTo(fxx - fw / 2 + fw * 0.46, fyy - fh / 2)
  c.lineTo(fxx + fw / 2, fyy - fh / 2)
  c.lineTo(fxx + fw / 2, fyy + fh / 2)
  c.lineTo(fxx - fw / 2, fyy + fh / 2)
  c.closePath()
  c.fill()
  c.stroke()
  txt(`${done}/5`, fxx, fyy + 3, done >= 5 ? BRIGHT : LABEL, 1, fs, "center", 600)
  txt("CASE FILE", fxx, fyy + fh / 2 + 13, LABEL, 1, fs - 1, "center")
}

// 04 REVIEW: a structured completeness check catches the issue before you file.
function review(f: IlloFrame) {
  const { c, w, h, u, col, compact, vis } = f
  const { dot, rr, txt, tick, fs } = kit(f)
  const rows = ["FORMS COMPLETE", "SIGNATURES", "DATES MATCH", "REFERENCES", "STATEMENTS", "DISCLOSURES"]
  const lx = 22
  const top = 12
  const rowH = (h - (compact ? 44 : 50)) / 6
  const scan = seg(u, 0.04, 0.6)
  const sy = top + scan * rowH * 6
  const fixed = u > 0.7

  rows.forEach((label, k) => {
    const y = top + rowH * (k + 0.5)
    const passed = sy > y
    const warn = k === 2 && !fixed
    c.globalAlpha = vis
    c.strokeStyle = passed ? (warn ? AMB : col) : MID
    c.lineWidth = 1.3
    rr(lx, y - 6.5, 13, 13, 3)
    c.stroke()
    if (passed) {
      if (warn) txt("!", lx + 6.5, y + 0.5, AMB, 1, 10, "center", 700)
      else tick(lx + 6.5, y, 7, col)
    }
    txt(label, lx + 24, y, passed ? (warn ? AMB : BRIGHT) : LABEL, 1, fs, "left", 600)
    for (let x = lx + (compact ? 150 : 190); x < w - 24; x += 6) {
      dot(x, y, 1, passed ? (warn ? AMB : col) : DIM, 0.5)
    }
    if (warn && passed) {
      txt("DATE MISMATCH · FIXING", w - 24, y - 11, AMB, seg(u, 0.25, 0.32), fs - 1, "right", 600)
    }
  })

  if (scan > 0 && scan < 1) {
    const gradient = c.createLinearGradient(0, sy - 10, 0, sy + 10)
    gradient.addColorStop(0, "rgba(255,255,255,0)")
    gradient.addColorStop(0.5, "rgba(255,255,255,0.28)")
    gradient.addColorStop(1, "rgba(255,255,255,0)")
    c.globalAlpha = vis
    c.fillStyle = gradient
    c.fillRect(12, sy - 10, w - 24, 20)
  }

  const ready = seg(u, 0.74, 0.82)
  if (ready > 0) {
    const bw = compact ? 150 : 176
    const bx = w / 2 - bw / 2
    const by = h - (compact ? 26 : 30)
    c.globalAlpha = vis * ready
    c.fillStyle = col
    rr(bx, by - 11, bw, 22, 11)
    c.fill()
    txt("READY TO SUBMIT  ✓", w / 2, by, "#0A1520", ready, fs, "center", 700)
  }
}

// 05 YOU SUBMIT: you press submit yourself; the packet goes to the NYPD; next steps queue up.
function submit(f: IlloFrame) {
  const { c, w, h, u, col, compact, vis } = f
  const { dot, rr, txt, fs } = kit(f)
  const px = compact ? 34 : 46
  const py = h * 0.42
  const bx = w * (compact ? 0.36 : 0.33)
  const by = py
  const ex = w - (compact ? 56 : 80)
  const ey = py

  for (let s = 2; s >= 0; s--) {
    c.globalAlpha = vis * (s === 0 ? 1 : 0.6)
    c.fillStyle = CARD
    c.strokeStyle = "rgba(255,255,255,0.18)"
    c.lineWidth = 1
    rr(px - 14 + s * 4, py - 18 - s * 4, 28, 36, 4)
    c.fill()
    c.stroke()
  }
  for (let line = 0; line < 4; line++) {
    for (let dx = 0; dx < 16; dx += 4) dot(px - 8 + dx, py - 10 + line * 6, 0.9, "#DCE6EC", 0.7)
  }
  txt("YOUR PACKET", px, py + 32, LABEL, 1, fs - 1, "center")

  const press = seg(u, 0.22, 0.3)
  const pressed = u > 0.26
  const bw = compact ? 74 : 92
  const bh = compact ? 26 : 30
  const sc = pressed && u < 0.32 ? 0.94 : 1
  c.globalAlpha = vis
  c.fillStyle = pressed ? col : CARD
  c.strokeStyle = col
  c.lineWidth = 1.4
  rr(bx - (bw / 2) * sc, by - (bh / 2) * sc, bw * sc, bh * sc, 8)
  c.fill()
  c.stroke()
  txt("SUBMIT", bx, by + 0.5, pressed ? "#0A1520" : BRIGHT, 1, fs, "center", 700)
  txt("YOU PRESS IT", bx, by + bh / 2 + 14, LABEL, 1, fs - 1, "center")

  const cur = ez(seg(u, 0.04, 0.24))
  const cx = bx + 60 - 52 * cur
  const cy = by + 40 - 30 * cur
  if (u < 0.4) {
    c.globalAlpha = vis
    c.fillStyle = "#FFFFFF"
    c.strokeStyle = "#0A1520"
    c.lineWidth = 1
    c.beginPath()
    c.moveTo(cx, cy)
    c.lineTo(cx, cy + 15)
    c.lineTo(cx + 4, cy + 11)
    c.lineTo(cx + 7, cy + 17)
    c.lineTo(cx + 9.5, cy + 16)
    c.lineTo(cx + 6.5, cy + 10)
    c.lineTo(cx + 11, cy + 10)
    c.closePath()
    c.fill()
    c.stroke()
  }
  if (press > 0 && press < 1) {
    c.globalAlpha = (1 - press) * 0.6 * vis
    c.strokeStyle = col
    c.lineWidth = 1.4
    c.beginPath()
    c.arc(bx, by, 16 + press * 26, 0, TAU)
    c.stroke()
  }

  const fly = ez(seg(u, 0.32, 0.55))
  for (let x = bx + bw / 2 + 6; x < ex - 26; x += 6) {
    dot(x, by, 1, fly > 0 ? col : MID, fly > 0 ? 0.5 : 0.3)
  }
  if (fly > 0 && fly < 1) {
    const fx = bx + bw / 2 + (ex - 26 - bx - bw / 2) * fly
    dot(fx, by - Math.sin(fly * Math.PI) * 18, 3.6, "#FFFFFF", 1)
  }

  const arrived = u > 0.55
  const nbw = compact ? 56 : 70
  const nbh = compact ? 34 : 40
  c.globalAlpha = vis
  c.fillStyle = arrived ? "#16283A" : "#0F1D2B"
  c.strokeStyle = arrived ? col : MID
  c.lineWidth = 1.4
  rr(ex - nbw / 2, ey - nbh / 2, nbw, nbh, 8)
  c.fill()
  c.stroke()
  txt("NYPD", ex, ey - 5, arrived ? BRIGHT : LABEL, 1, fs, "center", 700)
  txt("LICENSE DIV.", ex, ey + 8, LABEL, 1, fs - 2, "center", 500)

  ;["FINGERPRINTING", "INTERVIEW"].forEach((step, k) => {
    const sp = seg(u, 0.62 + k * 0.1, 0.7 + k * 0.1)
    if (sp <= 0) return
    const sy = ey + nbh / 2 + 18 + k * 18
    const label = `NEXT · ${step}`
    const tx = ex + nbw / 2
    c.font = `600 ${fs - 1}px ${MONO}`
    const tw = c.measureText(label).width
    dot(tx - tw - 8, sy, 2.4, col, sp)
    txt(label, tx, sy, "#B4C0CA", sp, fs - 1, "right", 600)
  })
}

export const ILLUSTRATIONS = [qualify, train, assemble, review, submit]
