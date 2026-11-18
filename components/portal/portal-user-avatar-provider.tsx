"use client"

import { createContext, useContext, useMemo, useState } from "react"
import type { UserAvatarValue } from "@/components/shared/user-avatar"

interface PortalUserAvatarContextValue {
  userId: string
  fullName: string
  avatar: UserAvatarValue
  setAvatar: (avatar: UserAvatarValue) => void
}

const PortalUserAvatarContext = createContext<PortalUserAvatarContextValue | null>(null)

export function PortalUserAvatarProvider({
  userId,
  fullName,
  initialAvatar,
  children,
}: {
  userId: string
  fullName: string
  initialAvatar: UserAvatarValue
  children: React.ReactNode
}) {
  const [avatar, setAvatar] = useState(initialAvatar)

  const value = useMemo(
    () => ({ userId, fullName, avatar, setAvatar }),
    [userId, fullName, avatar]
  )

  return <PortalUserAvatarContext value={value}>{children}</PortalUserAvatarContext>
}

export function usePortalUserAvatar() {
  return useContext(PortalUserAvatarContext)
}
