/**
 * REGRESSION — remote privilege escalation via signup role metadata.
 *
 * Before 20260731000500, handle_new_user copied the new profile's role from
 * client-controlled user_metadata, so anyone with the public anon key could
 * self-provision an admin by POSTing {"data":{"role":"admin"}} to /auth/v1/signup.
 *
 * The security boundary is the trigger's handling of raw_user_meta_data.role.
 * We exercise it via the admin createUser API (which populates raw_user_meta_data
 * from `user_metadata` exactly as a public signUp populates it) — same
 * attacker-controlled input to the trigger, without hammering the shared GoTrue
 * signup rate-limiter and destabilizing the other DB suites.
 */
import { afterAll, describe, expect, it } from "vitest"
import { adminClient, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
const created: string[] = []

async function mint(userMeta: Record<string, unknown>) {
  const email = `signup-probe-${Date.now()}-${Math.floor(created.length)}@carrypath.test`
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: DEMO_PASSWORD,
    email_confirm: true,
    user_metadata: userMeta,
  })
  expect(error, error?.message).toBeNull()
  created.push(data.user!.id)
  return data.user!.id
}
const roleOf = async (id: string) =>
  (await admin.from("profiles").select("role").eq("id", id).maybeSingle()).data?.role

describe.skipIf(!reachable)("signup role cannot be self-assigned", () => {
  afterAll(async () => {
    for (const id of created) await admin.auth.admin.deleteUser(id).catch(() => {})
  })

  it("role='admin' in signup metadata is ignored — the account is a client", async () => {
    expect(await roleOf(await mint({ role: "admin", full_name: "Probe" })), "metadata must never mint admin").toBe(
      "client"
    )
  })

  it("role='staff' in signup metadata is ignored too", async () => {
    expect(await roleOf(await mint({ role: "staff", full_name: "Probe" }))).toBe("client")
  })

  it("the legit service-role path DOES assign a non-client role", async () => {
    // createUser mints a 'client' (via the trigger); the service role then
    // promotes it with an explicit UPDATE — the only path permitted to change a
    // role. This mirrors registerInstructor.
    const id = await mint({ full_name: "Probe Instructor" })
    expect(await roleOf(id)).toBe("client")
    const { error } = await admin.from("profiles").update({ role: "instructor" }).eq("id", id)
    expect(error, error?.message).toBeNull()
    expect(await roleOf(id)).toBe("instructor")
  })
})
