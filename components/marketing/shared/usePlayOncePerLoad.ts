"use client"

import { useEffect, useState } from "react"

// Module scope resets on a full refresh/new tab but survives client navigation.
const played = new Set<string>()

/** True only for the first mount of this key during a browser page load. */
export function usePlayOncePerLoad(key: string, enabled = true): boolean {
  const [play] = useState(() => enabled && !played.has(key))

  useEffect(() => {
    if (enabled) played.add(key)
  }, [enabled, key])

  return play
}
