import { defineConfig } from "vitest/config"
import path from "path"
import { DB_TEST_FILES } from "./tests/db-suites"

/**
 * The DB-touching integration suites all share ONE local Postgres + GoTrue.
 * Run in parallel they contend hard: concurrent sign-ins hit GoTrue rate limits,
 * the connection pool saturates (so `supabaseReachable()` flips false and whole
 * suites skip), and files that mutate the same seeded rows (the seeded
 * instructor, client1's cases) race each other — which is what made
 * instructor-feed / instructor-escalation flaky.
 *
 * Fix: two projects. Pure unit tests stay fully parallel (fast). The DB suites
 * run in ONE fork, one file at a time — no cross-file DB concurrency, so no
 * contention. The list lives in tests/db-suites.ts and is guard-tested
 * (tests/db-suites.guard.test.ts) so a new DB test can't silently miss it.
 */
const DB_TESTS = DB_TEST_FILES

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/**/*.test.ts"],
          exclude: DB_TESTS,
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "db",
          include: DB_TESTS,
          environment: "node",
          // One process, one file at a time — the shared DB is not reentrant.
          // fileParallelism:false serializes the files; maxWorkers:1 keeps them
          // in a single fork (Vitest-4 replacement for poolOptions.singleFork).
          pool: "forks",
          fileParallelism: false,
          maxWorkers: 1,
        },
      },
    ],
  },
})
