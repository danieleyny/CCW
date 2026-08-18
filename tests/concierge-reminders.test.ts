/**
 * CONCIERGE Phase 7 — the two done-for-you reminder rules. Proves they fire for
 * a PAID concierge case (agreements-pending, ready-to-file), are idempotent (a
 * second run fires nothing new), and never nudge an UNPAID concierge case toward
 * a dashboard it can't reach.
 *
 * Runs after `pnpm db:reset && pnpm seed`; skips when no local Supabase answers.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { adminClient, supabaseReachable } from "./helpers/supabase"
import { runReminderEngine } from "@/lib/reminders/engine"
import { REQUIRED_AGREEMENT_KINDS, currentAgreementVersion } from "@/config/agreements"

const reachable = await supabaseReachable()
const DAY = 86400000

describe.skipIf(!reachable)("concierge reminder rules", () => {
  const admin = adminClient()
  const cleanupCases: string[] = []
  let adminProfile: string
  let paidPending = ""
  let unpaid = ""
  let assembled = ""

  const iso = (daysAgo: number) => new Date(Date.now() - daysAgo * DAY).toISOString()

  async function makeCase(opts: {
    paid: boolean
    stage: string
    openedDaysAgo: number
    completeAgreements?: boolean
  }): Promise<string> {
    const email = `ccrem_${Math.random().toString(36).slice(2)}@example.test`
    const { data: client } = await admin
      .from("clients")
      .insert({ full_name: "CC Rem", email, track: "resident", current_stage: "lead" })
      .select("id")
      .single()
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: client!.id, stage: "lead", status: "active", service_mode: "concierge" })
      .select("id")
      .single()
    cleanupCases.push(kase!.id)

    // Move to the target stage (application_assembled needs a QA sign-off — the
    // gate trigger enforces it).
    await admin
      .from("cases")
      .update({
        stage: opts.stage,
        ...(opts.stage === "application_assembled"
          ? { qa_signed_off_by: adminProfile, qa_signed_off_at: iso(opts.openedDaysAgo) }
          : {}),
      })
      .eq("id", kase!.id)
    // Backdate the clocks in a SEPARATE update so a stage-change trigger can't
    // overwrite stage_entered_at with now().
    await admin
      .from("cases")
      .update({ opened_at: iso(opts.openedDaysAgo), stage_entered_at: iso(opts.openedDaysAgo) })
      .eq("id", kase!.id)

    if (opts.paid) {
      await admin.from("payments").insert({
        case_id: kase!.id,
        client_id: client!.id,
        amount_cents: 100000,
        type: "full",
        status: "paid",
        package_key: "full_concierge",
      })
    }
    if (opts.completeAgreements) {
      await admin.from("case_agreements").insert(
        REQUIRED_AGREEMENT_KINDS.map((kind) => ({
          case_id: kase!.id,
          kind,
          version: currentAgreementVersion(kind),
          signer_name: "CC Rem",
        }))
      )
    }
    return kase!.id
  }

  beforeAll(async () => {
    const { data: a } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).single()
    adminProfile = a!.id
    paidPending = await makeCase({ paid: true, stage: "document_collection", openedDaysAgo: 4 })
    unpaid = await makeCase({ paid: false, stage: "document_collection", openedDaysAgo: 4 })
    assembled = await makeCase({
      paid: true,
      stage: "application_assembled",
      openedDaysAgo: 4,
      completeAgreements: true,
    })
  })

  afterAll(async () => {
    for (const id of cleanupCases) {
      await admin.from("reminder_log").delete().eq("case_id", id)
      await admin.from("cases").delete().eq("id", id)
    }
  })

  it("first run: agreements-pending fires for the paid case only; ready-to-file fires when assembled", async () => {
    const fired = await runReminderEngine(admin, new Date())
    const pending = fired.filter((f) => f.ruleKey === "concierge_agreements_pending")
    expect(pending.some((f) => f.caseId === paidPending), "paid + incomplete → fires").toBe(true)
    expect(pending.some((f) => f.caseId === unpaid), "unpaid → never fires").toBe(false)

    const ready = fired.filter((f) => f.ruleKey === "concierge_ready_to_file")
    expect(ready.some((f) => f.caseId === assembled), "assembled + paid → fires").toBe(true)
  })

  it("second run: neither rule re-fires (idempotent)", async () => {
    const fired = await runReminderEngine(admin, new Date())
    expect(
      fired.some((f) => f.ruleKey === "concierge_agreements_pending" && f.caseId === paidPending)
    ).toBe(false)
    expect(fired.some((f) => f.ruleKey === "concierge_ready_to_file" && f.caseId === assembled)).toBe(
      false
    )
  })
})
