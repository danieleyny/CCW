/**
 * Shared harness for the DB-touching vitest suites (qa-gate, RLS matrix).
 *
 * These need a running local Supabase seeded with `pnpm seed`. In CI or a fresh
 * clone nothing is listening, so `supabaseReachable()` lets each suite
 * `describe.skipIf` itself out cleanly — `pnpm test` stays green everywhere,
 * and the suites do their real work after `pnpm db:reset && pnpm seed`.
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

loadEnv({ path: ".env.local" })

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
export const DEMO_PASSWORD = "Passw0rd!"

const hasEnv = Boolean(SUPABASE_URL && SERVICE && ANON)

export function adminClient(): SupabaseClient<Database> {
  return createClient(SUPABASE_URL, SERVICE, {
    auth: { persistSession: false },
  }) as unknown as SupabaseClient<Database>
}

export async function anonClientFor(
  email: string,
  password: string = DEMO_PASSWORD
): Promise<SupabaseClient<Database>> {
  const c = createClient(SUPABASE_URL, ANON, { auth: { persistSession: false } })
  await c.auth.signInWithPassword({ email, password })
  return c as unknown as SupabaseClient<Database>
}

export function anonClient(): SupabaseClient<Database> {
  return createClient(SUPABASE_URL, ANON, {
    auth: { persistSession: false },
  }) as unknown as SupabaseClient<Database>
}

/** True only when a local Supabase actually answers. */
export async function supabaseReachable(): Promise<boolean> {
  if (!hasEnv) return false
  try {
    const { error } = await adminClient().from("jurisdiction_profiles").select("key").limit(1)
    return !error
  } catch {
    return false
  }
}

/** A minimal but structurally-valid PNG whose IHDR encodes the given size —
 *  enough for the header-only server-side dimension reader used by the gate. */
export function pngWithDimensions(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(33)
  buf.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0) // signature
  buf.set([0x00, 0x00, 0x00, 0x0d], 8) // IHDR length = 13
  buf.set([0x49, 0x48, 0x44, 0x52], 12) // "IHDR"
  writeBe32(buf, 16, width)
  writeBe32(buf, 20, height)
  buf[24] = 8 // bit depth
  buf[25] = 6 // color type RGBA
  return buf
}

function writeBe32(b: Uint8Array, i: number, v: number) {
  b[i] = (v >>> 24) & 0xff
  b[i + 1] = (v >>> 16) & 0xff
  b[i + 2] = (v >>> 8) & 0xff
  b[i + 3] = v & 0xff
}
