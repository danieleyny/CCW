// Points along the glowing path in the map art, as fractions of the original image.
// Calibrate with ?heroDebug=1. Points 0, 2, 4, 6, 8, and 10 are the path stops.
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
export const STOP_LABELS = ["Qualify", "Train", "Assemble", "Review", "You submit"]
export const CITY_AREA = { cx: 0.497, cy: 0.554, rx: 0.4, ry: 0.326 }
