export const THEMES = {
  v1: {
    name: "Slate & Steel",
    phase: ["#4A6D8C", "#56708F", "#6A6F8F", "#7C6D88", "#8C6F78"],
    phaseDark: ["#6F93B3", "#7C96B6", "#8F93B3", "#A291AE", "#B3939D"],
    dark: "#121A24",
    darkInk: "#EEF1F4",
    aurora: ["rgba(74,109,140,.42)", "rgba(106,111,143,.38)", "rgba(140,111,120,.32)"],
    accent: "#1C2B3F",
    warm: "#8C6F78",
    warmAlpha: 0.3,
    path: ["#E8743B", "#F5A25D"],
    pathGlow: "rgba(232,116,59,.45)",
  },
  v2: {
    name: "Navy & Champagne",
    phase: ["#0F1E3A", "#1F3561", "#355089", "#5A74A6", "#8EA0C2"],
    phaseDark: ["#5A74A6", "#6F88B8", "#8EA0C2", "#AEBBD4", "#CDD6E6"],
    dark: "#0A1222",
    darkInk: "#F2F4F8",
    aurora: ["rgba(53,80,137,.48)", "rgba(90,116,166,.32)", "rgba(31,53,97,.5)"],
    accent: "#14254A",
    warm: "#F0C766",
    warmAlpha: 0.38,
    path: ["#D29A2E", "#F0C766"],
    pathGlow: "rgba(226,170,64,.45)",
    logoArcs: ["#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C"],
    gold: "#D9B25F", goldLight: "#F0D58C", goldText: "#E3BF6A",
    ice: ["#9DB4DE", "#8FAEDD", "#7E9BD0", "#A9C1E6"],
    waveRamp: ["#4E6EAE", "#89A6D6", "#E2CB8E", "#E3BF6A"],
  },
  v3: {
    name: "Evergreen & Brass",
    phase: ["#2F5D50", "#3F6E5A", "#667B57", "#957F52", "#B08D57"],
    phaseDark: ["#5E9583", "#6FA08A", "#93A57F", "#BFA678", "#D2B07A"],
    dark: "#13221D",
    darkInk: "#F3EFE6",
    aurora: ["rgba(47,93,80,.55)", "rgba(102,123,87,.4)", "rgba(176,141,87,.45)"],
    accent: "#1F3B33",
    warm: "#B08D57",
    warmAlpha: 0.3,
    path: ["#E0A33A", "#F6CF6E"],
    pathGlow: "rgba(224,163,58,.45)",
  },
  v4: {
    name: "Black & Gold",
    phase: ["#8C6A2E", "#A27B35", "#B88D3E", "#C9A050", "#D9B566"],
    phaseDark: ["#B8912F", "#C9A043", "#D6B05A", "#E2C277", "#EED59A"],
    dark: "#0A0A0A",
    darkInk: "#F6F3EC",
    aurora: ["rgba(184,145,47,.42)", "rgba(214,176,90,.28)", "rgba(140,106,46,.45)"],
    accent: "#0A0A0A",
    warm: "#D6B05A",
    warmAlpha: 0.3,
    path: ["#C8921E", "#FFD66B"],
    pathGlow: "rgba(214,160,40,.50)",
  },
} as const

export const V0_PALETTE = {
  phase: ["#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C"],
  phaseDark: ["#2FA8EE", "#5B6CFF", "#8A5BEA", "#C24FC9", "#EE5E8C"],
  extra: "#F59A4A",
  dark: "#0A1520",
  darkInk: "#F4F7F9",
  accent: "#0B1420",
  aurora: ["rgba(47,168,238,.45)", "rgba(91,108,255,.55)", "rgba(238,94,140,.42)"],
  warm: "#F59A4A",
  warmAlpha: 0.3,
} as const

export type Palette = {
  phase: readonly string[]
  phaseDark: readonly string[]
  extra: string
  dark: string
  darkInk: string
  accent: string
  aurora: readonly string[]
  warm: string
  warmAlpha: number
  /** Colorway-only route color for the illustrated map path. V0 deliberately
   * omits these so the live home page retains its original rainbow path. */
  path?: readonly [string, string]
  pathGlow?: string
  logoArcs?: readonly string[]
  gold?: string
  goldLight?: string
  goldText?: string
  ice?: readonly string[]
  waveRamp?: readonly string[]
}
