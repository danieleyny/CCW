"use client"

import { useMemo } from "react"
import { useThemeKey } from "./ThemeScope"
import { THEMES, V0_PALETTE, type Palette } from "./themes"

export function usePalette(): Palette {
  const key = useThemeKey()
  return useMemo(() => {
    if (key === "v0") return V0_PALETTE
    const theme = THEMES[key]
    // Canvas loops key their lifetime to this object. Keep it stable between
    // stage-state renders so a label update cannot restart an animation at 0.
    return { ...V0_PALETTE, ...theme, extra: theme.phase[4] }
  }, [key])
}
