/**
 * CONCIERGE Phase 9 — on-behalf attribution. A staff action on a CONCIERGE case
 * is work done on the applicant's behalf, so the activity detail gets
 * `on_behalf: true`; on a self-guided (or unset) case it does not. Pure test with
 * a stub client — no DB required.
 */
import { describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isConciergeCase, withOnBehalf } from "@/lib/concierge/on-behalf"

/** Minimal stub: cases.select(service_mode).eq(id).maybeSingle() → the given mode. */
function stubDb(mode: string | null): SupabaseClient<Database> {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: mode === null ? null : { service_mode: mode } }),
        }),
      }),
    }),
  } as unknown as SupabaseClient<Database>
}

describe("on-behalf attribution", () => {
  it("isConciergeCase reflects the case's service_mode", async () => {
    expect(await isConciergeCase(stubDb("concierge"), "c1")).toBe(true)
    expect(await isConciergeCase(stubDb("self_guided"), "c2")).toBe(false)
    expect(await isConciergeCase(stubDb(null), "c3")).toBe(false)
  })

  it("stamps on_behalf only on concierge cases", async () => {
    expect(await withOnBehalf(stubDb("concierge"), "c1", { status: "satisfied" })).toEqual({
      status: "satisfied",
      on_behalf: true,
    })
    expect(await withOnBehalf(stubDb("self_guided"), "c2", { status: "satisfied" })).toEqual({
      status: "satisfied",
    })
    expect(await withOnBehalf(stubDb(null), "c3", { to: "filed" })).toEqual({ to: "filed" })
  })
})
