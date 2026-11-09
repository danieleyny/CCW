"use client"

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react"

export type ThemeKey = "v0" | "v1" | "v2" | "v3" | "v4"

const ThemeContext = createContext<ThemeKey>("v0")

export const useThemeKey = () => useContext(ThemeContext)

export default function ThemeScope({ theme, children }: { theme: ThemeKey; children: ReactNode }) {
  const scopeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (theme === "v0" || !scopeRef.current) return
    const previous = document.body.style.background
    const background = getComputedStyle(scopeRef.current).getPropertyValue("--bg").trim()
    document.body.style.background = background
    return () => { document.body.style.background = previous }
  }, [theme])

  return (
    <ThemeContext.Provider value={theme}>
      <div ref={scopeRef} data-theme={theme === "v0" ? undefined : theme} style={{ background: "var(--bg)", minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
