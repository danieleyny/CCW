import "server-only"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import type { Database } from "@/lib/supabase/types"

export type Profile = Database["public"]["Tables"]["profiles"]["Row"]
export type UserRole = Database["public"]["Enums"]["user_role"]

export interface AuthContext {
  userId: string
  email: string | null
  profile: Profile
}

/** Returns the signed-in user + profile, or null. Never throws. */
export async function getAuth(): Promise<AuthContext | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single()

  if (!profile) return null
  return { userId: user.id, email: user.email ?? null, profile }
}

/** Require any signed-in user; redirect to login otherwise. */
export async function requireUser(): Promise<AuthContext> {
  const auth = await getAuth()
  if (!auth) redirect("/auth/login")
  return auth
}

/** Require one of the given roles; clients are sent to their portal. */
export async function requireRole(roles: UserRole[]): Promise<AuthContext> {
  const auth = await requireUser()
  if (!roles.includes(auth.profile.role)) {
    redirect(auth.profile.role === "client" ? "/portal" : "/auth/login")
  }
  return auth
}

/** Staff or admin (the admin dashboard). */
export function requireStaff() {
  return requireRole(["staff", "admin"])
}

/** Admin only. */
export function requireAdmin() {
  return requireRole(["admin"])
}
