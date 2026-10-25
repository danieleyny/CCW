type RGB = [number, number, number]

const LOOP: RGB[] = [[47, 168, 238], [91, 108, 255], [162, 79, 217], [238, 94, 140], [245, 154, 74], [47, 168, 238]]

const PATH: [number, RGB][] = [[0, [47, 168, 238]], [0.32, [91, 108, 255]], [0.58, [162, 79, 217]], [0.8, [238, 94, 140]], [1, [245, 154, 74]]]

export const STOP_COLORS = ["#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C", "#F59A4A"]

const mix = (a: RGB, b: RGB, u: number) =>
  `rgb(${Math.round(a[0] + (b[0] - a[0]) * u)},${Math.round(a[1] + (b[1] - a[1]) * u)},${Math.round(a[2] + (b[2] - a[2]) * u)})`

export function loopColor(f: number) {
  const g = ((f % 1) + 1) % 1
  const x = g * (LOOP.length - 1)
  const i = Math.floor(x)
  return mix(LOOP[i], LOOP[i + 1], x - i)
}

export function pathColor(f: number) {
  const g = Math.max(0, Math.min(1, f))
  for (let i = 0; i < PATH.length - 1; i++) {
    if (g <= PATH[i + 1][0]) return mix(PATH[i][1], PATH[i + 1][1], (g - PATH[i][0]) / (PATH[i + 1][0] - PATH[i][0]))
  }
  return mix(PATH[PATH.length - 1][1], PATH[PATH.length - 1][1], 0)
}

export function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
