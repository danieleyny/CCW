/**
 * Profile-avatar security gate.
 *
 * Run after `pnpm db:reset && pnpm seed`:
 *   pnpm tsx scripts/verify-profile-avatars.ts
 *
 * Proves that clients can manage only their own private Storage folder while
 * staff can review uploaded avatars through the existing staff visibility
 * helper. Temporary probe objects are removed before exit.
 */
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"

loadEnv({ path: ".env.local" })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
let failures = 0

function check(condition: boolean, message: string) {
  console.log(`${condition ? "✓" : "✗"} ${message}`)
  if (!condition) failures++
}

async function signIn(email: string) {
  const db = createClient<Database>(url, anon, { auth: { persistSession: false } })
  const { data, error } = await db.auth.signInWithPassword({ email, password: "Passw0rd!" })
  if (error || !data.user) throw new Error(`sign-in failed for ${email}: ${error?.message ?? "no user"}`)
  return { db, userId: data.user.id }
}

async function main() {
  console.log("\n— Profile avatar RLS verification —\n")

  const owner = await signIn("client1@carrypath.test")
  const stranger = await signIn("client2@carrypath.test")
  const staff = await signIn("staff@carrypath.test")
  const name = `${owner.userId}/verify-${Date.now()}.jpg`
  const jpegProbe = new Uint8Array([0xff, 0xd8, 0xff, 0xd9])

  const { data: originalAvatar, error: originalAvatarError } = await owner.db
    .from("profiles")
    .select("avatar_kind, avatar_key, avatar_path")
    .eq("id", owner.userId)
    .single()
  if (originalAvatarError || !originalAvatar) throw new Error("could not read the owner's avatar")

  const { error: rpcError } = await owner.db.rpc("update_own_profile_avatar", {
    p_kind: "animal",
    p_key: "tiger",
    p_path: null,
  })
  const { data: rpcResult } = await owner.db
    .from("profiles")
    .select("avatar_kind, avatar_key")
    .eq("id", owner.userId)
    .single()
  check(!rpcError && rpcResult?.avatar_kind === "animal" && rpcResult.avatar_key === "tiger", "owner-scoped avatar RPC updates the signed-in profile")

  await owner.db.rpc("update_own_profile_avatar", {
    p_kind: originalAvatar.avatar_kind,
    p_key: originalAvatar.avatar_key,
    p_path: originalAvatar.avatar_path,
  })

  const { error: ownInsert } = await owner.db.storage
    .from("avatars")
    .upload(name, jpegProbe, { contentType: "image/jpeg" })
  check(!ownInsert, `owner uploads to own folder (${ownInsert?.message ?? "ok"})`)

  const { error: ownRead } = await owner.db.storage.from("avatars").download(name)
  check(!ownRead, "owner reads own private avatar")

  const { error: staffRead } = await staff.db.storage.from("avatars").download(name)
  check(!staffRead, "staff can review a client's avatar")

  const { data: strangerRead, error: strangerReadError } = await stranger.db.storage
    .from("avatars")
    .download(name)
  check(Boolean(strangerReadError) || !strangerRead, "another client cannot read the avatar")

  const { data: foreignProfile } = await owner.db
    .from("profiles")
    .select("id")
    .eq("id", stranger.userId)
  check((foreignProfile?.length ?? 0) === 0, "a client cannot read another client's profile row")

  const { data: foreignUpdate, error: foreignUpdateError } = await owner.db
    .from("profiles")
    .update({ avatar_kind: "animal", avatar_key: "fox", avatar_path: null })
    .eq("id", stranger.userId)
    .select("id")
  check(Boolean(foreignUpdateError) || (foreignUpdate?.length ?? 0) === 0, "a client cannot write another client's profile row")

  const foreignName = `${owner.userId}/foreign-${Date.now()}.jpg`
  const { error: strangerInsert } = await stranger.db.storage
    .from("avatars")
    .upload(foreignName, jpegProbe, { contentType: "image/jpeg" })
  check(Boolean(strangerInsert), "another client cannot upload into the owner's folder")

  const { error: strangerDelete } = await stranger.db.storage.from("avatars").remove([name])
  const { error: stillThere } = await owner.db.storage.from("avatars").download(name)
  check(Boolean(strangerDelete) || !stillThere, "another client cannot delete the owner's avatar")

  const { error: cleanup } = await owner.db.storage.from("avatars").remove([name])
  check(!cleanup, "owner removes own avatar")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Profile avatars\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
