export default function AdminLoading() {
  return <div className="mx-auto max-w-[1480px] animate-pulse motion-reduce:animate-none" aria-label="Loading staff workspace">
    <div className="mb-5 h-11 w-72 rounded-lg bg-[#E4E7EC]" /><div className="mb-5 flex gap-2 overflow-hidden">{[1,2,3,4,5].map((n) => <div key={n} className="h-8 w-24 shrink-0 rounded-full bg-[#E4E7EC]" />)}</div>
    <div className="grid gap-6 xl:grid-cols-[1fr_320px]"><div className="space-y-4">{[1,2,3,4].map((n) => <div key={n} className="h-20 rounded-xl bg-white" />)}</div><div className="space-y-4">{[1,2,3].map((n) => <div key={n} className="h-40 rounded-xl bg-white" />)}</div></div>
  </div>
}
