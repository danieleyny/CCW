// The original route remains the source of truth for the live home page and
// V1/V3/V4. V2 intentionally has a separately calibrated path so its gold
// route follows the road in the same map art without changing any other theme.
export const MAP_PATH: [number, number][] = [
  [0.1395, 0.7597],
  [0.2279, 0.7046],
  [0.3294, 0.6087],
  [0.4144, 0.5433],
  [0.4924, 0.4936],
  [0.5387, 0.4438],
  [0.5867, 0.3932],
  [0.6561, 0.3564],
  [0.73, 0.3435],
  [0.7666, 0.2937],
  [0.797, 0.2541],
]

export const STOP_POINTS = [0, 2, 4, 6, 8, 10]

// These are measured directly on hero-nyc-guided-path-v2.png. If that image
// changes, re-measure every coordinate against the replacement asset.
export const HERO_ASSET = { w: 1448, h: 1086 } as const
export const V2_WAYPOINTS: [number, number][] = [
  [205,822],[232,792],[263,747],[312,710],[375,698],[430,687],
  [475,675],[521,651],[568,616],[619,588],[670,577],
  [722,571],[753,549],[782,507],[808,478],[835,449],
  [888,426],[949,411],[1004,397],[1048,386],[1086,367],
  [1122,325],[1147,296],[1165,275],
]
export const V2_STATIONS = [0, 6, 11, 15, 19, 23]
export const V2_MAP_PATH: [number, number][] = V2_WAYPOINTS.map(([x, y]) => [x / HERO_ASSET.w, y / HERO_ASSET.h] as [number, number])
export const V2_STOP_POINTS = V2_STATIONS
export const STOP_LABELS = ["Qualify", "Train", "Assemble", "Review", "You submit"]
export const CITY_AREA = { cx: 0.497, cy: 0.554, rx: 0.4, ry: 0.326 }

/** Case-folder anchors as fractions of the image. Calibrate with ?heroDebug=1. */
export const FOLDER = {
  glow: [0.8, 0.175] as [number, number],
  liftBox: { x: 0.731, y: 0.02, w: 0.138, h: 0.234 },
  chip: [0.865, 0.235] as [number, number],
}
