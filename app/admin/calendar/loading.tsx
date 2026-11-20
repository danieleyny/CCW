export default function CalendarLoading() {
  return (
    <div className="mx-auto max-w-[1680px] animate-pulse space-y-5" aria-label="Loading calendar">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div><div className="h-10 w-44 rounded bg-black/10" /><div className="mt-3 h-4 w-[min(620px,80vw)] rounded bg-black/[.07]" /></div>
        <div className="flex gap-2"><div className="h-9 w-40 rounded-lg bg-black/[.07]" /><div className="h-9 w-28 rounded-lg bg-black/[.07]" /></div>
      </div>
      <div className="h-28 rounded-xl border border-[#D9B25F]/25 bg-[#FBF4E4]/50" />
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
        {Array.from({ length: 7 }, (_, index) => <div key={index} className="grid min-h-[84px] grid-cols-[86px_6px_1fr_150px] items-center gap-3 border-b border-black/[.07] px-4"><div className="h-6 rounded bg-black/[.07]" /><div className="h-12 rounded-full bg-black/[.07]" /><div><div className="h-4 w-40 rounded bg-black/10" /><div className="mt-2 h-3 w-64 rounded bg-black/[.06]" /></div><div className="h-9 rounded bg-black/[.07]" /></div>)}
      </div>
    </div>
  )
}
