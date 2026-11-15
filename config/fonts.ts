import { Azeret_Mono, Bodoni_Moda, Hanken_Grotesk } from "next/font/google"

/**
 * One type system for the public redesign and authenticated product.
 *
 * Bodoni supplies the editorial, concierge-office voice at display sizes;
 * Hanken stays calm and highly readable through dense product UI; Azeret is
 * reserved for short operational labels and status metadata. Defining these
 * once prevents each route group from downloading its own copy of the fonts.
 */
export const brandDisplayFont = Bodoni_Moda({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
})

export const brandSansFont = Hanken_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
})

export const brandMonoFont = Azeret_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
})
