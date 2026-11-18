import manifest from "@/public/avatars/manifest.json"

export const ANIMAL_AVATAR_KEYS = [
  "fox",
  "panda",
  "bear",
  "cat",
  "dog",
  "bunny",
  "owl",
  "penguin",
  "koala",
  "lion",
  "frog",
  "tiger",
] as const

export type AnimalAvatarKey = (typeof ANIMAL_AVATAR_KEYS)[number]

export interface AnimalAvatarOption {
  key: AnimalAvatarKey
  name: string
  bg: string
  file: string
}

const allowed = new Set<string>(ANIMAL_AVATAR_KEYS)

export const ANIMAL_AVATARS = manifest.filter(
  (item): item is AnimalAvatarOption => allowed.has(item.key)
)

export function isAnimalAvatarKey(value: string | null | undefined): value is AnimalAvatarKey {
  return Boolean(value && allowed.has(value))
}
