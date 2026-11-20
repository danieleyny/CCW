import type { Metadata } from "next"
import ThemeScope from "@/components/theme/ThemeScope"
import ColorwaySwitcher from "@/components/theme/ColorwaySwitcher"
import HomePage from "@/components/home/HomePage"
import { MarketingFrame } from "@/components/marketing/v2/MarketingFrame"

export const metadata: Metadata = { title: "Colorway V4 · Black & Gold", robots: { index: false, follow: false } }

export default function Page() { return <ThemeScope theme="v4"><MarketingFrame><HomePage /></MarketingFrame><ColorwaySwitcher active="v4" /></ThemeScope> }
