import { readFile } from "node:fs/promises"
import path from "node:path"
import Link from "next/link"
import { Database } from "lucide-react"
import { requireStaff } from "@/lib/auth"

export const metadata = { title: { absolute: "What we hold · Staff" } }

function InventoryDocument({ source }: { source: string }) {
  return <article className="space-y-3 text-sm leading-7 text-[#344054]">
    {source.split("\n").map((line, index) => {
      if (line.startsWith("### ")) return <h3 key={index} className="pt-5 text-lg font-semibold text-[#101828]">{line.slice(4)}</h3>
      if (line.startsWith("## ")) return <h2 key={index} className="pt-7 font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">{line.slice(3)}</h2>
      if (line.startsWith("# ")) return <h1 key={index} className="font-[family-name:var(--font-title)] text-3xl font-semibold text-[#101828]">{line.slice(2)}</h1>
      if (line.startsWith("- ")) return <p key={index} className="pl-4 before:mr-2 before:content-['•']">{line.slice(2)}</p>
      if (!line.trim()) return <div key={index} className="h-1" />
      return <p key={index} className="whitespace-pre-wrap">{line}</p>
    })}
  </article>
}

export default async function DataInventoryPage() {
  await requireStaff()
  const source = await readFile(path.join(process.cwd(), "docs", "DATA_INVENTORY.md"), "utf8")
  return <div className="mx-auto max-w-4xl pb-12"><Link href="/admin/privacy" className="inline-flex text-sm font-semibold text-[#14254A] underline underline-offset-4">Back to Privacy</Link><section className="mt-5 rounded-2xl border border-black/[.08] bg-white p-5 shadow-sm sm:p-8"><div className="mb-6 flex items-center gap-3 border-b border-black/[.08] pb-5"><span className="grid size-10 place-items-center rounded-xl bg-[#E9EDF5] text-[#14254A]"><Database className="size-5" aria-hidden /></span><div><p className="font-mono text-[10px] uppercase tracking-[.14em] text-[#667085]">Read-only staff reference</p><p className="text-sm text-[#475467]">Rendered from docs/DATA_INVENTORY.md</p></div></div><InventoryDocument source={source} /></section></div>
}
