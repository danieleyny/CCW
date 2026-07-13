# CarryPath V2 — Master Build Prompt (Phases 1–9, autonomous)

> **How to use:** Phase 0 is already complete. Open Claude Code in the `CCW/` repo root and paste the prompt below (everything between the lines). It runs Phases 1 through 9 on its own, testing each phase before advancing. If it ever stops, reply `continue` or `resume from Phase N, same rules as before`.

---

Phase 0 is complete. Now build the rest of CarryPath V2 autonomously, Phases 1 through 9, in order, WITHOUT stopping for my approval between phases. Take your time and do it thoroughly — correctness over speed.

**SOURCE OF TRUTH (read first, treat as binding):**
- `CCW_V2_Roadmap.md` — phase order, scope, and each phase's "Done when" check
- `CCW_V2_Data_Model.md` — exact tables, enums, columns, RLS, migration filenames
- `CCW_V2_Architecture_Plan.md` — the why, flows, privacy boundaries
- `CCW_V2_ClaudeCode_Prompt.md` — full build instructions

Also re-inspect the existing code (`supabase/migrations/*`, `config/*`, `app/*`, `lib/*`) so every addition matches existing conventions.

**NON-NEGOTIABLE CONSTRAINTS (apply to every phase):**
- Additive only: never drop, rename, or break an existing table, route, or component.
- Every new table gets RLS. Add helpers `is_instructor()` and `instructor_engaged(case_id)`.
- Disclosures are NEVER visible to instructors. The instructor offer feed must be a redacted security-barrier view (`instructor_offer_feed`) exposing no client PII before acceptance; acceptance goes through a security-definer RPC `accept_offer(offer_id)`. Write cross-actor access to `activity_log`.
- $0 recurring cost: Resend free tier, native `.ics` invites (no Calendly/Cal.com), PostGIS + cached geocoding (no paid geo API), Vercel daily cron (use Supabase `pg_cron` Edge Function if sub-daily reminders are needed — do NOT assume a Vercel Pro upgrade). Keep Twilio SMS off behind its flag. Stripe stays behind its existing flag.
- Keep v1 working: bind new uploads to `case_requirements` while leaving the existing `checklist_item_id` link intact; deprecate the static checklist only after `case_requirements` drives the UI.

**PER-PHASE WORKFLOW (do this for EACH phase 1→9):**
1. Announce the phase and what you'll change.
2. Write the migration(s) with the exact filenames/DDL from `CCW_V2_Data_Model.md`; add RLS in the same or the dedicated RLS migration.
3. Run `pnpm db:reset` to apply migrations, then `pnpm db:types` to regenerate types.
4. Write `lib/*` logic and server actions first, then the UI.
5. Add/extend seed data so the phase is demoable (`pnpm seed`).
6. TEST IT before moving on:
   - `pnpm build` and `pnpm lint` must pass clean (fix all errors/warnings).
   - Write and run a quick verification (script or test) proving the phase's "Done when" acceptance check from `CCW_V2_Roadmap.md` actually holds — including the RLS/privacy boundaries where relevant.
   - If anything fails, fix it and re-test until green. Do not advance on a failing phase.
7. Print a short PASS summary for the phase (what was built, what you verified), then immediately continue to the next phase.

**CRITICAL TEST GATES you must explicitly verify:**
- **Phase 2:** an applicant with one cohabitant + one dismissed arrest auto-generates a cohabitant affidavit requirement and an ARR-01 (Certificate of Disposition + narrative); submission is BLOCKED until the narrative is written; a bad filename is auto-sanitized.
- **Phase 4:** a client offer is shown to verified in-radius instructors as a REDACTED card (no PII); on accept, an engagement grants scoped case access with NO disclosure access; a non-matching or unverified instructor sees nothing.
- **Phase 5:** a confirmed booking emails both parties a valid `.ics` to the correct training location, increments `booked_count`, and refuses to overbook.
- **Phase 7:** the daily cron sends each reminder exactly once (`reminder_log` uniqueness); re-running it sends nothing new.
- **Phase 9:** full RLS test matrix (client/instructor/staff/admin × every new table) passes, and the end-to-end happy path runs on seed data: intake → match → accept → book → train → reference outreach → assemble → reminders.

When all nine phases pass, stop and give me a final report: every phase's PASS summary, the migrations added, any deviations from the spec and why, and anything that still needs my input (e.g., live API keys, the NYPD "verify-live" registry check).

---

### If the build stops partway

Large build — it may hit context/time limits. To resume, reply:

```
resume from Phase N, same rules as before
```
