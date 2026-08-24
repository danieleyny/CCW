/**
 * The integration suites that touch the shared local Postgres + GoTrue. These
 * run SERIALLY (see the "db" project in vitest.config.ts) — running them in
 * parallel saturates the connection pool and races shared seeded rows, which is
 * what made instructor-feed / instructor-escalation flaky.
 *
 * `tests/db-suites.guard.test.ts` fails if any file importing
 * `tests/helpers/supabase` is missing here, so a new DB test can't silently
 * land in the parallel "unit" project and reintroduce the flake.
 */
export const DB_TEST_FILES = [
  "tests/concierge-reminders.test.ts",
  "tests/concierge-scope.test.ts",
  "tests/concierge-unlock.test.ts",
  "tests/fees.test.ts",
  "tests/instructor-feed.test.ts",
  "tests/qa-gate.test.ts",
  "tests/requirement-actions.test.ts",
  "tests/review-targets.test.ts",
  "tests/roster.test.ts",
  "tests/stage-advance.test.ts",
  "tests/stripe-invoicing.test.ts",
  "tests/upload-enforcement.test.ts",
  "tests/rls/client-writable-evidence.test.ts",
  "tests/rls/concierge-onboarding-scope.test.ts",
  "tests/rls/instructor-escalation.test.ts",
  "tests/rls/instructor-public-directory.test.ts",
  "tests/rls/matrix.test.ts",
  "tests/rls/signup-role.test.ts",
  "tests/sponsor-intake.test.ts",
  "tests/facts.test.ts",
  "tests/carry-guard-pass3.test.ts",
  "tests/rls/sponsor-scope.test.ts",
  "tests/rls/trainer-scope.test.ts",
]
