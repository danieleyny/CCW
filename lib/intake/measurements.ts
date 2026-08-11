/**
 * Pure unit conversions for the intake HeightField. The canonical stored value
 * is always integer inches (the zod-bounded `heightInches`); feet/inches and cm
 * are input affordances only. Kept here (not in the "use client" component) so
 * the math is unit-testable.
 */

/** Feet + inches → total inches. */
export function inchesFromFeetInches(feet: number, inches: number): number {
  return feet * 12 + inches
}

/** Total inches → { feet, inches } for display. */
export function ftInFromInches(total: number): { feet: number; inches: number } {
  return { feet: Math.floor(total / 12), inches: total % 12 }
}

/** Centimeters → nearest whole inch. */
export function inchesFromCm(cm: number): number {
  return Math.round(cm / 2.54)
}

/** Inches → nearest whole centimeter (for hydrating the cm input). */
export function cmFromInches(inches: number): number {
  return Math.round(inches * 2.54)
}
