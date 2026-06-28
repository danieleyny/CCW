/**
 * Seed the local Supabase database with demo data:
 *   - auth users: admin, staff, and two clients (all password "Passw0rd!")
 *   - two instructors
 *   - six demo clients/cases spread across the 13 stages, each with templated
 *     checklist items, plus stage-appropriate documents, references,
 *     cohabitants, training, payments, appointments, messages, tasks, and
 *     activity-log entries.
 *
 * Run with:  pnpm seed   (uses the service-role key; bypasses RLS)
 * Safe to re-run — it clears demo rows and recreates the demo auth users.
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { CASE_STAGES, stageIndex, type CaseStageKey } from "../config/stages"
import { CHECKLIST_TEMPLATE } from "../config/checklist-templates"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import type { IntakeAnswers } from "../lib/requirements/generate"
import type { Database } from "../lib/supabase/types"
import { BOROUGH_CENTROIDS } from "../lib/geo/nyc"
import { createAndMatchOffer } from "../lib/marketplace/offers"

loadEnv({ path: ".env.local" })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY")
  process.exit(1)
}

const db: SupabaseClient = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})
// Typed handle for the requirements helpers (which expect SupabaseClient<Database>).
const tdb = db as unknown as SupabaseClient<Database>

const PASSWORD = "Passw0rd!"
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64"
)

// ── small helpers ────────────────────────────────────────────────────────────
function daysFromNow(n: number): string {
  return new Date(Date.now() + n * 86400000).toISOString()
}
function dateOnly(n: number): string {
  return daysFromNow(n).slice(0, 10)
}
async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>, label: string): Promise<T> {
  const { data, error } = await p
  if (error) {
    console.error(`✗ ${label}:`, error)
    throw error
  }
  return data as T
}

// ── reset ────────────────────────────────────────────────────────────────────
async function reset() {
  console.log("• clearing existing demo data…")
  // Deleting clients cascades to cases → checklist/docs/refs/etc.
  await db.from("activity_log").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("tasks").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("clients").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  await db.from("instructors").delete().neq("id", "00000000-0000-0000-0000-000000000000")

  // Remove demo auth users so we can recreate them deterministically.
  const { data } = await db.auth.admin.listUsers({ perPage: 1000 })
  for (const u of data?.users ?? []) {
    if (u.email?.endsWith("@carrypath.test")) {
      await db.auth.admin.deleteUser(u.id)
    }
  }
}

async function createUser(
  email: string,
  fullName: string,
  role: "admin" | "staff" | "client" | "instructor"
): Promise<string> {
  const user = await must(
    db.auth.admin
      .createUser({
        email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: { full_name: fullName, role },
      })
      .then((r) => ({ data: r.data.user, error: r.error })),
    `create user ${email}`
  )
  // The handle_new_user trigger inserts the profile with this role.
  return user.id
}

// ── checklist ────────────────────────────────────────────────────────────────
async function seedChecklist(caseId: string, stage: CaseStageKey) {
  const here = stageIndex(stage)
  const rows = CHECKLIST_TEMPLATE.map((t) => {
    const itemStage = stageIndex(t.stageKey)
    let status: string
    if (itemStage < here) status = "approved"
    else if (itemStage === here) status = t.owner === "client" ? "submitted" : "in_progress"
    else status = "not_started"
    return {
      case_id: caseId,
      template_key: t.key,
      stage: t.stageKey,
      title: t.title,
      description: t.description ?? null,
      required: t.required,
      owner: t.owner,
      status,
      document_type: t.documentType ?? null,
    }
  })
  await must(db.from("checklist_items").insert(rows).select("id").then((r) => ({ data: r.data, error: r.error })), "checklist")
}

async function seedCaseStages(caseId: string, stage: CaseStageKey) {
  const here = stageIndex(stage)
  const rows = CASE_STAGES.map((s) => {
    const i = stageIndex(s.key)
    return {
      case_id: caseId,
      stage: s.key,
      status: i < here ? "complete" : i === here ? "in_progress" : "not_started",
      entered_at: i <= here ? daysFromNow(-(here - i) * 10 - 5) : null,
      completed_at: i < here ? daysFromNow(-(here - i) * 10) : null,
    }
  })
  await must(db.from("case_stages").insert(rows).select("id").then((r) => ({ data: r.data, error: r.error })), "case_stages")
}

// ── document upload ──────────────────────────────────────────────────────────
async function addDocument(
  caseId: string,
  clientId: string,
  type: string,
  status: "pending" | "approved" | "rejected",
  reviewer: string | null,
  upload: boolean,
  reviewNotes?: string
) {
  const doc = await must(
    db
      .from("documents")
      .insert({
        case_id: caseId,
        client_id: clientId,
        type,
        status,
        reviewer,
        review_notes: reviewNotes ?? null,
        notarized: type === "reference_letter" || type === "cohabitant_affidavit",
      })
      .select("id")
      .single()
      .then((r) => ({ data: r.data, error: r.error })),
    `document ${type}`
  )
  if (upload) {
    const filename = `${type}.png`
    const path = `clients/${clientId}/${doc.id}/${filename}`
    const { error } = await db.storage
      .from("documents")
      .upload(path, PNG_1x1, { contentType: "image/png", upsert: true })
    if (error) console.error("  upload failed:", error)
    else await db.from("documents").update({ file_path: path, file_name: filename }).eq("id", doc.id)
  }
}

// ── requirements engine (V2) ─────────────────────────────────────────────────
function jurisdictionFor(track: string): string {
  return track === "non_resident" ? "special_carry" : "nyc"
}

/**
 * Generate the case's requirement instances from the live registry, then bind
 * satisfied evidence: any approved document whose type matches a requirement's
 * document_type flips that requirement to `satisfied` (the provable audit link).
 * Sam Chen carries a demo arrest history so ARR-01 (Certificate of Disposition)
 * spawns — exercising conditional generation.
 */
async function seedRequirements(caseId: string, name: string, track: string, here: number) {
  const answers: IntakeAnswers = {
    isCarry: true,
    hasCohabitants: here >= stageIndex("document_collection"),
    hasArrestHistory: name === "Sam Chen",
    anyQuestionYes: name === "Sam Chen",
  }
  await materializeCaseRequirements(tdb, caseId, jurisdictionFor(track), answers)

  // Binding queries use the untyped `db` client to sidestep supabase-js's
  // embedded-select type parser (this script is type-checked by `next build`).
  const { data: docs } = await db
    .from("documents")
    .select("id, type")
    .eq("case_id", caseId)
    .eq("status", "approved")
  const byType = new Map<string, string>()
  for (const doc of (docs ?? []) as { id: string; type: string }[]) {
    if (!byType.has(doc.type)) byType.set(doc.type, doc.id)
  }

  const { data: crs } = await db
    .from("case_requirements")
    .select("id, status, requirement:requirements(document_type)")
    .eq("case_id", caseId)
  for (const cr of (crs ?? []) as Array<{ id: string; status: string; requirement: { document_type: string | null } | { document_type: string | null }[] | null }>) {
    const req = Array.isArray(cr.requirement) ? cr.requirement[0] : cr.requirement
    const dt = req?.document_type
    if (cr.status === "pending" && dt && byType.has(dt)) {
      await db
        .from("case_requirements")
        .update({ status: "satisfied", document_id: byType.get(dt)! })
        .eq("id", cr.id)
    }
  }
}

// ── main ─────────────────────────────────────────────────────────────────────
async function main() {
  await reset()

  console.log("• creating users…")
  const adminId = await createUser("admin@carrypath.test", "Dana Admin", "admin")
  const staffId = await createUser("staff@carrypath.test", "Sasha Staff", "staff")
  const client1Id = await createUser("client1@carrypath.test", "Jordan Rivera", "client")
  const client2Id = await createUser("client2@carrypath.test", "Sam Chen", "client")

  console.log("• instructors…")
  // Frank has a real instructor account and is verified; Lena is unverified
  // (proves unverified instructors never appear to clients).
  const frankId = await createUser("instructor@carrypath.test", "Frank DiMeo", "instructor")
  const bk = BOROUGH_CENTROIDS.brooklyn
  const mn = BOROUGH_CENTROIDS.manhattan
  const qn = BOROUGH_CENTROIDS.queens
  const [inst1, inst2] = await must(
    db
      .from("instructors")
      .insert([
        {
          name: "Frank DiMeo",
          email: "instructor@carrypath.test",
          phone: "(718) 555-0110",
          profile_id: frankId,
          dcjs_id: "DAI-10293",
          bio: "20-year range officer; NRA + DCJS certified. Patient with first-timers.",
          verified: true,
          verified_at: new Date().toISOString(),
          service_radius_mi: 25,
          lat: bk.lat,
          lng: bk.lng,
          price_18h_cents: 65000,
          jurisdictions: ["nyc"],
          rating_avg: 4.8,
          rating_count: 24,
        },
        {
          name: "Lena Ortiz",
          email: "lena@range.example",
          phone: "(347) 555-0190",
          dcjs_id: "DAI-55821",
          bio: "Competitive shooter; weekend classroom + range sessions.",
          verified: false,
          service_radius_mi: 20,
          lat: qn.lat,
          lng: qn.lng,
          price_18h_cents: 60000,
          jurisdictions: ["nyc"],
          rating_avg: null,
          rating_count: 0,
        },
      ])
      .select("id")
      .then((r) => ({ data: r.data, error: r.error })),
    "instructors"
  )

  // Frank's training venues (range + classroom)
  const locs = await must(
    db
      .from("training_locations")
      .insert([
        { instructor_id: inst1.id, label: "Gowanus Indoor Range", address: "120 9th St, Brooklyn, NY 11215", is_range: true, lat: bk.lat, lng: bk.lng },
        { instructor_id: inst1.id, label: "Midtown Classroom", address: "20 W 33rd St, New York, NY 10001", is_range: false, lat: mn.lat, lng: mn.lng },
      ])
      .select("id")
      .then((r) => ({ data: r.data, error: r.error })),
    "training_locations"
  )

  // Frank publishes some open availability (combined 18-hour course + a consult).
  await db.from("availability_slots").insert([
    { instructor_id: inst1.id, location_id: locs[0].id, type: "combined_18h", capacity: 4, starts_at: daysFromNow(7), ends_at: daysFromNow(7.25) },
    { instructor_id: inst1.id, location_id: locs[1].id, type: "classroom_16h", capacity: 6, starts_at: daysFromNow(14), ends_at: daysFromNow(14.2) },
    { instructor_id: inst1.id, location_id: locs[1].id, type: "consult", capacity: 1, starts_at: daysFromNow(3), ends_at: daysFromNow(3.05) },
  ])

  const demo: Array<{
    name: string
    email: string
    borough: string
    track: "resident" | "business" | "non_resident"
    stage: CaseStageKey
    profileId: string | null
    staff: string
  }> = [
    { name: "Alex Morgan", email: "alex.morgan@example.com", borough: "Brooklyn", track: "resident", stage: "lead", profileId: null, staff: staffId },
    { name: "Taylor Brooks", email: "taylor.brooks@example.com", borough: "Queens", track: "resident", stage: "training_scheduled", profileId: null, staff: staffId },
    { name: "Jordan Rivera", email: "client1@carrypath.test", borough: "Manhattan", track: "resident", stage: "document_collection", profileId: client1Id, staff: staffId },
    { name: "Sam Chen", email: "client2@carrypath.test", borough: "The Bronx", track: "business", stage: "under_investigation", profileId: client2Id, staff: adminId },
    { name: "Casey Nguyen", email: "casey.nguyen@example.com", borough: "Staten Island", track: "non_resident", stage: "filed", profileId: null, staff: adminId },
    { name: "Morgan Patel", email: "morgan.patel@example.com", borough: "Manhattan", track: "resident", stage: "licensed", profileId: null, staff: staffId },
  ]

  for (const d of demo) {
    console.log(`• client: ${d.name} (${d.stage})`)
    const here = stageIndex(d.stage)

    const client = await must(
      db
        .from("clients")
        .insert({
          profile_id: d.profileId,
          full_name: d.name,
          email: d.email,
          phone: "(212) 555-01" + Math.floor(10 + here).toString(),
          borough: d.borough,
          track: d.track,
          assigned_staff: d.staff,
          current_stage: d.stage,
          license_type: "Concealed Carry",
          lead_source: d.profileId ? "portal" : "eligibility_quiz",
          eligibility: { age_21_plus: true, nyc_resident: d.track !== "non_resident", disqualifiers: false },
        })
        .select("id")
        .single()
        .then((r) => ({ data: r.data, error: r.error })),
      "client"
    )

    const kase = await must(
      db
        .from("cases")
        .insert({
          client_id: client.id,
          stage: d.stage,
          status: d.name === "Taylor Brooks" ? "blocked" : "active",
          opened_at: daysFromNow(-here * 12 - 3),
          target_file_date: dateOnly(30),
          nypd_app_ref: here >= stageIndex("filed") ? "NYPD-2026-" + (1000 + here) : null,
          license_expires_on: d.stage === "licensed" ? dateOnly(1000) : null,
        })
        .select("id")
        .single()
        .then((r) => ({ data: r.data, error: r.error })),
      "case"
    )

    await seedChecklist(kase.id, d.stage)
    await seedCaseStages(kase.id, d.stage)

    // Documents (for clients at/after document collection)
    if (here >= stageIndex("document_collection")) {
      const isJordan = d.name === "Jordan Rivera"
      await addDocument(kase.id, client.id, "id", "approved", d.staff, isJordan)
      await addDocument(kase.id, client.id, "proof_residence", "approved", d.staff, false)
      await addDocument(
        kase.id,
        client.id,
        "safe_photo_closed",
        isJordan ? "pending" : "approved",
        isJordan ? null : d.staff,
        isJordan,
        isJordan ? undefined : "Whole safe visible — looks good."
      )
      await addDocument(
        kase.id,
        client.id,
        "safe_photo_open",
        isJordan ? "rejected" : "approved",
        d.staff,
        isJordan,
        isJordan ? "Please retake — the interior shelf isn't visible." : undefined
      )
    }

    // References + cohabitants (document collection onward)
    if (here >= stageIndex("document_collection")) {
      await db.from("character_references").insert([
        { case_id: kase.id, name: "Pat Rivera", relationship: "Sibling", is_family: true, contact_email: "pat@example.com", notarized: here > stageIndex("notarization"), received: true },
        { case_id: kase.id, name: "Robin Rivera", relationship: "Parent", is_family: true, contact_email: "robin@example.com", notarized: here > stageIndex("notarization"), received: true },
        { case_id: kase.id, name: "Jamie Wells", relationship: "Colleague", is_family: false, contact_email: "jamie@example.com", notarized: here > stageIndex("notarization"), received: here >= stageIndex("notarization") },
        { case_id: kase.id, name: "Chris Bell", relationship: "Friend", is_family: false, contact_email: "chris@example.com", notarized: here > stageIndex("notarization"), received: here >= stageIndex("notarization") },
      ])
      await db.from("cohabitants").insert([
        { case_id: kase.id, name: "Quinn Rivera", relationship: "Spouse", affidavit_status: here > stageIndex("notarization") ? "notarized" : "received" },
      ])
    }

    // Requirements engine: generate personalized case_requirements + bind evidence.
    await seedRequirements(kase.id, d.name, d.track, here)

    // Training
    if (d.stage === "training_scheduled") {
      await db.from("training_sessions").insert({
        case_id: kase.id, instructor_id: inst1.id, class_date: daysFromNow(7), range_date: daysFromNow(9), location: "Westside Range, NY", attended: false,
      })
    } else if (here >= stageIndex("training_complete")) {
      await db.from("training_sessions").insert({
        case_id: kase.id, instructor_id: inst2.id, class_date: daysFromNow(-here * 8), range_date: daysFromNow(-here * 8 + 2), location: "Westside Range, NY", attended: true, test_score: 92, passed: true,
      })
    }

    // Payments
    if (here >= stageIndex("signed_up_paid")) {
      await db.from("payments").insert({
        case_id: kase.id, client_id: client.id, amount_cents: 50000, type: "deposit", status: "paid", description: "Deposit — Full Concierge", paid_at: daysFromNow(-here * 11),
      })
    }
    if (here >= stageIndex("filed")) {
      await db.from("payments").insert({
        case_id: kase.id, client_id: client.id, amount_cents: 149900, type: "full", status: "paid", description: "Balance on filing", paid_at: daysFromNow(-5),
      })
    }

    // Appointments
    if (d.stage === "lead") {
      await db.from("appointments").insert({ case_id: kase.id, client_id: client.id, type: "consult", scheduled_at: daysFromNow(2), location: "Phone" })
    }
    if (d.stage === "training_scheduled") {
      await db.from("appointments").insert({ case_id: kase.id, client_id: client.id, type: "training", scheduled_at: daysFromNow(7), location: "Westside Range, NY" })
    }
    if (here >= stageIndex("filed")) {
      await db.from("appointments").insert({ case_id: kase.id, client_id: client.id, type: "fingerprinting", scheduled_at: daysFromNow(here >= stageIndex("under_investigation") ? -10 : 5), location: "One Police Plaza, Rm 110A" })
    }

    // Messages (for clients with accounts)
    if (d.profileId) {
      await db.from("messages").insert([
        { case_id: kase.id, sender_id: d.staff, body: `Hi ${d.name.split(" ")[0]}, welcome to CarryPath! Let me know if you have any questions.`, read: true, created_at: daysFromNow(-3) },
        { case_id: kase.id, sender_id: d.profileId, body: "Thanks! Just uploaded my safe photos.", read: false, created_at: daysFromNow(-1) },
      ])
    }

    // Activity log
    await db.from("activity_log").insert([
      { case_id: kase.id, client_id: client.id, actor: d.staff, action: "case.created", entity: "case", entity_id: kase.id, detail: { stage: "lead" } },
      { case_id: kase.id, client_id: client.id, actor: d.staff, action: "case.stage_advanced", entity: "case", entity_id: kase.id, detail: { to: d.stage } },
    ])
  }

  // Internal tasks for the owner's queue
  console.log("• tasks…")
  const jordan = await db.from("clients").select("id").eq("email", "client1@carrypath.test").single()
  const jordanCase = jordan.data
    ? (await db.from("cases").select("id").eq("client_id", jordan.data.id).single()).data
    : null
  await db.from("tasks").insert([
    { case_id: jordanCase?.id ?? null, title: "Review Jordan Rivera's safe photos", description: "Open-door photo was rejected; check the re-upload.", assignee: staffId, due_date: dateOnly(-1), status: "open", priority: 1 },
    { case_id: jordanCase?.id ?? null, title: "Confirm Jordan's reference notarizations", assignee: staffId, due_date: dateOnly(3), status: "open", priority: 2 },
    { case_id: null, title: "Call back Alex Morgan to book consult", assignee: adminId, due_date: dateOnly(0), status: "open", priority: 1 },
    { case_id: null, title: "Order more printer toner", assignee: adminId, due_date: dateOnly(7), status: "open", priority: 3 },
  ])

  // A live marketplace offer from Jordan (Manhattan) → matches verified Frank.
  if (jordanCase?.id) {
    console.log("• marketplace offer…")
    await createAndMatchOffer(tdb, {
      caseId: jordanCase.id,
      type: "training",
      jurisdiction: "nyc",
      borough: "Manhattan",
      needsNote: "Looking to finish my 18-hour course in the next few weeks.",
    })
  }

  console.log("\n✓ Seed complete.")
  console.log("  Logins (password: Passw0rd!):")
  console.log("    admin@carrypath.test   (admin)")
  console.log("    staff@carrypath.test   (staff)")
  console.log("    client1@carrypath.test (client — Jordan Rivera)")
  console.log("    client2@carrypath.test (client — Sam Chen)")
  console.log("    instructor@carrypath.test (instructor — Frank DiMeo, verified)")
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
