export default function InboxLoading() {
  return <div className="animate-pulse space-y-5 motion-reduce:animate-none" aria-label="Loading inbox">
    <div className="h-16 max-w-xl rounded-xl bg-black/5" />
    <div className="grid min-h-[640px] overflow-hidden rounded-2xl border border-black/10 bg-white lg:grid-cols-[320px_1fr] xl:grid-cols-[400px_1fr]">
      <div className="space-y-3 border-r border-black/10 p-4">{Array.from({ length: 7 }, (_, index) => <div key={index} className="h-20 rounded-xl bg-black/5" />)}</div>
      <div className="hidden space-y-4 p-6 lg:block"><div className="h-14 rounded-xl bg-black/5" /><div className="h-10 rounded-xl bg-black/5" /><div className="ml-auto h-20 w-3/5 rounded-2xl bg-black/5" /><div className="h-24 w-2/3 rounded-2xl bg-black/5" /></div>
    </div>
  </div>
}
