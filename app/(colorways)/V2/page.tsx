import type { Metadata } from "next"
import ThemeScope from "@/components/theme/ThemeScope"
import ColorwaySwitcher from "@/components/theme/ColorwaySwitcher"
import HomePage from "@/components/home/HomePage"
import { MarketingFrame } from "@/components/marketing/v2/MarketingFrame"

export const metadata: Metadata = { title: "Colorway V2 · Monochrome Navy", robots: { index: false, follow: false } }

export default function Page() { return <ThemeScope theme="v2"><MarketingFrame><HomePage /></MarketingFrame><ColorwaySwitcher active="v2" /></ThemeScope> }
