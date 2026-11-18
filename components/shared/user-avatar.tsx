"use client"

import { User } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AnimalAvatar } from "@/components/portal/avatars/animal-avatar"
import { isAnimalAvatarKey } from "@/components/portal/avatars/registry"
import { cn } from "@/lib/utils"

export type UserAvatarKind = "animal" | "upload" | null

export interface UserAvatarValue {
  kind: UserAvatarKind
  key: string | null
  path: string | null
  url: string | null
}

function avatarInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function UserAvatar({
  name,
  avatar,
  size,
  className,
  animate = false,
}: {
  name: string
  avatar: UserAvatarValue
  size?: number
  className?: string
  animate?: boolean
}) {
  const initials = avatarInitials(name)
  const animal = avatar.kind === "animal" && isAnimalAvatarKey(avatar.key) ? avatar.key : null
  const uploadUrl = avatar.kind === "upload" ? avatar.url : null

  return (
    <Avatar
      className={cn("user-avatar", animate && animal && "user-avatar-animated", className)}
      style={size ? { width: size, height: size } : undefined}
    >
      {animal ? (
        <AnimalAvatar animal={animal} />
      ) : uploadUrl ? (
        <AvatarImage src={uploadUrl} alt={`${name}'s profile photo`} />
      ) : (
        <AvatarFallback className="user-avatar-fallback">
          {initials || <User aria-hidden />}
        </AvatarFallback>
      )}
    </Avatar>
  )
}
