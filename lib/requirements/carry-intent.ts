/**
 * Route a Special Carry candidate by INTENDED USE in New York City — the only thing that
 * decides the licence category (38 RCNY §5-01). Pure, in the spirit of `resolveArmedTrack`.
 *
 * CRITICAL: the referral source is NOT a parameter here. Who introduced an applicant is
 * attribution, never a licence category — a Nassau resident whom ISS Action helps with a
 * PERSONAL application is a civilian Special Carry, not a guard. The routing must be
 * identical with or without a referral; keeping the referral out of this signature makes
 * that impossible to get wrong.
 *
 * We do NOT set `license_track` from this (there is no `special_carry` enum value — the
 * civilian Special Carry case stays `concealed_carry` + the `special_carry` jurisdiction,
 * which the portal/requirements layers already key on). The resolved intent is RECORDED
 * on the case (see case_intent_log) and drives the guardrail copy.
 */

export type CarryIntent = "personal" | "armed_assignment"

export interface CarryRoute {
  intent: CarryIntent
  /** The product this intent maps to (informational; not written to license_track). */
  product: "special_carry" | "special_carry_guard"
  /**
   * When true, the surface MUST show the guardrail: a personal Special Carry licence does
   * NOT authorise carrying while working an armed security assignment.
   */
  personalCarryWarning: boolean
  /**
   * Armed-assignment intent on a case with no employer sponsorship — it needs the Special
   * Carry Guard product (employer need + qualifying employment + NY armed-guard
   * registration/training), which we do not set up from intake. Staff must be raised.
   */
  needsGuardSetup: boolean
}

export function resolveCarryRoute(
  intent: CarryIntent | null | undefined,
  ctx: { isSponsored?: boolean } = {}
): CarryRoute | null {
  if (intent !== "personal" && intent !== "armed_assignment") return null
  return {
    intent,
    product: intent === "personal" ? "special_carry" : "special_carry_guard",
    personalCarryWarning: intent === "personal",
    needsGuardSetup: intent === "armed_assignment" && !ctx.isSponsored,
  }
}
