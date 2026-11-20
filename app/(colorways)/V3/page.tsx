import type { Metadata } from "next"
import ThemeScope from "@/components/theme/ThemeScope"
import ColorwaySwitcher from "@/components/theme/ColorwaySwitcher"
import HomePage from "@/components/home/HomePage"
import { MarketingFrame } from "@/components/marketing/v2/MarketingFrame"

export const metadata: Metadata = { title: "Colorway V3 · Evergreen & Brass", robots: { index: false, follow: false } }

export default function Page() { return <ThemeScope theme="v3"><MarketingFrame><HomePage /></MarketingFrame><ColorwaySwitcher active="v3" /></ThemeScope> }
